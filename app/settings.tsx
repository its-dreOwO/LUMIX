import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { colors } from '@/theme/colors';
import { fonts, fontSizes } from '@/theme/typography';
import { GlassCard } from '@/components/GlassCard';

export default function SettingsScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </Pressable>
        <Text style={styles.title}>Settings</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionTitle}>Model</Text>
        <GlassCard style={styles.card} radius={20}>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Current Model</Text>
            <Text style={styles.rowValue}>Gemma 3n (4B)</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Precision</Text>
            <Text style={styles.rowValue}>INT4</Text>
          </View>
        </GlassCard>

        <Text style={styles.sectionTitle}>System</Text>
        <GlassCard style={styles.card} radius={20}>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Version</Text>
            <Text style={styles.rowValue}>1.0.0</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Device</Text>
            <Text style={styles.rowValue}>Android (Local)</Text>
          </View>
        </GlassCard>

        <View style={styles.footer}>
          <Text style={styles.footerText}>LUMIX v1.0.0</Text>
          <Text style={styles.footerSub}>Private & Local AI Assistant</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#080A12',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    gap: 16,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  backIcon: {
    color: colors.white,
    fontSize: 20,
  },
  title: {
    fontFamily: fonts.displayBold,
    fontSize: fontSizes['2xl'],
    color: colors.white,
  },
  content: {
    padding: 20,
    gap: 12,
  },
  sectionTitle: {
    fontFamily: fonts.displayBold,
    fontSize: fontSizes.sm,
    color: colors.cyan,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginTop: 12,
    marginLeft: 4,
  },
  card: {
    paddingVertical: 4,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  rowLabel: {
    fontFamily: fonts.body,
    fontSize: fontSizes.base,
    color: colors.textSecondary,
  },
  rowValue: {
    fontFamily: fonts.mono,
    fontSize: fontSizes.sm,
    color: colors.white,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginHorizontal: 20,
  },
  footer: {
    marginTop: 40,
    alignItems: 'center',
    opacity: 0.4,
  },
  footerText: {
    color: colors.white,
    fontFamily: fonts.displayBold,
    fontSize: fontSizes.sm,
  },
  footerSub: {
    color: colors.white,
    fontFamily: fonts.body,
    fontSize: 10,
    marginTop: 4,
  },
});
