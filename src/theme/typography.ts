// Mirror the font families from project/LUMIX.html
export const fonts = {
  display: 'SpaceGrotesk',      // Space Grotesk — headings, labels, nav
  body: 'Inter',                // Inter — body text, inputs
  mono: 'JetBrainsMono',        // JetBrains Mono — timestamps, codes, tags
} as const;

export const fontSizes = {
  xs: 8.5,
  sm: 9.5,
  base: 11,
  md: 12,
  lg: 13,
  xl: 20,
  '2xl': 24,
  '3xl': 28,
  '4xl': 36,
} as const;

export const fontWeights = {
  light: '300' as const,
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};

export const letterSpacings = {
  tight: -0.02,
  normal: 0,
  wide: 0.05,
  wider: 0.1,
  widest: 0.3,
} as const;
