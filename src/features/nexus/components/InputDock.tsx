import React, { useState } from 'react';
import { View, TextInput, Pressable, StyleSheet, Text } from 'react-native';
import Animated, { 
  useAnimatedStyle, 
  withSpring, 
  useSharedValue, 
  withTiming,
  interpolate,
  Extrapolate
} from 'react-native-reanimated';
import { colors } from '@/theme/colors';
import { fonts, fontSizes } from '@/theme/typography';
import { GlassCard } from '@/components/GlassCard';
import { GradientBorder } from '@/components/GradientBorder';

interface InputDockProps {
  value: string;
  onChangeText: (t: string) => void;
  onSend: () => void;
  disabled?: boolean;
  /** Extra pixels to push the dock up — used to sit above the keyboard. */
  bottomInset?: number;
  showNewSession?: boolean;
  onNewSession?: () => void;
  onOpenSettings?: () => void;
}

export function InputDock({
  value,
  onChangeText,
  onSend,
  disabled = false,
  bottomInset = 0,
  showNewSession = false,
  onNewSession,
  onOpenSettings,
}: InputDockProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuAnim = useSharedValue(0);

  const canSend = value.trim().length > 0 && !disabled;

  const toggleMenu = () => {
    const next = !isMenuOpen;
    setIsMenuOpen(next);
    menuAnim.value = withSpring(next ? 1 : 0, {
      damping: 25,
      stiffness: 300,
      mass: 0.4,
    });
  };

  const handleNewSession = () => {
    onNewSession?.();
    toggleMenu();
  };

  const handleOpenSettings = () => {
    onOpenSettings?.();
    toggleMenu();
  };

  const menuStyle = useAnimatedStyle(() => ({
    opacity: menuAnim.value,
    transform: [
      { translateY: interpolate(menuAnim.value, [0, 1], [12, 0], Extrapolate.CLAMP) },
      { scale: interpolate(menuAnim.value, [0, 1], [0.95, 1], Extrapolate.CLAMP) },
    ],
    pointerEvents: menuAnim.value > 0.5 ? 'auto' : 'none',
  }));

  const plusStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${menuAnim.value * 45}deg` }],
  }));

  return (
    <View style={[styles.dock, { bottom: 16 + bottomInset }]}>
      {/* Pop-out Menu */}
      <Animated.View style={[styles.menuContainer, menuStyle]}>
        <GlassCard style={styles.menuCard} radius={20}>
          <Pressable 
            onPress={handleOpenSettings}
            style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}
          >
            <Text style={styles.menuText}>Settings</Text>
          </Pressable>
          <View style={styles.menuDivider} />
          <Pressable 
            onPress={handleNewSession}
            style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}
          >
            <Text style={styles.menuText}>New Session</Text>
          </Pressable>
        </GlassCard>
      </Animated.View>

      <GradientBorder radius={25} innerBg="rgba(8,10,18,0.55)">
        <GlassCard style={styles.box} radius={23.5}>
          {showNewSession && (
            <Pressable
              onPress={toggleMenu}
              style={({ pressed }) => [
                styles.btn,
                styles.newSessionBtn,
                pressed && styles.btnPressed,
              ]}
            >
              <Animated.Text style={[styles.newSessionIcon, plusStyle]}>+</Animated.Text>
            </Pressable>
          )}

          <TextInput
            style={styles.input}
            value={value}
            onChangeText={onChangeText}
            placeholder="Ask LUMIX anything..."
            placeholderTextColor="rgba(200,210,220,0.75)"
            multiline={true}
            editable={!disabled}
          />

          {/* Send button */}
          <Pressable
            onPress={canSend ? onSend : undefined}
            style={({ pressed }) => [
              styles.btn,
              styles.sendBtn,
              pressed && styles.btnPressed,
              !canSend && styles.btnDisabled,
            ]}
          >
            <Text style={styles.sendIcon}>↑</Text>
          </Pressable>
        </GlassCard>
      </GradientBorder>
    </View>
  );
}

const styles = StyleSheet.create({
  dock: {
    position: 'absolute',
    left: 12,
    right: 12,
    zIndex: 10,
  },
  menuContainer: {
    position: 'absolute',
    bottom: 60,
    left: 0,
    width: 140,
    zIndex: 11,
  },
  menuCard: {
    backgroundColor: 'rgba(20, 25, 40, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
  },
  menuItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'flex-start',
  },
  menuItemPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  menuText: {
    color: colors.white,
    fontFamily: fonts.body,
    fontSize: fontSizes.base,
  },
  menuDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginHorizontal: 12,
  },
  box: {
    flexDirection: 'row',
    alignItems: 'flex-end',  // Align items to bottom so buttons stay grounded when input grows
    paddingVertical: 6,
    paddingLeft: 12,
    paddingRight: 6,
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  input: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: fontSizes.lg,
    color: colors.white,
    paddingTop: 8, // Override padding to stabilize vertical height calculation in Android
    paddingBottom: 8,
    minHeight: 36,
    maxHeight: 120, // Caps growth at ~5 lines
    minWidth: 0,
    textAlignVertical: 'center',
  },
  btn: {
    width: 34,
    height: 34,
    borderRadius: 17, // Keep button circular
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    flexShrink: 0,
    marginBottom: 4, // Nudge up 4px to perfectly center with 1-line text
  },
  sendBtn: {
    backgroundColor: 'rgba(0,240,255,0.2)',
    borderColor: 'rgba(0,240,255,0.4)',
  },
  newSessionBtn: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderColor: 'rgba(255,255,255,0.12)',
  },
  btnPressed: {
    opacity: 0.7,
  },
  btnDisabled: {
    opacity: 0.4,
  },
  sendIcon: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  newSessionIcon: {
    color: colors.white,
    fontSize: 20,
    fontWeight: '400',
  },
});
