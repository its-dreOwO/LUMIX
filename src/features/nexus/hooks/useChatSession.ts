import { useCallback, useRef, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import { useNexusStore } from '@/state/nexusStore';
import { llmProvider, openRouterProvider, loadModel, markModelReady } from '@/ai';
import { useLLMStore } from '@/state/llmStore';
import { insertMessage } from '@/storage/ChatRepository';

const MODEL_PATH_KEY = 'lumix_model_path';

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
  console.log(`[Tool] ${tag} →`, payload);
  let result: string;
  switch (tag) {
    case 'SEARCH': {
      const { performWebSearch } = await import('@/services/SearchService');
      result = await performWebSearch(payload.trim());
      break;
    }
    case 'REMINDER': {
      const { scheduleReminder } = await import('@/services/ReminderService');
      try {
        const { title, body, datetime } = JSON.parse(payload);
        result = await scheduleReminder(title ?? 'Reminder', body ?? '', datetime);
      } catch {
        result = 'Reminder failed: Invalid JSON payload from model.';
      }
      break;
    }
    case 'CALENDAR': {
      const { createCalendarEvent, listUpcomingEvents } = await import('@/services/CalendarService');
      try {
        const data = JSON.parse(payload);
        result = data.action === 'list'
          ? await listUpcomingEvents(data.days ?? 7)
          : await createCalendarEvent(data.title, data.start, data.end, data.notes);
      } catch {
        result = 'Calendar failed: Invalid JSON payload from model.';
      }
      break;
    }
    case 'NOTE': {
      const { createNote, listNotes } = await import('@/services/NotesService');
      try {
        const data = JSON.parse(payload);
        result = data.action === 'list'
          ? await listNotes()
          : await createNote(data.title ?? 'Note', data.body ?? '');
      } catch {
        result = 'Note failed: Invalid JSON payload from model.';
      }
      break;
    }
    case 'MEMORY': {
      const { saveFactToMemory } = await import('@/services/MemoryService');
      try {
        const data = JSON.parse(payload);
        result = data.action === 'save'
          ? await saveFactToMemory(data.fact)
          : 'Memory failed: Unknown action.';
      } catch {
        result = 'Memory failed: Invalid JSON payload from model.';
      }
      break;
    }
  }
  console.log(`[Tool] ${tag} ←`, result!);
  return result!;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useChatSession() {
  const {
    messages,
    orbActive,
    inputText,
    sessionId,
    lumenMode,
    debugMode,
    addMessage,
    updateLastAiMessage,
    setOrbActive,
    setInputText,
  } = useNexusStore();

  const streamingRef = useRef(false);
  const cancelRef = useRef(false);

  useEffect(() => {
    const llmStore = useLLMStore.getState();
    if (lumenMode) {
      llmProvider.unload?.();
      llmStore.setStatus('ready');
      llmStore.setModelName('Gemini 2.5 Flash Lite');
    } else {
      (async () => {
        const stored = await SecureStore.getItemAsync(MODEL_PATH_KEY);
        if (!stored) return;
        const path = stored.startsWith('file://') ? stored.slice(7) : stored;
        const modelName = stored.split('/').pop()?.replace(/\.(task|litertlm)$/, '') ?? 'model';
        try {
          llmStore.setStatus('loading');
          llmStore.setModelName(modelName);
          await loadModel(path);
          markModelReady();
          llmStore.setStatus('ready');
        } catch {
          llmStore.setStatus('error');
        }
      })();
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

      // Debug mode: dispatch tool directly when input is <TAG>payload</TAG>
      if (debugMode) {
        const debugMatch = text.match(/^<(SEARCH|REMINDER|CALENDAR|NOTE|MEMORY)>([\s\S]*?)<\/\1>$/);
        if (debugMatch) {
          const tag = debugMatch[1] as ToolTag;
          const payload = debugMatch[2];
          const aiMsg = { id: (Date.now() + 1).toString(), role: 'ai' as const, content: '*Running tool...*', streaming: true };
          addMessage(aiMsg);
          setOrbActive(true);
          streamingRef.current = true;
          try {
            const result = await dispatchTool(tag, payload);
            updateLastAiMessage(`[Debug · ${tag}]\n${result}`, true);
          } catch (e: any) {
            updateLastAiMessage(`[Debug · ${tag}] Error: ${e.message}`, true);
          } finally {
            streamingRef.current = false;
            setOrbActive(false);
          }
          return;
        }
      }

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
        // Accumulates shown text across passes so tool status lines and pre-tool
        // text are preserved when the next pass starts streaming.
        let uiPrefix = '';

        // Fetch memory pool facts + build full system prompt with live timestamp
        // Pass the user's message as the FTS5 query so relevant facts are prioritised
        const { fetchMemoriesForContext } = await import('@/services/MemoryService');
        const memoryLimit = lumenMode ? 150 : 25;
        const memoryText = await fetchMemoriesForContext(memoryLimit, text);
        const { buildSystemPrompt, buildDynamicContext } = await import('@/ai/persona');
        // Lumen (cloud) needs the full prompt every call; local uses only the small
        // dynamic block — the static persona is KV-cached in the persistent Conversation.
        const systemPrompt = buildSystemPrompt(memoryText || undefined);
        const dynamicContext = buildDynamicContext(memoryText || undefined);

        while (!isComplete && passCount < 4 && !cancelRef.current) {
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
          const stream = provider.generate(promptContext, {
            maxTokens: 1024,
            temperature: 0.7,
            systemPrompt,
            dynamicContext,
          });

          let streamBuffer = '';
          let activeTool: ToolTag | null = null;
          let modelNameSynced = false;

          for await (const token of stream) {
            if (cancelRef.current) break;
            if (lumenMode && !modelNameSynced) {
              const active = openRouterProvider.activeModel;
              if (active) useLLMStore.getState().setModelName(active);
              modelNameSynced = true;
            }
            streamBuffer += token;

            // Detect tool tag start (only once per pass)
            if (!activeTool) {
              const detected = detectActiveTool(streamBuffer);
              if (detected) {
                activeTool = detected;
                // Capture any text the model wrote before the tool tag
                const tagStart = streamBuffer.indexOf(`<${detected}>`);
                const preToolText = tagStart > 0
                  ? streamBuffer.slice(0, tagStart).replace(/<end_of_turn>/g, '').trim()
                  : '';
                // Show: [previous passes] + pre-tool text + newline + status placeholder
                const statusLine = TOOL_STATUS_LABELS[detected];
                updateLastAiMessage(
                  uiPrefix + (preToolText ? preToolText + '\n' : '') + statusLine,
                  false,
                );
              }
            }

            if (!activeTool) {
              // Normal streaming — show text to user, prefixed with prior pass content
              const cleanBuffer = streamBuffer.replace(/<end_of_turn>/g, '');
              updateLastAiMessage(uiPrefix + cleanBuffer, false);
            }
            // If tool detected, drain the stream silently until complete
          }

          const finalCleanBuffer = streamBuffer.replace(/<end_of_turn>/g, '').trim();

          // Check if the completed buffer contains a tool invocation
          const toolInBuffer = activeTool ?? detectActiveTool(streamBuffer);
          if (toolInBuffer) {
            const tagRegex = new RegExp(`<${toolInBuffer}>([\\s\\S]*?)<\\/${toolInBuffer}>`);
            const match = streamBuffer.match(tagRegex);
            if (match?.[1]) {
              // Build the prefix that next pass will prepend to its streamed tokens
              const tagStart = streamBuffer.indexOf(`<${toolInBuffer}>`);
              const preToolText = tagStart > 0
                ? streamBuffer.slice(0, tagStart).replace(/<end_of_turn>/g, '').trim()
                : '';
              const statusLine = TOOL_STATUS_LABELS[toolInBuffer];
              uiPrefix += (preToolText ? preToolText + '\n' : '') + statusLine + '\n';

              const result = await dispatchTool(toolInBuffer, match[1]);
              injectedToolContext += `\n[Tool: ${toolInBuffer}] Result:\n${result}\n\n[System]: Use the above result to answer Dre naturally. Do not mention tool use.`;
              // Continue to Pass N+1 with the result injected
            } else {
              // Malformed tag — fall through
              updateLastAiMessage(uiPrefix + finalCleanBuffer, true);
              finalUiText = uiPrefix + finalCleanBuffer;
              isComplete = true;
            }
          } else {
            // Stream naturally finished — no more tool calls
            updateLastAiMessage(uiPrefix + finalCleanBuffer, true);
            finalUiText = uiPrefix + finalCleanBuffer;
            isComplete = true;
          }
        }

        if (finalUiText) {
          await insertMessage(sessionId, 'ai', finalUiText).catch(() => null);
        }
      } catch (err: any) {
        if (!cancelRef.current) {
          console.error('Generation Error:', err);
          const errorMessage = err?.message || 'Something went wrong.';
          updateLastAiMessage(`[Error] ${errorMessage}`, true);
        }
      } finally {
        streamingRef.current = false;
        cancelRef.current = false;
        setOrbActive(false);
      }
    },
    [inputText, sessionId, lumenMode, debugMode, addMessage, updateLastAiMessage, setOrbActive, setInputText]
  );

  const startNewSession = useCallback(() => {
    cancelRef.current = true;
    streamingRef.current = false;
    setOrbActive(false);
    useNexusStore.getState().clearMessages();
    llmProvider.resetConversation?.();
  }, [setOrbActive]);

  return {
    messages,
    orbActive,
    inputText,
    setInputText,
    sendMessage,
    startNewSession,
  };
}

