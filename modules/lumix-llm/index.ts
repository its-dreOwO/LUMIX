import { Platform } from 'react-native';
import { requireNativeModule, EventEmitter } from 'expo-modules-core';

let _native: any = null;
let _emitter: EventEmitter | null = null;

if (Platform.OS === 'android') {
  try {
    _native = requireNativeModule('LumixLLM');
    _emitter = new EventEmitter(_native);
  } catch {
    // module not linked in this build
  }
}

export const lumixLLMAvailable = !!_native;
export const lumixLLMNative = _native;
export const lumixLLMEmitter = _emitter;

export interface LumixLLMNative {
  load(modelPath: string, systemPrompt: string): Promise<void>;
  generate(userMessage: string, dynamicContext: string): void;
  stop(): void;
  resetConversation(): void;
  unload(): void;
  lumenGenerate(messagesJson: string, model: string, apiKey: string, temperature: number, maxTokens: number): void;
  lumenStop(): void;
}
