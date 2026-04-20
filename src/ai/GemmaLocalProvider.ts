import type { LLMProvider, GenerateOpts } from './LLMProvider';
import { lumixLLMNative, lumixLLMEmitter, lumixLLMAvailable } from '../../modules/lumix-llm';

export class GemmaLocalProvider implements LLMProvider {
  private ready = false;

  isReady() {
    return this.ready;
  }

  async load(modelPath: string, maxTokens = 1024, temperature = 0.8): Promise<void> {
    if (!lumixLLMAvailable) return;
    await lumixLLMNative.load(modelPath, maxTokens, temperature);
    this.ready = true;
  }

  async *generate(prompt: string, opts?: GenerateOpts): AsyncIterable<string> {
    if (!this.ready || !lumixLLMAvailable || !lumixLLMEmitter) {
      yield '[Model not loaded]';
      return;
    }

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

    lumixLLMNative.generate(prompt);

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
}
