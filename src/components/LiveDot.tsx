import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
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

export function LiveDot() {
  const opacity = useSharedValue(0.6);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: durations.liveDot / 2, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.6, { duration: durations.liveDot / 2, easing: Easing.inOut(Easing.ease) })
      ),
      -1
    );
  }, [opacity]);

  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <View style={styles.wrapper}>
      <Animated.View style={[styles.dot, animStyle]} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: 6,
    height: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.cyan,
    shadowColor: colors.cyan,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 4,
  },
});
