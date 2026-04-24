import React, { useEffect, useState, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Pressable, 
  Dimensions, 
  PanResponder,
  Animated as RNAnimated
} from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming,
  interpolate,
  interpolateColor,
  runOnJS,
  Extrapolate,
  Easing
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { useNexusStore } from '@/state/nexusStore';
import { colors } from '@/theme/colors';
import { fonts, fontSizes } from '@/theme/typography';
import { OPENROUTER_MODEL } from '@/ai/OpenRouterProvider';

const HIDDEN_Y = 800;
const CLOSE_THRESHOLD = 150;

interface SettingsSheetProps {
  isVisible: boolean;
  onClose: () => void;
}

export function SettingsSheet({ isVisible, onClose }: SettingsSheetProps) {
  const { lumenMode, setLumenMode, debugMode, setDebugMode } = useNexusStore();
  const [shouldMount, setShouldMount] = useState(isVisible);
  const translateY = useSharedValue(HIDDEN_Y);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (isVisible) {
      setShouldMount(true);
      opacity.value = withTiming(1, { duration: 200 });
      translateY.value = withTiming(0, { 
        duration: 300, 
        easing: Easing.out(Easing.cubic) 
      });
    } else {
      opacity.value = withTiming(0, { duration: 200 });
      translateY.value = withTiming(HIDDEN_Y, { 
        duration: 250, 
        easing: Easing.in(Easing.cubic) 
      }, (finished) => {
        if (finished) {
          runOnJS(setShouldMount)(false);
          runOnJS(onClose)();
        }
      });
    }
  }, [isVisible]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only take over if dragging downwards or significant movement
        return Math.abs(gestureState.dy) > 5;
      },
      onPanResponderMove: (_, gestureState) => {
        // Only allow dragging downwards (positive dy)
        if (gestureState.dy > 0) {
          translateY.value = gestureState.dy;
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > CLOSE_THRESHOLD || gestureState.vy > 0.5) {
          // Close
          opacity.value = withTiming(0, { duration: 200 });
          translateY.value = withTiming(HIDDEN_Y, { 
            duration: 250, 
            easing: Easing.in(Easing.cubic) 
          }, (finished) => {
            if (finished) {
              runOnJS(setShouldMount)(false);
              runOnJS(onClose)();
            }
          });
        } else {
          // Snap back
          translateY.value = withTiming(0, { 
            duration: 200, 
            easing: Easing.out(Easing.cubic) 
          });
        }
      },
    })
  ).current;

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  if (!shouldMount) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents={isVisible ? 'auto' : 'none'}>
      {/* Backdrop */}
      <Animated.View style={[styles.backdrop, backdropStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      {/* Bottom Sheet */}
      <Animated.View 
        style={[styles.sheet, sheetStyle]}
        {...panResponder.panHandlers}
      >
        <View style={styles.sheetContent}>
          <BlurView intensity={50} tint="dark" style={StyleSheet.absoluteFill} />
          
          <View style={styles.handle} />
          
          <Text style={styles.headerTitle}>Settings</Text>

          <View style={styles.optionsContainer}>
            <SettingRow
              label="Lumen mode"
              description={lumenMode ? `${OPENROUTER_MODEL} via OpenRouter` : undefined}
              value={lumenMode}
              onToggle={setLumenMode}
            />
            <SettingRow label="Deep Thinking Mode" initialValue={false} />
            <SettingRow
              label="Debug mode"
              description={debugMode ? 'Type <TOOL>payload</TOOL> to test tools directly' : undefined}
              value={debugMode}
              onToggle={setDebugMode}
            />
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

interface SettingRowProps {
  label: string;
  description?: string;
  initialValue?: boolean;
  value?: boolean;
  onToggle?: (val: boolean) => void;
}

function SettingRow({ label, description, initialValue, value, onToggle }: SettingRowProps) {
  const isControlled = value !== undefined;
  const [internalEnabled, setInternalEnabled] = useState(initialValue ?? false);
  const enabled = isControlled ? value : internalEnabled;
  const thumbPos = useSharedValue(enabled ? 1 : 0);

  useEffect(() => {
    thumbPos.value = withTiming(enabled ? 1 : 0, { 
      duration: 180,
      easing: Easing.out(Easing.cubic)
    });
  }, [enabled]);

  const toggle = () => {
    if (isControlled) {
      onToggle?.(!value);
    } else {
      setInternalEnabled(!internalEnabled);
    }
  };

  const trackStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      thumbPos.value, 
      [0, 1], 
      ['rgba(255,255,255,0.06)', 'rgba(0, 240, 255, 0.18)']
    ),
    borderColor: interpolateColor(
      thumbPos.value,
      [0, 1],
      ['rgba(255,255,255,0.1)', 'rgba(0, 240, 255, 0.35)']
    ),
  }));

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(thumbPos.value, [0, 1], [4, 26], Extrapolate.CLAMP) }],
    backgroundColor: interpolateColor(
      thumbPos.value, 
      [0, 1], 
      ['#666', '#fff']
    ),
    shadowOpacity: interpolate(thumbPos.value, [0, 1], [0, 0.4], Extrapolate.CLAMP),
  }));

  return (
    <View style={styles.row}>
      <View style={styles.labelContainer}>
        <Text style={styles.rowLabel}>{label}</Text>
        {description && (
          <Text style={styles.rowDescription}>{description}</Text>
        )}
      </View>
      <Pressable onPress={toggle}>
        <Animated.View style={[styles.switchTrack, trackStyle]}>
          <Animated.View style={[styles.switchThumb, thumbStyle]} />
        </Animated.View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 100,
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 101,
  },
  sheetContent: {
    backgroundColor: 'rgba(12, 14, 22, 0.9)',
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: 'rgba(255,255,255,0.14)',
    paddingTop: 12,
    paddingHorizontal: 24,
    paddingBottom: 100, // Generous bottom spacing for ergonomics
    overflow: 'hidden',
  },
  handle: {
    width: 32,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 28,
  },
  headerTitle: {
    fontFamily: fonts.displayBold,
    fontSize: fontSizes.xl,
    color: colors.white,
    marginBottom: 20,
    letterSpacing: 0.8,
  },
  optionsContainer: {
    gap: 0,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  labelContainer: {
    flex: 1,
    marginRight: 16,
  },
  rowLabel: {
    fontFamily: fonts.body,
    fontSize: fontSizes.base,
    color: colors.textPrimary,
  },
  rowDescription: {
    fontFamily: fonts.body,
    fontSize: fontSizes.xs,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 4,
  },
  switchTrack: {
    width: 52,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    borderWidth: 1,
  },
  switchThumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    shadowColor: colors.cyan,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 8,
  },
});
