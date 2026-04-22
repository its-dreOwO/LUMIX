import { Platform } from 'react-native';
import { MockProvider } from './MockProvider';
import { GemmaLocalProvider } from './GemmaLocalProvider';
import { OpenRouterProvider } from './OpenRouterProvider';
import type { LLMProvider } from './LLMProvider';
import { lumixLLMAvailable } from '../../modules/lumix-llm';
import { useLLMStore } from '@/state/llmStore';

const useMock =
  process.env.EXPO_PUBLIC_USE_MOCK_LLM === 'true' ||
  Platform.OS !== 'android' ||
  !lumixLLMAvailable;

export const llmProvider: LLMProvider = useMock
  ? new MockProvider()
  : new GemmaLocalProvider();

export const openRouterProvider = new OpenRouterProvider();

export let modelReady = useMock;
export function markModelReady() {
  modelReady = true;
}
export async function loadModel(modelPath: string): Promise<void> {
  if (llmProvider instanceof GemmaLocalProvider) {
    await (llmProvider as GemmaLocalProvider).load(modelPath);
  }
}

// Initialise the LLM store immediately so TopNav always reflects reality,
// even when setup.tsx is never shown (mock / no native module).
if (useMock) {
  const store = useLLMStore.getState();
  if (Platform.OS !== 'android') {
    store.setStatus('unavailable');
    store.setModelName('mock · non-android');
  } else if (!lumixLLMAvailable) {
    store.setStatus('unavailable');
    store.setModelName('mock · module not linked');
  } else {
    // EXPO_PUBLIC_USE_MOCK_LLM=true — intentional mock override
    store.setStatus('ready');
    store.setModelName('mock');
  }
}

export type { LLMProvider, GenerateOpts } from './LLMProvider';
