import type { LLMProvider, GenerateOpts } from './LLMProvider';
import { NEXUS_SYSTEM_PROMPT } from './persona';
import { lumixLLMNative, lumixLLMEmitter, lumixLLMAvailable } from '../../modules/lumix-llm';

const GOOGLE_AI_KEY = process.env.EXPO_PUBLIC_GOOGLE_AI_KEY;
const OPENROUTER_API_KEY = process.env.EXPO_PUBLIC_OPENROUTER_API_KEY ?? '';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
export const OPENROUTER_MODEL = 'google/gemini-2.5-flash-lite';

// TODO: Google AI Studio OkHttp connectivity issue — generativelanguage.googleapis.com
// times out consistently from React Native on this device (HTTP/2 / carrier routing).
// Re-enable once a fix is found (proxy, different network, native module, etc.)
const ENABLE_GOOGLE_AI = false;

// Native Gemini API — tried in order, falls through on 429/503/timeout
const GOOGLE_MODELS = [
  'gemini-3.1-flash-lite-preview',
  'gemma-4-31b-it',
  'gemma-4-26b-a4b-it',
];

const FALLBACK_STATUSES = new Set([429, 503]);

function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('Timeout')), timeoutMs)
  );
  return Promise.race([fetch(url, options), timeout]);
}

// Convert OpenAI-style messages to native Gemini API format
function toGeminiBody(
  messages: { role: string; content: string }[],
  opts: { temperature: number; maxTokens: number },
) {
  const system = messages.find(m => m.role === 'system');
  const turns = messages
    .filter(m => m.role !== 'system')
    .map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

  return {
    contents: turns,
    ...(system ? { systemInstruction: { parts: [{ text: system.content }] } } : {}),
    generationConfig: {
      temperature: opts.temperature,
      maxOutputTokens: opts.maxTokens,
    },
  };
}

function parseSseLine(line: string): string | null {
  if (!line.startsWith('data: ')) return '';
  const data = line.slice(6).trim();
  if (data === '[DONE]') return null;
  try {
    const json = JSON.parse(data);
    return json.choices?.[0]?.delta?.content ?? '';
  } catch {
    return '';
  }
}

export class OpenRouterProvider implements LLMProvider {
  activeModel: string | null = null;

  isReady() {
    return !!(GOOGLE_AI_KEY || OPENROUTER_API_KEY);
  }

  async *generate(
    prompt: string | { role: string; content: string }[],
    opts?: GenerateOpts
  ): AsyncIterable<string> {
    const systemPrompt = opts?.systemPrompt ?? NEXUS_SYSTEM_PROMPT;
    const messages = typeof prompt === 'string'
      ? [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt },
        ]
      : [
          { role: 'system', content: systemPrompt },
          ...prompt.map(m => ({
            role: m.role === 'ai' ? 'assistant' : m.role,
            content: m.content,
          })),
        ];

    const genOpts = {
      temperature: opts?.temperature ?? 0.8,
      maxTokens: opts?.maxTokens ?? 4096,
    };

    // ── Cascade: native Gemini API ───────────────────────────────────────────
    if (ENABLE_GOOGLE_AI && GOOGLE_AI_KEY) {
      for (const model of GOOGLE_MODELS) {
        console.log(`[LumenProvider] Trying: ${model}`);
        let response: Response | null = null;
        try {
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GOOGLE_AI_KEY}`;
          const geminiBody = toGeminiBody(messages, genOpts);
          response = await fetchWithTimeout(
            url,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(geminiBody),
            },
            10000,
          );
          console.log(`[LumenProvider] ${model} → HTTP ${response.status}`);
          if (!response.ok) console.error(`[LumenProvider] ${model} error body:`, await response.clone().text());
        } catch (e: any) {
          console.warn(`[LumenProvider] ${model} failed:`, e.message);
          continue;
        }

        if (response.ok) {
          const json = await response.json();
          const content = json.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
          if (content) {
            this.activeModel = model;
            yield content;
          }
          return;
        }

        if (FALLBACK_STATUSES.has(response.status)) {
          console.warn(`[LumenProvider] ${model} → ${response.status}, trying next`);
          continue;
        }

        const errText = await response.text().catch(() => '');
        console.error(`[LumenProvider] ${model} → ${response.status}:`, errText);
        yield `[Lumen Error: HTTP ${response.status} — ${errText.slice(0, 200)}]`;
        return;
      }
      console.warn('[LumenProvider] All Gemini models exhausted, falling back to OpenRouter');
    }

    // ── OpenRouter: native OkHttp SSE (via Kotlin module) ───────────────────
    if (!OPENROUTER_API_KEY) {
      yield '[Lumen Error: All providers exhausted. Check your API keys in .env]';
      return;
    }

    this.activeModel = OPENROUTER_MODEL;

    if (lumixLLMAvailable && lumixLLMEmitter && lumixLLMNative?.lumenGenerate) {
      const tokens: string[] = [];
      let done = false;
      let error: Error | null = null;

      const tokenSub = lumixLLMEmitter.addListener('LumixLumenToken', (e: { text: string }) => {
        tokens.push(e.text);
      });
      const doneSub = lumixLLMEmitter.addListener('LumixLumenDone', () => {
        done = true;
      });
      const errSub = lumixLLMEmitter.addListener('LumixLumenError', (e: { message: string }) => {
        error = new Error(e.message);
        done = true;
      });

      try {
        lumixLLMNative.lumenGenerate(
          JSON.stringify(messages),
          OPENROUTER_MODEL,
          OPENROUTER_API_KEY,
          genOpts.temperature,
          genOpts.maxTokens,
        );

        while (!done || tokens.length > 0) {
          if (tokens.length > 0) {
            yield tokens.shift()!;
          } else {
            await new Promise(r => setTimeout(r, 10));
          }
        }

        if (error) throw error;
      } finally {
        tokenSub.remove();
        doneSub.remove();
        errSub.remove();
        lumixLLMNative.lumenStop?.();
      }
      return;
    }

    // ── XHR fallback (stream: true + SSE via onprogress) ────────────────────
    // Active when native module not linked (e.g. Expo Go / web). Comment this
    // block and uncomment the fetch block below if XHR misbehaves on device.
    yield* await new Promise<AsyncIterable<string>>((resolve) => {
      const tokens: string[] = [];
      let processedLength = 0;
      let settled = false;

      function makeIterable(): AsyncIterable<string> {
        let i = 0;
        return {
          [Symbol.asyncIterator]() {
            return {
              next(): Promise<IteratorResult<string>> {
                return new Promise((res) => {
                  const tryNext = () => {
                    if (i < tokens.length) {
                      res({ value: tokens[i++], done: false });
                    } else if (settled) {
                      res({ value: '', done: true });
                    } else {
                      setTimeout(tryNext, 10);
                    }
                  };
                  tryNext();
                });
              },
            };
          },
        };
      }

      const xhr = new XMLHttpRequest();
      xhr.open('POST', OPENROUTER_URL);
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.setRequestHeader('Authorization', `Bearer ${OPENROUTER_API_KEY}`);
      xhr.setRequestHeader('HTTP-Referer', 'https://lumix.ai');
      xhr.setRequestHeader('X-Title', 'LUMIX');

      xhr.onprogress = () => {
        const newText = xhr.responseText.slice(processedLength);
        processedLength = xhr.responseText.length;
        for (const line of newText.split('\n')) {
          const token = parseSseLine(line);
          if (token === null) { settled = true; return; }
          if (token) tokens.push(token);
        }
      };

      xhr.onload = () => {
        const remaining = xhr.responseText.slice(processedLength);
        for (const line of remaining.split('\n')) {
          const token = parseSseLine(line);
          if (token === null) break;
          if (token) tokens.push(token);
        }
        settled = true;
        if (xhr.status < 200 || xhr.status >= 300) {
          tokens.push(`[Lumen Error: HTTP ${xhr.status} — ${xhr.responseText.slice(0, 200)}]`);
          console.error('[LumenProvider] OpenRouter XHR error:', xhr.status, xhr.responseText.slice(0, 300));
        }
      };

      xhr.onerror = () => {
        tokens.push('[Lumen Error: XHR network error]');
        settled = true;
      };

      xhr.send(JSON.stringify({
        model: OPENROUTER_MODEL,
        messages,
        stream: true,
        temperature: genOpts.temperature,
        max_tokens: genOpts.maxTokens,
      }));

      resolve(makeIterable());
    });

    // ── fetch fallback (stream: false, no streaming UX) ─────────────────────
    // Uncomment if both native OkHttp and XHR fail on device.
    // let response: Response;
    // try {
    //   response = await fetch(OPENROUTER_URL, {
    //     method: 'POST',
    //     headers: {
    //       'Content-Type': 'application/json',
    //       'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
    //       'HTTP-Referer': 'https://lumix.ai',
    //       'X-Title': 'LUMIX',
    //     },
    //     body: JSON.stringify({
    //       model: OPENROUTER_MODEL,
    //       messages,
    //       stream: false,
    //       temperature: genOpts.temperature,
    //       max_tokens: genOpts.maxTokens,
    //     }),
    //   });
    // } catch (e: any) {
    //   yield `[Lumen Error: ${e.message}]`;
    //   return;
    // }
    // if (!response.ok) {
    //   const errText = await response.text().catch(() => '');
    //   console.error('[LumenProvider] OpenRouter error:', response.status, errText);
    //   yield `[Lumen Error: HTTP ${response.status} — ${errText.slice(0, 200)}]`;
    //   return;
    // }
    // this.activeModel = `${OPENROUTER_MODEL} (OpenRouter)`;
    // const json = await response.json();
    // const content = json.choices?.[0]?.message?.content ?? '';
    // if (content) yield content;
  }

  async unload() {}
}
