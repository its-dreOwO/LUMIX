import React from 'react';
import { View, TextInput, Pressable, StyleSheet, Text } from 'react-native';
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
}

export function InputDock({
  value,
  onChangeText,
  onSend,
  disabled = false,
  bottomInset = 0,
  showNewSession = false,
  onNewSession,
}: InputDockProps) {
  const canSend = value.trim().length > 0 && !disabled;

  return (
    <View style={[styles.dock, { bottom: 16 + bottomInset }]}>
      <GradientBorder radius={25} innerBg="rgba(8,10,18,0.55)">
        <GlassCard style={styles.box} radius={23.5}>
          {showNewSession && (
            <Pressable
              onPress={onNewSession}
              style={({ pressed }) => [
                styles.btn,
                styles.newSessionBtn,
                pressed && styles.btnPressed,
              ]}
            >
              <Text style={styles.newSessionIcon}>+</Text>
            </Pressable>
          )}

          <TextInput
            style={styles.input}
            value={value}
            onChangeText={onChangeText}
            placeholder="Ask LUMIX anything..."
            placeholderTextColor="rgba(200,210,220,0.75)"
            multiline={false}
            returnKeyType="send"
            onSubmitEditing={canSend ? onSend : undefined}
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
    zIndex: 5,
  },
  box: {
    flexDirection: 'row',
    alignItems: 'center',
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
    paddingVertical: 8,
    minWidth: 0,
  },
  btn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    flexShrink: 0,
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
    fontSize: 18,
    fontWeight: '400',
  },
});
