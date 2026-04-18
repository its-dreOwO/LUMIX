import { create } from 'zustand';

type Tab = 'nexus' | 'dashboard';
type Palette = 'default' | 'sunset' | 'forest';

interface UIState {
  activeTab: Tab;
  tweaksPanelOpen: boolean;
  palette: Palette;

  setActiveTab: (tab: Tab) => void;
  toggleTweaksPanel: () => void;
  setPalette: (p: Palette) => void;
}

export const useUIStore = create<UIState>((set) => ({
  activeTab: 'nexus',
  tweaksPanelOpen: false,
  palette: 'default',

  setActiveTab: (tab) => set({ activeTab: tab }),
  toggleTweaksPanel: () => set((s) => ({ tweaksPanelOpen: !s.tweaksPanelOpen })),
  setPalette: (palette) => set({ palette }),
}));
