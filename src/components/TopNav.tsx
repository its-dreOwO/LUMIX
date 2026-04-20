import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { colors } from '@/theme/colors';
import { fonts, fontSizes, letterSpacings } from '@/theme/typography';
import { GradientBorder } from '@/components/GradientBorder';
import { useLLMStore } from '@/state/llmStore';

const TABS = [
  { label: 'NEXUS', href: '/' },
  { label: 'DASHBOARD', href: '/dashboard' },
] as const;

export function TopNav() {
  const router = useRouter();
  const pathname = usePathname();
  const { status, modelName } = useLLMStore();

  const navigate = (href: string) => {
    router.replace(href as any);
  };

  const getStatusText = () => {
    switch (status) {
      case 'searching':
        return 'searching model…';
      case 'copying':
        return 'copying model…';
      case 'loading':
        return 'loading model…';
      case 'ready':
        return modelName;
      case 'unavailable':
        return 'llm unavailable';
      case 'error':
        return 'model error';
      case 'idle':
      default:
        return null;
    }
  };

  const statusText = getStatusText();

  return (
    <View style={styles.wrapper} pointerEvents="box-none">
      {statusText && <Text style={styles.statusText}>{statusText}</Text>}
      <GradientBorder radius={100} innerBg="rgba(8,10,18,0.55)">
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
      </GradientBorder>
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
  statusText: {
    fontFamily: fonts.mono,
    fontSize: fontSizes.xxs,
    color: colors.cyan,
    opacity: 0.7,
    letterSpacing: 1,
    marginBottom: 6,
    textTransform: 'uppercase',
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

