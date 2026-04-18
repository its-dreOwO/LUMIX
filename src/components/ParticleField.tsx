// TODO (Phase 1): Skia port of the particle field from project/LUMIX.html:902.
// Grid of nano-orbs with fluid drift, spring-return, and pulse shockwaves.
// Expose pulse(x, y) imperatively via useImperativeHandle.

import React, { forwardRef, useImperativeHandle } from 'react';
import { View, StyleSheet } from 'react-native';

export interface ParticleFieldRef {
  pulse: (x: number, y: number) => void;
}

export const ParticleField = forwardRef<ParticleFieldRef>(function ParticleField(_, ref) {
  useImperativeHandle(ref, () => ({
    pulse: (_x: number, _y: number) => {
      // Phase 1: implement Skia particle pulse
    },
  }));

  // Phase 1: replace with Skia canvas
  return <View style={StyleSheet.absoluteFill} pointerEvents="none" />;
});
