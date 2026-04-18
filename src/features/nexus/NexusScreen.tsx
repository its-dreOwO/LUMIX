// TODO (Phase 2): Full NEXUS screen implementation.
// Reference: project/LUMIX.html — .nexus, .orb-wrap, .transcript, .input-dock
// Components to build: Orb, PulseRing, MessageBubble, InputDock, QuickSuggest

import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { colors } from '@/theme/colors';

export function NexusScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.placeholder}>NEXUS — Phase 2</Text>
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
    color: colors.cyan,
    fontFamily: 'JetBrainsMono',
    fontSize: 12,
    letterSpacing: 4,
  },
});
