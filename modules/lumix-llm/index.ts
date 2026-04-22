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
  load(modelPath: string, maxTokens: number, temperature: number): Promise<void>;
  generate(prompt: string): void;
  stop(): void;
  unload(): void;
}
