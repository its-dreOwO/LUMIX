import React from 'react';
import { ScrollView, Pressable, Text, StyleSheet, View } from 'react-native';
import { colors } from '@/theme/colors';
import { fonts, fontSizes } from '@/theme/typography';

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
}

export function QuickSuggest({ onSelect, chips = DEFAULT_CHIPS }: QuickSuggestProps) {
  return (
    <View style={styles.wrapper}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {chips.map((chip) => (
          <Pressable
            key={chip}
            onPress={() => onSelect(chip)}
            style={({ pressed }) => [styles.chip, pressed && styles.chipPressed]}
          >
            <Text style={styles.chipText}>{chip}</Text>
          </Pressable>
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
    bottom: 108,
  },
  row: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 14,
    paddingBottom: 2,
  },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 11,
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    flexShrink: 0,
  },
  chipPressed: {
    backgroundColor: 'rgba(0,240,255,0.08)',
    borderColor: 'rgba(0,240,255,0.35)',
  },
  chipText: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: 'rgba(255,255,255,0.8)',
    whiteSpace: 'nowrap',
  },
});
