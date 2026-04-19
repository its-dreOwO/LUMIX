/**
 * Orb — the animated centrepiece of the NEXUS screen.
 *
 * Layers (inside-out):
 *   1. Outer ambient glow (View + shadow)
 *   2. Shell (Skia Canvas) — radial base + conic swirl + inner swirl + core glow
 *   3. Breathe animation (Reanimated scale on the whole orb)
 *   4. PulseRing — separate expanding ring rendered when active
 *
 * Matches project/LUMIX.html .orb, .orb-shell, .orb-swirl, .orb-inner-swirl,
 * .orb-core, .orb-glow, .pulse-ring
 */

import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Canvas, Circle, Group, SweepGradient, RadialGradient, vec, Skia, Paint, BlurMask } from '@shopify/react-native-skia';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { colors } from '@/theme/colors';
import { durations } from '@/theme/motion';

interface OrbProps {
  active?: boolean;
  size?: number;
}

const ORB_SIZE = 170;

export function Orb({ active = false, size = ORB_SIZE }: OrbProps) {
  const scale = useSharedValue(1);
  const swirlAngle = useSharedValue(0);
  const innerAngle = useSharedValue(0);

  // ── Breathe ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const targetScale = active ? 1.05 : 1.02;
    const dur = active ? durations.breatheActive : durations.breathe;
    scale.value = withRepeat(
      withSequence(
        withTiming(targetScale, { duration: dur / 2, easing: Easing.inOut(Easing.sin) }),
        withTiming(1, { duration: dur / 2, easing: Easing.inOut(Easing.sin) })
      ),
      -1
    );
  }, [active, scale]);

  // ── Swirl rotation ────────────────────────────────────────────────────────
  useEffect(() => {
    const dur = active ? durations.orbSwirlActive : durations.orbSwirl;
    swirlAngle.value = withRepeat(
      withTiming(Math.PI * 2, { duration: dur, easing: Easing.linear }),
      -1
    );
    const innerDur = active ? durations.innerSwirlActive : durations.innerSwirl;
    innerAngle.value = withRepeat(
      withTiming(-Math.PI * 2, { duration: innerDur, easing: Easing.linear }),
      -1
    );
  }, [active, swirlAngle, innerAngle]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const half = size / 2;
  // Canvas is enlarged so the outer swirl (radius up to half*1.4 + blur) isn't
  // clipped into a square. All drawing coords are offset by PAD.
  const PAD = Math.ceil(size * 0.35);
  const canvasSize = size + PAD * 2;
  const cx = half + PAD;
  const cy = half + PAD;
  const center = vec(cx, cy);

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {/* Ambient outer glow */}
      <View style={[styles.glow, {
        width: size * 2.24,
        height: size * 2.24,
        top: -(size * 0.62),
        left: -(size * 0.62),
      }]} />

      {/* Animated orb — Canvas is oversized & absolutely centered so the
          outer swirl can render beyond the shell without being clipped. */}
      <Animated.View style={[styles.orb, { width: size, height: size }, animStyle]}>
        <Canvas
          style={{
            width: canvasSize,
            height: canvasSize,
            position: 'absolute',
            top: -PAD,
            left: -PAD,
          }}
        >
          {/* Shell base — dark core + colour radials */}
          <Circle cx={cx} cy={cy} r={half}>
            <RadialGradient
              c={center}
              r={half}
              colors={['rgba(255,255,255,0.25)', 'rgba(138,43,226,0.35)', 'rgba(0,240,255,0.25)', 'transparent']}
              positions={[0, 0.3, 0.7, 1]}
            />
          </Circle>

          {/* Outer swirl layer */}
          <Group
            origin={center}
            transform={[{ rotate: swirlAngle.value }]}
            opacity={0.7}
          >
            <Circle cx={cx} cy={cy} r={half * 1.4}>
              <SweepGradient
                c={center}
                colors={[
                  'transparent',
                  'rgba(0,240,255,0.4)',
                  'transparent',
                  'rgba(138,43,226,0.5)',
                  'transparent',
                  'rgba(0,240,255,0.3)',
                  'transparent',
                ]}
                positions={[0, 0.17, 0.33, 0.56, 0.72, 0.89, 1]}
              />
              <BlurMask blur={10} style="normal" />
            </Circle>
          </Group>

          {/* Inner swirl layer */}
          <Group
            origin={center}
            transform={[{ rotate: innerAngle.value }]}
            opacity={0.6}
          >
            <Circle cx={cx} cy={cy} r={half * 0.7}>
              <SweepGradient
                c={center}
                colors={[
                  'rgba(138,43,226,0.3)',
                  'transparent',
                  'rgba(0,240,255,0.5)',
                  'transparent',
                  'rgba(138,43,226,0.3)',
                ]}
                positions={[0, 0.25, 0.5, 0.75, 1]}
              />
              <BlurMask blur={6} style="normal" />
            </Circle>
          </Group>

          {/* Core glow */}
          <Circle cx={cx} cy={cy} r={half * 0.2}>
            <RadialGradient
              c={center}
              r={half * 0.2}
              colors={['rgba(255,255,255,0.6)', 'rgba(0,240,255,0.3)', 'transparent']}
              positions={[0, 0.4, 1]}
            />
            <BlurMask blur={8} style="normal" />
          </Circle>
        </Canvas>
      </Animated.View>

      {/* Pulse rings — only shown when active */}
      {active && <PulseRing size={size} />}
      {active && <PulseRing size={size} delay={500} />}
    </View>
  );
}

// ─── PulseRing ────────────────────────────────────────────────────────────────

interface PulseRingProps {
  size: number;
  delay?: number;
}

function PulseRing({ size, delay = 0 }: PulseRingProps) {
  const scale = useSharedValue(0.8);
  const opacity = useSharedValue(0.9);

  useEffect(() => {
    const start = () => {
      scale.value = withRepeat(
        withTiming(3, { duration: durations.pulseRing, easing: Easing.out(Easing.ease) }),
        -1
      );
      opacity.value = withRepeat(
        withTiming(0, { duration: durations.pulseRing, easing: Easing.out(Easing.ease) }),
        -1
      );
    };
    const timer = setTimeout(start, delay);
    return () => clearTimeout(timer);
  }, [scale, opacity, delay]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.pulseRing,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          top: 0,
          left: 0,
        },
        animStyle,
      ]}
      pointerEvents="none"
    />
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  glow: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'transparent',
    shadowColor: colors.cyan,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 40,
    // Android ambient glow via background + elevation
    elevation: 0,
  },
  orb: {
    borderRadius: 999,
    shadowColor: colors.cyan,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 30,
  },
  pulseRing: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: `rgba(0,240,255,0.3)`,
    backgroundColor: 'transparent',
  },
});
