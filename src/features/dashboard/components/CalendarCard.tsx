import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { GlassCard } from '@/components/GlassCard';
import { LiveDot } from '@/components/LiveDot';
import { colors } from '@/theme/colors';
import { fonts, fontSizes, letterSpacings } from '@/theme/typography';
import type { CalendarEvent } from '@/storage/EventsRepository';

const DOT_COLORS: Record<CalendarEvent['color'], string> = {
  cyan:   colors.cyan,
  violet: colors.violet,
  silver: colors.silver,
};

const DOT_SHADOWS: Record<CalendarEvent['color'], string> = {
  cyan:   'rgba(0,240,255,0.6)',
  violet: 'rgba(138,43,226,0.6)',
  silver: 'rgba(160,160,165,0.3)',
};

interface Props {
  events: CalendarEvent[];
}

export function CalendarCard({ events }: Props) {
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = events
    .filter((e) => e.date >= today)
    .slice(0, 4);

  return (
    <GlassCard style={styles.card}>
      {/* Label */}
      <View style={styles.labelRow}>
        <LiveDot />
        <Text style={styles.label}>CALENDAR</Text>
      </View>

      {upcoming.length === 0 ? (
        <Text style={styles.empty}>No upcoming events</Text>
      ) : (
        upcoming.map((event) => (
          <View key={event.id} style={styles.eventRow}>
            <View
              style={[
                styles.dot,
                {
                  backgroundColor: DOT_COLORS[event.color],
                  shadowColor: DOT_SHADOWS[event.color],
                },
              ]}
            />
            <View style={styles.eventInfo}>
              <Text style={styles.eventTitle} numberOfLines={1}>
                {event.title}
              </Text>
              <Text style={styles.eventMeta}>
                {event.date === today ? 'Today' : event.date}
                {event.time ? `  ${event.time}` : ''}
              </Text>
            </View>
          </View>
        ))
      )}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minHeight: 190,
    padding: 14,
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
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
    gap: 10,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 4,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 2,
  },
  eventInfo: {
    flex: 1,
  },
  eventTitle: {
    fontFamily: fonts.bodyMedium,
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  },
  eventMeta: {
    fontFamily: fonts.mono,
    fontSize: fontSizes.xxs,
    color: colors.textDim,
    letterSpacing: letterSpacings.wide,
    marginTop: 2,
  },
});
