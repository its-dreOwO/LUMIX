// Tokens ported directly from project/LUMIX.html :root
export const colors = {
  bg0: '#000000',
  bg1: '#09090E',
  cyan: '#00F0FF',
  violet: '#8A2BE2',
  white: '#FFFFFF',
  silver: '#A0A0A5',

  glassFill: 'rgba(255,255,255,0.03)',
  glassBorder: 'rgba(255,255,255,0.10)',
  glassBorderStrong: 'rgba(255,255,255,0.18)',

  // Semantic aliases
  textPrimary: '#FFFFFF',
  textSecondary: 'rgba(255,255,255,0.92)',
  textMuted: 'rgba(160,160,165,0.8)',
  textDim: 'rgba(160,160,165,0.6)',

  // Gradient stops
  gradCyan: '#00F0FF',
  gradViolet: '#8A2BE2',
} as const;

export type ColorKey = keyof typeof colors;
