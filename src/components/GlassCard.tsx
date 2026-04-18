import React from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';
import { BlurView } from 'expo-blur';
import { colors } from '@/theme/colors';

interface GlassCardProps extends ViewProps {
  intensity?: number;
  strongBorder?: boolean;
}

export function GlassCard({
  intensity = 24,
  strongBorder = false,
  style,
  children,
  ...rest
}: GlassCardProps) {
  return (
    <View style={[styles.wrapper, style]} {...rest}>
      <BlurView intensity={intensity} tint="dark" style={StyleSheet.absoluteFill} />
      <View
        style={[
          styles.border,
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
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: colors.glassFill,
  },
  border: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    pointerEvents: 'none',
  },
  borderStrong: {
    borderColor: colors.glassBorderStrong,
  },
});
