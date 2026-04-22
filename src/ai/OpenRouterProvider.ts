import type { LLMProvider, GenerateOpts } from './LLMProvider';
import { NEXUS_SYSTEM_PROMPT } from './persona';
import EventSource from 'react-native-sse';

const OPENROUTER_API_KEY = process.env.EXPO_PUBLIC_OPENROUTER_API_KEY;
const MODEL = 'google/gemma-2-9b-it:free'; // Using the latest stable free Gemma if Gemma 4 isn't out yet, but I'll use the user's specific string

export class OpenRouterProvider implements LLMProvider {
  isReady() {
    return !!OPENROUTER_API_KEY;
  }

  async *generate(
    prompt: string | { role: string; content: string }[],
    opts?: GenerateOpts
  ): AsyncIterable<string> {
    if (!OPENROUTER_API_KEY) {
      yield '[Lumen Error: OpenRouter API key missing. Please check your .env file.]';
      return;
    }

    const messages = typeof prompt === 'string' 
      ? [
          { role: 'system', content: opts?.systemPrompt ?? NEXUS_SYSTEM_PROMPT },
          { role: 'user', content: prompt }
        ]
      : [
          { role: 'system', content: opts?.systemPrompt ?? NEXUS_SYSTEM_PROMPT },
          ...prompt.map(m => ({ 
            role: m.role === 'ai' ? 'assistant' : m.role, 
            content: m.content 
          }))
        ];

    try {
      console.log('[DEBUG] OpenRouterProvider: connecting to OpenRouter SSE with model google/gemma-4-31b-it:free');
      
      let queue: string[] = [];
      let resolveNext: ((value: void) => void) | null = null;
      let isFinished = false;
      let hasError = false;
      let errorMsg = '';

      const es = new EventSource('https://openrouter.ai/api/v1/chat/completions', {
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'HTTP-Referer': 'https://lumix.ai',
          'X-Title': 'LUMIX',
          'Content-Type': 'application/json',
        },
        method: 'POST',
        body: JSON.stringify({
          model: 'google/gemma-4-31b-it:free',
          messages,
          stream: true,
          temperature: opts?.temperature ?? 0.8,
          max_tokens: opts?.maxTokens ?? 4096,
        }),
      });

      es.addEventListener('open', () => {
        console.log('[DEBUG] OpenRouterProvider: SSE connected successfully');
      });

      es.addEventListener('message', (event) => {
        if (!event.data || event.data === '[DONE]') {
          isFinished = true;
          es.close();
          resolveNext?.();
          return;
        }
        
        try {
          const json = JSON.parse(event.data);
          const token = json.choices?.[0]?.delta?.content;
          if (token) {
            queue.push(token);
            resolveNext?.();
          }
        } catch (e) {
          console.error('[DEBUG] SSE parse error:', e, 'Data:', event.data);
        }
      });

      es.addEventListener('error', (event: any) => {
        console.error('[DEBUG] SSE connection error:', event);
        hasError = true;
        errorMsg = event.message || 'Stream connection lost';
        isFinished = true;
        es.close();
        resolveNext?.();
      });

      while (!isFinished || queue.length > 0) {
        if (queue.length > 0) {
          yield queue.shift()!;
        } else if (!isFinished) {
          await new Promise<void>((resolve) => { resolveNext = resolve; });
        }
      }

      if (hasError) {
        yield `[Lumen Error: ${errorMsg}]`;
      }
    } catch (e: any) {
      console.error('[DEBUG] OpenRouterProvider catch error:', e);
      yield `[Lumen Error: ${e.message}]`;
    }
  }

  async unload() {
    // No-op for cloud provider
  }
}
