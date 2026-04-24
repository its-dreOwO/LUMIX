import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { GlassCard } from '@/components/GlassCard';
import { LiveDot } from '@/components/LiveDot';
import { colors } from '@/theme/colors';
import { fonts, fontSizes, letterSpacings } from '@/theme/typography';

export interface BriefItem {
  time: string;   // e.g. "MORNING", "NOW", "LATER"
  text: string;
}

interface Props {
  items: BriefItem[];
  loading?: boolean;
}

export function BriefingCard({ items, loading }: Props) {
  return (
    <GlassCard style={styles.card}>
      {/* Label */}
      <View style={styles.labelRow}>
        <LiveDot />
        <Text style={styles.label}>BRIEFING</Text>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.cyan} style={{ marginTop: 16 }} />
      ) : items.length === 0 ? (
        <Text style={styles.empty}>Ask NEXUS anything to get your briefing.</Text>
      ) : (
        items.map((item, i) => (
          <View key={i} style={styles.briefRow}>
            <Text style={styles.timeLabel}>{item.time}</Text>
            <Text style={styles.briefText}>{item.text}</Text>
          </View>
        ))
      )}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 190,
    padding: 16,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  label: {
    fontFamily: fonts.mono,
    fontSize: fontSizes.xxs,
    color: colors.textDim,
    letterSpacing: letterSpacings.wider,
  },
  empty: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colors.textDim,
    marginTop: 8,
    lineHeight: 18,
  },
  briefRow: {
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  timeLabel: {
    fontFamily: fonts.mono,
    fontSize: fontSizes.xxs,
    color: colors.cyan,
    letterSpacing: letterSpacings.wider,
    marginBottom: 4,
    opacity: 0.8,
  },
  briefText: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    lineHeight: 18,
  },
});
