import { create } from 'zustand';

export interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  content: string;
  streaming?: boolean;
}

interface NexusState {
  messages: ChatMessage[];
  orbActive: boolean;
  inputText: string;
  sessionId: string;
  lumenMode: boolean;
  debugMode: boolean;

  addMessage: (msg: ChatMessage) => void;
  updateLastAiMessage: (text: string, done: boolean) => void;
  setOrbActive: (active: boolean) => void;
  setInputText: (text: string) => void;
  setLumenMode: (enabled: boolean) => void;
  setDebugMode: (enabled: boolean) => void;
  clearMessages: () => void;
}

export const useNexusStore = create<NexusState>((set) => ({
  messages: [],
  orbActive: false,
  inputText: '',
  sessionId: Date.now().toString(),
  lumenMode: false,
  debugMode: false,

  addMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),

  updateLastAiMessage: (text, done) =>
    set((s) => {
      const msgs = [...s.messages];
      const last = msgs[msgs.length - 1];
      if (last?.role === 'ai') {
        msgs[msgs.length - 1] = { ...last, content: text, streaming: !done };
      }
      return { messages: msgs };
    }),

  setOrbActive: (active) => set({ orbActive: active }),
  setLumenMode: (enabled) => set({ lumenMode: enabled }),
  setDebugMode: (enabled) => set({ debugMode: enabled }),
  setInputText: (text) => set({ inputText: text }),
  clearMessages: () => set({ messages: [], sessionId: Date.now().toString() }),
}));
