import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '@/theme/colors';
import { fonts, fontSizes, letterSpacings } from '@/theme/typography';

function getTimeString() {
  const now = new Date();
  return now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export function Greeting() {
  const [time, setTime] = useState(getTimeString());

  useEffect(() => {
    const id = setInterval(() => setTime(getTimeString()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <View style={styles.wrapper} pointerEvents="none">
      <Text style={styles.time}>{time}</Text>
      <Text style={styles.heading}>
        {getGreeting()},{' '}
        <Text style={styles.em}>LUMIX</Text>
      </Text>
      <Text style={styles.sub}>How can I help you today?</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    top: 110,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  time: {
    fontFamily: fonts.mono,
    fontSize: fontSizes.xxs,
    color: 'rgba(160,160,165,0.7)',
    letterSpacing: 3,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  heading: {
    fontFamily: fonts.displayLight,
    fontSize: fontSizes['3xl'],
    color: 'rgba(255,255,255,0.92)',
    letterSpacing: -0.3,
    textShadowColor: `rgba(0,240,255,0.4)`,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  em: {
    fontFamily: fonts.displayMedium,
    color: colors.cyan, // gradient not supported inline; use cyan as accent
  },
  sub: {
    marginTop: 8,
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: 'rgba(160,160,165,0.8)',
    letterSpacing: 0.5,
  },
});
