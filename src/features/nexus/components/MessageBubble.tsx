import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '@/theme/colors';
import { fonts, fontSizes } from '@/theme/typography';
import type { ChatMessage } from '@/state/nexusStore';

interface MessageBubbleProps {
  message: ChatMessage;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <View style={[styles.bubble, isUser ? styles.userBubble : styles.aiBubble]}>
      <Text style={styles.label}>{isUser ? 'YOU' : 'LUMIX'}</Text>
      <Text style={styles.text}>
        {message.content}
        {message.streaming ? (
          <Text style={styles.cursor}>▋</Text>
        ) : null}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: {
    maxWidth: '85%',
    paddingVertical: 9,
    paddingHorizontal: 13,
    borderRadius: 16,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: 'rgba(0,240,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(0,240,255,0.38)',
    borderBottomRightRadius: 6,
  },
  aiBubble: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.20)',
    borderBottomLeftRadius: 6,
  },
  label: {
    fontFamily: fonts.mono,
    fontSize: fontSizes.xxs,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: 'rgba(0,240,255,0.6)',
    marginBottom: 4,
  },
  text: {
    fontFamily: fonts.body,
    fontSize: fontSizes.md,
    lineHeight: fontSizes.md * 1.45,
    color: 'rgba(255,255,255,0.92)',
  },
  cursor: {
    color: colors.cyan,
    opacity: 0.8,
  },
});
