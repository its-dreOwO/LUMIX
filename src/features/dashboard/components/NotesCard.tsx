import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { GlassCard } from '@/components/GlassCard';
import { LiveDot } from '@/components/LiveDot';
import { colors } from '@/theme/colors';
import { fonts, fontSizes, letterSpacings } from '@/theme/typography';
import type { Note } from '@/storage/NotesRepository';

interface Props {
  notes: Note[];
}

export function NotesCard({ notes }: Props) {
  const recent = notes.slice(0, 4);

  return (
    <GlassCard style={styles.card}>
      {/* Label */}
      <View style={styles.labelRow}>
        <LiveDot />
        <Text style={styles.label}>NOTES</Text>
      </View>

      {recent.length === 0 ? (
        <Text style={styles.empty}>No notes yet</Text>
      ) : (
        recent.map((note) => (
          <View key={note.id} style={styles.noteRow}>
            <Text style={styles.noteTitle} numberOfLines={1}>
              {note.title}
            </Text>
            <Text style={styles.noteBody} numberOfLines={1}>
              {note.body}
            </Text>
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
  noteRow: {
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  noteTitle: {
    fontFamily: fonts.bodyMedium,
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  },
  noteBody: {
    fontFamily: fonts.body,
    fontSize: fontSizes.xxs,
    color: colors.textDim,
    marginTop: 2,
  },
});
