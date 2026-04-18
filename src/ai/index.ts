import { Platform } from 'react-native';
import { MockProvider } from './MockProvider';
import { GemmaLocalProvider } from './GemmaLocalProvider';
import type { LLMProvider } from './LLMProvider';

const useMock =
  process.env.EXPO_PUBLIC_USE_MOCK_LLM === 'true' || Platform.OS !== 'android';

export const llmProvider: LLMProvider = useMock
  ? new MockProvider()
  : new GemmaLocalProvider();

export type { LLMProvider, GenerateOpts } from './LLMProvider';
