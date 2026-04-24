import type { LLMProvider, GenerateOpts } from './LLMProvider';
import { lumixLLMNative, lumixLLMEmitter, lumixLLMAvailable } from '../../modules/lumix-llm';
import { NEXUS_SYSTEM_PROMPT } from './persona';

export class GemmaLocalProvider implements LLMProvider {
  private ready = false;

  isReady() {
    return this.ready;
  }

  // Loads the model and seeds the persistent Conversation with the static persona.
  async load(modelPath: string): Promise<void> {
    if (!lumixLLMAvailable) return;
    await lumixLLMNative.load(modelPath, NEXUS_SYSTEM_PROMPT);
    this.ready = true;
  }

  async *generate(prompt: string | { role: string; content: string }[], opts?: GenerateOpts): AsyncIterable<string> {
    if (!this.ready || !lumixLLMAvailable || !lumixLLMEmitter) {
      yield '[Model not loaded]';
      return;
    }

    // Extract only the latest message — the Conversation holds prior history internally.
    const messages = typeof prompt === 'string'
      ? [{ role: 'user', content: prompt }]
      : prompt;
    const lastMessage = messages[messages.length - 1].content;
    const dynamicContext = opts?.dynamicContext ?? '';

    const tokens: string[] = [];
    let done = false;
    let error: Error | null = null;

    const tokenSub = lumixLLMEmitter.addListener('LumixLLMToken', (e: { text: string }) => {
      tokens.push(e.text);
    });
    const doneSub = lumixLLMEmitter.addListener('LumixLLMDone', () => {
      done = true;
    });
    const errSub = lumixLLMEmitter.addListener('LumixLLMError', (e: { message: string }) => {
      error = new Error(e.message);
      done = true;
    });

    lumixLLMNative.generate(lastMessage, dynamicContext);

    try {
      while (!done || tokens.length > 0) {
        if (tokens.length > 0) {
          yield tokens.shift()!;
        } else {
          await new Promise((r) => setTimeout(r, 10));
        }
      }
      if (error) throw error;
    } finally {
      tokenSub.remove();
      doneSub.remove();
      errSub.remove();
    }
  }

  resetConversation(): void {
    if (!lumixLLMAvailable) return;
    lumixLLMNative.resetConversation();
  }

  async unload(): Promise<void> {
    if (!lumixLLMAvailable) return;
    lumixLLMNative.unload();
    this.ready = false;
  }
}
