import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing, withSequence, cancelAnimation } from 'react-native-reanimated';
import * as Clipboard from 'expo-clipboard';
import { colors } from '@/theme/colors';
import { fonts, fontSizes } from '@/theme/typography';
import type { ChatMessage } from '@/state/nexusStore';

interface MessageBubbleProps {
  message: ChatMessage;
}

function ThinkingPlaceholder() {
  const t = useSharedValue(-1);
  
  useEffect(() => {
    t.value = withRepeat(withTiming(2, { duration: 1200, easing: Easing.linear }), -1);
    return () => {
      cancelAnimation(t);
    };
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: t.value * 120 }],
  }));

  return (
    <View style={styles.thinkingContainer}>
      <Animated.View style={[styles.thinkingGlow, animStyle]}>
        <LinearGradient
          colors={['transparent', 'rgba(0,240,255,0.45)', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
}

function SearchingPlaceholder() {
  const t = useSharedValue(-1);
  
  useEffect(() => {
    t.value = withRepeat(withTiming(2, { duration: 1500, easing: Easing.linear }), -1);
    return () => {
      cancelAnimation(t);
    };
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: t.value * 200 }],
  }));

  return (
    <View style={styles.searchingContainer}>
      <Text style={[styles.text, styles.textItalic]}>Searching the web...</Text>
      <Animated.View style={[styles.thinkingGlow, animStyle]} pointerEvents="none">
        <LinearGradient
          colors={['transparent', 'rgba(0,240,255,0.5)', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  
  let rawText = message.content;
  const isThinking = !isUser && message.streaming && rawText.trim() === '';
  
  const searchPattern = '*Searching the web...*';
  const hasSearch = rawText.includes(searchPattern);

  if (hasSearch) {
    rawText = rawText.replace(searchPattern, '').trim();
  }

  const handleCopy = async () => {
    if (!message.streaming && message.content) {
      await Clipboard.setStringAsync(message.content);
    }
  };

  return (
    <Pressable 
      onLongPress={handleCopy} 
      delayLongPress={400}
      style={({ pressed }) => [
        styles.bubble, 
        isUser ? styles.userBubble : styles.aiBubble,
        pressed && styles.bubblePressed
      ]}
    >
      <Text style={styles.label}>{isUser ? 'YOU' : 'LUMIX'}</Text>
      
      {isThinking ? (
        <ThinkingPlaceholder />
      ) : (
        <>
          {rawText ? <Text style={styles.text}>{rawText}</Text> : null}
          {hasSearch ? <SearchingPlaceholder /> : null}
          {!hasSearch && message.streaming && !isThinking ? (
            <Text style={styles.cursor}>▋</Text>
          ) : null}
        </>
      )}
    </Pressable>
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
  bubblePressed: {
    opacity: 0.75,
    transform: [{ scale: 0.98 }],
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
  textItalic: {
    fontStyle: 'italic',
    opacity: 0.7,
  },
  cursor: {
    color: colors.cyan,
    opacity: 0.8,
  },
  thinkingContainer: {
    width: 60,
    height: 18,
    marginTop: 2,
    marginBottom: 2,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
  },
  thinkingGlow: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: '100%',
  },
  searchingContainer: {
    marginTop: 4,
    marginBottom: 4,
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: 'rgba(0,240,255,0.06)',
    overflow: 'hidden',
    alignSelf: 'flex-start',
  },
});
