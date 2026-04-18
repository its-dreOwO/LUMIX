import { NativeEventEmitter, NativeModules, Platform } from 'react-native';
import type { LLMProvider, GenerateOpts } from './LLMProvider';

// TODO (Phase 3): implement modules/lumix-llm native module
// This file bridges it to the LLMProvider interface.

const { LumixLLM } = NativeModules;

export class GemmaLocalProvider implements LLMProvider {
  private ready = false;
  private emitter: NativeEventEmitter | null = null;

  constructor() {
    if (Platform.OS !== 'android' || !LumixLLM) return;
    this.emitter = new NativeEventEmitter(LumixLLM);
  }

  isReady() {
    return this.ready;
  }

  async load(modelPath: string): Promise<void> {
    if (Platform.OS !== 'android' || !LumixLLM) return;
    await LumixLLM.load(modelPath);
    this.ready = true;
  }

  async *generate(prompt: string, opts?: GenerateOpts): AsyncIterable<string> {
    if (!this.ready || !LumixLLM || !this.emitter) {
      yield '[Model not loaded]';
      return;
    }

    const tokens: string[] = [];
    let done = false;
    let error: Error | null = null;

    const tokenSub = this.emitter.addListener('LumixLLMToken', (e: { text: string }) => {
      tokens.push(e.text);
    });
    const doneSub = this.emitter.addListener('LumixLLMDone', () => {
      done = true;
    });
    const errSub = this.emitter.addListener('LumixLLMError', (e: { message: string }) => {
      error = new Error(e.message);
      done = true;
    });

    LumixLLM.generate(prompt, opts?.maxTokens ?? 512, opts?.temperature ?? 0.7);

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
