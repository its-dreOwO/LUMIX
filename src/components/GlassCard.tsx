import React from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';
import { BlurView } from 'expo-blur';
import { colors } from '@/theme/colors';

interface GlassCardProps extends ViewProps {
  intensity?: number;
  strongBorder?: boolean;
  /** Border radius applied uniformly to wrapper + inner border. Default 20. */
  radius?: number;
}

export function GlassCard({
  intensity = 24,
  strongBorder = false,
  radius = 20,
  style,
  children,
  ...rest
}: GlassCardProps) {
  return (
    <View style={[styles.wrapper, { borderRadius: radius }, style]} {...rest}>
      <BlurView intensity={intensity} tint="dark" style={[StyleSheet.absoluteFill, { borderRadius: radius }]} />
      <View
        style={[
          styles.border,
          { borderRadius: radius },
          strongBorder && styles.borderStrong,
          StyleSheet.absoluteFill,
        ]}
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    overflow: 'hidden',
    backgroundColor: colors.glassFill,
  },
  border: {
    borderWidth: 1,
    borderColor: colors.glassBorder,
    pointerEvents: 'none',
  },
  borderStrong: {
    borderColor: colors.glassBorderStrong,
  },
});
