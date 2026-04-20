import { create } from 'zustand';

export type LLMStatus = 'idle' | 'searching' | 'copying' | 'loading' | 'ready' | 'unavailable' | 'error';

interface LLMStore {
  status: LLMStatus;
  modelName: string | null;
  setStatus: (s: LLMStatus) => void;
  setModelName: (n: string | null) => void;
}

export const useLLMStore = create<LLMStore>((set) => ({
  status: 'idle',
  modelName: null,
  setStatus: (status) => set({ status }),
  setModelName: (modelName) => set({ modelName }),
}));
