// JS bridge for the LumixLLM native module.
// The native side lives in modules/lumix-llm/android/LumixLlmModule.kt
// and emits events: LumixLLMToken { text }, LumixLLMDone, LumixLLMError { message }

import { NativeModules, NativeEventEmitter, Platform } from 'react-native';

const { LumixLLM } = NativeModules;

export const lumixLLMAvailable = Platform.OS === 'android' && !!LumixLLM;

export const lumixLLMEmitter = lumixLLMAvailable
  ? new NativeEventEmitter(LumixLLM)
  : null;

export interface LumixLLMNative {
  load(modelPath: string): Promise<void>;
  generate(prompt: string, maxTokens: number, temperature: number): void;
  stop(): void;
}

export const lumixLLMNative: LumixLLMNative | null = lumixLLMAvailable ? LumixLLM : null;
