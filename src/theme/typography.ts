// Font family strings — must match the keys passed to useFonts() in _layout.tsx
export const fonts = {
  // Space Grotesk — headings, nav labels, large numbers
  displayLight: 'SpaceGrotesk_300Light',
  display: 'SpaceGrotesk_400Regular',
  displayMedium: 'SpaceGrotesk_500Medium',
  displaySemiBold: 'SpaceGrotesk_600SemiBold',
  displayBold: 'SpaceGrotesk_700Bold',

  // Inter — body text, inputs, bubbles
  bodyLight: 'Inter_300Light',
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodySemiBold: 'Inter_600SemiBold',

  // JetBrains Mono — timestamps, tags, status labels
  mono: 'JetBrainsMono_400Regular',
  monoMedium: 'JetBrainsMono_500Medium',
} as const;

export type FontKey = keyof typeof fonts;

export const fontSizes = {
  xxs: 8.5,
  xs: 9.5,
  sm: 10.5,
  base: 11,
  md: 12,
  lg: 13,
  xl: 20,
  '2xl': 24,
  '3xl': 28,
  '4xl': 36,
} as const;

export const letterSpacings = {
  tight: -0.02,
  normal: 0,
  wide: 0.05,
  wider: 0.1,
  widest: 0.3,
} as const;
