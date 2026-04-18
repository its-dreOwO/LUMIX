import { useCallback, useRef } from 'react';
import { useNexusStore } from '@/state/nexusStore';
import { llmProvider } from '@/ai';
import { insertMessage } from '@/storage/ChatRepository';

export function useChatSession() {
  const {
    messages,
    orbActive,
    inputText,
    sessionId,
    addMessage,
    updateLastAiMessage,
    setOrbActive,
    setInputText,
  } = useNexusStore();

  const streamingRef = useRef(false);

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
        let accumulated = '';
        const stream = llmProvider.generate(text, {
          maxTokens: 256,
          temperature: 0.7,
          systemPrompt:
            'You are LUMIX, a sleek AI assistant. Respond concisely and helpfully. Keep replies under 3 sentences unless asked for detail.',
        });

        for await (const token of stream) {
          accumulated += token;
          updateLastAiMessage(accumulated, false);
          // Pulse again mid-stream to keep particles lively
          if (accumulated.length % 80 === 0) {
            onParticlePulse?.(100 + Math.random() * 200, 400 + Math.random() * 100);
          }
        }

        updateLastAiMessage(accumulated, true);
        await insertMessage(sessionId, 'ai', accumulated).catch(() => null);
      } catch (err) {
        updateLastAiMessage('Something went wrong. Try again.', true);
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
