import { Platform } from 'react-native';
import { MockProvider } from './MockProvider';
import { GemmaLocalProvider } from './GemmaLocalProvider';
import type { LLMProvider } from './LLMProvider';
import { lumixLLMAvailable } from '../../modules/lumix-llm';

const useMock =
  process.env.EXPO_PUBLIC_USE_MOCK_LLM === 'true' ||
  Platform.OS !== 'android' ||
  !lumixLLMAvailable;

export const llmProvider: LLMProvider = useMock
  ? new MockProvider()
  : new GemmaLocalProvider();

export let modelReady = useMock;
export function markModelReady() {
  modelReady = true;
}
export async function loadModel(modelPath: string): Promise<void> {
  if (llmProvider instanceof GemmaLocalProvider) {
    await (llmProvider as GemmaLocalProvider).load(modelPath);
  }
}

export type { LLMProvider, GenerateOpts } from './LLMProvider';
