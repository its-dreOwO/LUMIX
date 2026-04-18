import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { colors } from '@/theme/colors';
import { fonts, fontSizes, letterSpacings } from '@/theme/typography';

const TABS = [
  { label: 'NEXUS', href: '/' },
  { label: 'DASHBOARD', href: '/dashboard' },
] as const;

export function TopNav() {
  const router = useRouter();
  const pathname = usePathname();

  const navigate = (href: string) => {
    router.replace(href as any);
  };

  return (
    <View style={styles.wrapper} pointerEvents="box-none">
      <View style={styles.pill}>
        {TABS.map((tab) => {
          const active = pathname === tab.href || (tab.href === '/' && pathname === '');
          return (
            <Pressable
              key={tab.href}
              onPress={() => navigate(tab.href)}
              style={[styles.tab, active && styles.tabActive]}
            >
              <Text style={[styles.label, active && styles.labelActive]}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    top: 52,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  pill: {
    flexDirection: 'row',
    gap: 2,
    padding: 4,
    borderRadius: 100,
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 100,
  },
  tabActive: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    shadowColor: colors.cyan,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    // Android glow via elevation isn't great — use borderColor trick
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  label: {
    fontFamily: fonts.displayMedium,
    fontSize: fontSizes.xxs,
    letterSpacing: letterSpacings.widest * 0.6, // 0.18em ≈ letterSpacing: 1.7
    color: colors.silver,
    textTransform: 'uppercase',
  },
  labelActive: {
    color: colors.white,
  },
});
