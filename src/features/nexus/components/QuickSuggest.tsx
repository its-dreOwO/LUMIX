import React from 'react';
import { ScrollView, Pressable, Text, StyleSheet, View } from 'react-native';
import { colors } from '@/theme/colors';
import { fonts, fontSizes } from '@/theme/typography';
import { GradientBorder } from '@/components/GradientBorder';

const DEFAULT_CHIPS = [
  "What's the weather?",
  'Set a reminder',
  'Tell me something',
  "What's on my calendar?",
  'Quick note',
];

interface QuickSuggestProps {
  onSelect: (text: string) => void;
  chips?: string[];
  bottomInset?: number;
}

export function QuickSuggest({
  onSelect,
  chips = DEFAULT_CHIPS,
  bottomInset = 0,
}: QuickSuggestProps) {
  return (
    <View style={[styles.wrapper, { bottom: 80 + bottomInset }]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {chips.map((chip) => (
          <GradientBorder key={chip} radius={100} innerBg="rgba(8,10,18,0.55)">
            <Pressable
              onPress={() => onSelect(chip)}
              style={({ pressed }) => [styles.chip, pressed && styles.chipPressed]}
            >
              <Text style={styles.chipText}>{chip}</Text>
            </Pressable>
          </GradientBorder>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 14,
    paddingBottom: 2,
  },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 11,
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    flexShrink: 0,
  },
  chipPressed: {
    backgroundColor: 'rgba(0,240,255,0.08)',
    borderColor: 'rgba(0,240,255,0.35)',
  },
  chipText: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: 'rgba(255,255,255,0.95)',
    whiteSpace: 'nowrap',
  },
});
