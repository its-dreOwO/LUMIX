import { useCallback, useRef, useEffect } from 'react';
import { useNexusStore } from '@/state/nexusStore';
import { llmProvider, openRouterProvider } from '@/ai';
import { insertMessage } from '@/storage/ChatRepository';

// ─── Tool tags the model can emit ────────────────────────────────────────────
// Each tag name maps to a handler that receives the raw inner payload string
// and returns a result string to inject back into the model context.
const TOOL_TAGS = ['SEARCH', 'REMINDER', 'CALENDAR', 'NOTE', 'MEMORY'] as const;
type ToolTag = typeof TOOL_TAGS[number];

const TOOL_STATUS_LABELS: Record<ToolTag, string> = {
  SEARCH: '*Searching the web...*',
  REMINDER: '*Setting reminder...*',
  CALENDAR: '*Accessing calendar...*',
  NOTE: '*Saving note...*',
  MEMORY: '*Updating memory banks...*',
};

function detectActiveTool(buffer: string): ToolTag | null {
  for (const tag of TOOL_TAGS) {
    if (buffer.includes(`<${tag}>`)) return tag;
  }
  return null;
}

async function dispatchTool(tag: ToolTag, payload: string): Promise<string> {
  switch (tag) {
    case 'SEARCH': {
      const { performWebSearch } = await import('@/services/SearchService');
      return performWebSearch(payload.trim());
    }
    case 'REMINDER': {
      const { scheduleReminder } = await import('@/services/ReminderService');
      try {
        const { title, body, datetime } = JSON.parse(payload);
        return scheduleReminder(title ?? 'Reminder', body ?? '', datetime);
      } catch {
        return 'Reminder failed: Invalid JSON payload from model.';
      }
    }
    case 'CALENDAR': {
      const { createCalendarEvent, listUpcomingEvents } = await import('@/services/CalendarService');
      try {
        const data = JSON.parse(payload);
        if (data.action === 'list') return listUpcomingEvents(data.days ?? 7);
        return createCalendarEvent(data.title, data.start, data.end, data.notes);
      } catch {
        return 'Calendar failed: Invalid JSON payload from model.';
      }
    }
    case 'NOTE': {
      const { createNote, listNotes } = await import('@/services/NotesService');
      try {
        const data = JSON.parse(payload);
        if (data.action === 'list') return listNotes();
        return createNote(data.title ?? 'Note', data.body ?? '');
      } catch {
        return 'Note failed: Invalid JSON payload from model.';
      }
    }
    case 'MEMORY': {
      const { saveFactToMemory } = await import('@/services/MemoryService');
      try {
        const data = JSON.parse(payload);
        if (data.action === 'save') return saveFactToMemory(data.fact);
        return 'Memory failed: Unknown action.';
      } catch {
        return 'Memory failed: Invalid JSON payload from model.';
      }
    }
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useChatSession() {
  const {
    messages,
    orbActive,
    inputText,
    sessionId,
    lumenMode,
    addMessage,
    updateLastAiMessage,
    setOrbActive,
    setInputText,
  } = useNexusStore();

  const streamingRef = useRef(false);

  useEffect(() => {
    if (lumenMode) {
      llmProvider.unload?.();
    }
  }, [lumenMode]);

  const sendMessage = useCallback(
    async (onParticlePulse?: (x: number, y: number) => void) => {
      const text = inputText.trim();
      if (!text || streamingRef.current) return;

      // Clear input and add user message
      setInputText('');
      const userMsg = {
        id: Date.now().toString(),
        role: 'user' as const,
        content: text,
        streaming: false,
      };
      addMessage(userMsg);

      // Trigger pulse from bottom-center where input dock is
      onParticlePulse?.(200, 700);

      // Persist user message
      await insertMessage(sessionId, 'user', text).catch(() => null);

      // Add empty AI message placeholder
      const aiMsg = {
        id: (Date.now() + 1).toString(),
        role: 'ai' as const,
        content: '',
        streaming: true,
      };
      addMessage(aiMsg);
      setOrbActive(true);
      streamingRef.current = true;

      try {
        let isComplete = false;
        let passCount = 0;
        let injectedToolContext = '';
        let finalUiText = '';

        // Fetch memory pool facts to inject into the system context
        console.log('[DEBUG] useChatSession: lumenMode is', lumenMode);
        const { fetchMemoriesForContext } = await import('@/services/MemoryService');
        const memoryLimit = lumenMode ? 150 : 25; // Scale limit based on context window
        console.log('[DEBUG] useChatSession: fetching memories with limit', memoryLimit);
        const memoryText = await fetchMemoriesForContext(memoryLimit);
        console.log('[DEBUG] useChatSession: fetched memory text length', memoryText.length);
        
        // Import the base persona to append the dynamic memories
        const { NEXUS_SYSTEM_PROMPT } = await import('@/ai/persona');
        const systemPrompt = memoryText 
          ? `${NEXUS_SYSTEM_PROMPT}\n${memoryText}` 
          : NEXUS_SYSTEM_PROMPT;

        while (!isComplete && passCount < 4) {
          passCount++;

          // Build context array from history
          const currentMessages = useNexusStore.getState().messages;
          const promptContext = currentMessages
            .filter((m) => m.id !== aiMsg.id)
            .map((m) => ({ role: m.role, content: m.content }));

          if (injectedToolContext) {
            promptContext.push({ role: 'user', content: injectedToolContext });
          }

          const provider = lumenMode ? openRouterProvider : llmProvider;
          console.log('[DEBUG] useChatSession: calling provider.generate with', provider.constructor.name);
          const stream = provider.generate(promptContext, {
            maxTokens: 1024,
            temperature: 0.7,
            systemPrompt: systemPrompt,
          });

          let streamBuffer = '';
          let activeTool: ToolTag | null = null;

          for await (const token of stream) {
            streamBuffer += token;

            // Detect tool tag start (only once per pass)
            if (!activeTool) {
              const detected = detectActiveTool(streamBuffer);
              if (detected) {
                activeTool = detected;
                updateLastAiMessage(TOOL_STATUS_LABELS[detected], false);
              }
            }

            if (!activeTool) {
              // Normal streaming — show text to user
              const cleanBuffer = streamBuffer.replace(/<end_of_turn>/g, '');
              updateLastAiMessage(cleanBuffer, false);
            }
            // If tool detected, drain the stream silently until native is done
          }

          const finalCleanBuffer = streamBuffer.replace(/<end_of_turn>/g, '').trim();

          // Check if the completed buffer contains a tool invocation
          const toolInBuffer = activeTool ?? detectActiveTool(streamBuffer);
          if (toolInBuffer) {
            const tagRegex = new RegExp(`<${toolInBuffer}>([\\s\\S]*?)<\\/${toolInBuffer}>`);
            const match = streamBuffer.match(tagRegex);
            if (match?.[1]) {
              const result = await dispatchTool(toolInBuffer, match[1]);
              injectedToolContext += `\n[Tool: ${toolInBuffer}] Result:\n${result}\n\n[System]: Use the above result to answer Dre naturally. Do not mention tool use.`;
              // Continue to Pass N+1 with the result injected
            } else {
              // Malformed tag — fall through
              updateLastAiMessage(finalCleanBuffer, true);
              finalUiText = finalCleanBuffer;
              isComplete = true;
            }
          } else {
            // Stream naturally finished — no more tool calls
            updateLastAiMessage(finalCleanBuffer, true);
            finalUiText = finalCleanBuffer;
            isComplete = true;
          }
        }

        if (finalUiText) {
          await insertMessage(sessionId, 'ai', finalUiText).catch(() => null);
        }
      } catch (err: any) {
        console.error('Generation Error:', err);
        const errorMessage = err?.message || 'Something went wrong.';
        updateLastAiMessage(`[Error] ${errorMessage}`, true);
      } finally {
        streamingRef.current = false;
        setOrbActive(false);
      }
    },
    [inputText, sessionId, addMessage, updateLastAiMessage, setOrbActive, setInputText]
  );

  return {
    messages,
    orbActive,
    inputText,
    setInputText,
    sendMessage,
  };
}

