// TODO (Phase 4): Full dashboard implementation.
// Reference: project/LUMIX.html — .dashboard, .dash-grid, card components
// Cards to build: WeatherCard, CalendarCard, NotesCard, BriefingCard, TelemetryCard

import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { colors } from '@/theme/colors';

export function DashboardScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.placeholder}>DASHBOARD — Phase 4</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholder: {
    color: colors.violet,
    fontFamily: 'JetBrainsMono',
    fontSize: 12,
    letterSpacing: 4,
  },
});
