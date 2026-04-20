import React from 'react';
import { View, type ViewStyle, type StyleProp } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface GradientBorderProps {
  /** Outer radius of the gradient frame. */
  radius: number;
  /** Thickness of the border stroke in px. Default 1.5. */
  borderWidth?: number;
  /** Background color of the inner fill. Must occlude the gradient center. */
  innerBg: string;
  /** Gradient colors (9 o'clock → 1 o'clock). */
  colors?: readonly [string, string, ...string[]];
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

/**
 * Renders a 1–2 px gradient stroke around its children.
 * Technique: outer LinearGradient acts as the stroke, inner View fills with
 * solid bg so only the border ring of the gradient is visible.
 * Direction: 9 o'clock (left-center) → 1 o'clock (upper-right).
 */
export function GradientBorder({
  radius,
  borderWidth = 1.5,
  innerBg,
  colors = ['rgba(0,240,255,0.55)', 'rgba(59,130,246,0.4)', 'rgba(0,240,255,0.05)'] as const,
  style,
  children,
}: GradientBorderProps) {
  return (
    <LinearGradient
      colors={colors as unknown as readonly [string, string, ...string[]]}
      start={{ x: 0, y: 0.55 }}
      end={{ x: 0.95, y: 0.05 }}
      style={[{ borderRadius: radius, padding: borderWidth }, style]}
    >
      <View
        style={{
          backgroundColor: innerBg,
          borderRadius: Math.max(0, radius - borderWidth),
          overflow: 'hidden',
        }}
      >
        {children}
      </View>
    </LinearGradient>
  );
}
