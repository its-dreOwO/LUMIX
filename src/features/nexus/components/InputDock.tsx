import React from 'react';
import { View, TextInput, Pressable, StyleSheet, Text } from 'react-native';
import { colors } from '@/theme/colors';
import { fonts, fontSizes } from '@/theme/typography';
import { GlassCard } from '@/components/GlassCard';

interface InputDockProps {
  value: string;
  onChangeText: (t: string) => void;
  onSend: () => void;
  disabled?: boolean;
}

export function InputDock({ value, onChangeText, onSend, disabled = false }: InputDockProps) {
  const canSend = value.trim().length > 0 && !disabled;

  return (
    <View style={styles.dock}>
      <GlassCard style={styles.box}>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder="Ask LUMIX anything..."
          placeholderTextColor="rgba(160,160,165,0.5)"
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
    </View>
  );
}

const styles = StyleSheet.create({
  dock: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 60,
    zIndex: 5,
  },
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingLeft: 16,
    paddingRight: 6,
    gap: 6,
    borderRadius: 24,
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
});
