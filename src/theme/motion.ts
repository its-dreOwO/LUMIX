// Animation durations and easings — ported from prototype keyframes
export const durations = {
  fast: 200,
  normal: 400,
  slow: 600,
  breathe: 3500,
  breatheActive: 1400,
  orbSwirl: 12000,
  orbSwirlActive: 3000,
  innerSwirl: 8000,
  innerSwirlActive: 2000,
  pulseRing: 1400,
  liveDot: 2000,
  raceBorder: 9000,
  fadeUp: 1200,
} as const;

export const easings = {
  easeOut: 'easeOut',
  easeInOut: 'easeInOut',
  linear: 'linear',
} as const;
