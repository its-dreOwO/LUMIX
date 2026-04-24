import { useState, useEffect, useRef } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, usePathname } from 'expo-router';
import * as Network from 'expo-network';
import { colors } from '@/theme/colors';
import { fonts, fontSizes, letterSpacings } from '@/theme/typography';
import { GradientBorder } from '@/components/GradientBorder';
import { useLLMStore } from '@/state/llmStore';
import { useNexusStore } from '@/state/nexusStore';

const TABS = [
  { label: 'NEXUS', href: '/' },
  { label: 'DASHBOARD', href: '/dashboard' },
] as const;

export function TopNav() {
  const router = useRouter();
  const pathname = usePathname();
  const { status, modelName } = useLLMStore();
  const { lumenMode } = useNexusStore();
  
const [isConnected, setIsConnected] = useState(true);
  const [networkToast, setNetworkToast] = useState<'connected' | 'disconnected' | null>(null);
  const isInitialMount = useRef(true);

  useEffect(() => {
    let mounted = true;
    let fallbackTimer: NodeJS.Timeout;

    const checkNetwork = async () => {
      try {
        const net = await Network.getNetworkStateAsync();
        const currentConnected = net.isConnected ?? false;
        
        if (mounted) {
          setIsConnected((prev) => {
            if (!isInitialMount.current && prev !== currentConnected) {
              setNetworkToast(currentConnected ? 'connected' : 'disconnected');
              clearTimeout(fallbackTimer);
              fallbackTimer = setTimeout(() => {
                if (mounted) setNetworkToast(null);
              }, 3000);
            }
            return currentConnected;
          });
          isInitialMount.current = false;
        }
      } catch {
        // Assume connected or fallback gracefully if permission fails
      }
    };
    checkNetwork();
    const interval = setInterval(checkNetwork, 3000);
    return () => {
      mounted = false;
      clearInterval(interval);
      clearTimeout(fallbackTimer);
    };
  }, []);

  const navigate = (href: string) => {
    router.replace(href as any);
  };

  const getStatusText = () => {
    if (networkToast) return networkToast;

    switch (status) {
      case 'searching':
        return 'scanning for model…';
      case 'copying':
        return `copying ${modelName ?? 'model'}…`;
      case 'loading':
        return `loading ${modelName ?? 'model'}…`;
      case 'ready':
        return modelName ?? 'ready';
      case 'unavailable':
        return modelName ?? 'llm unavailable';
      case 'error':
        return `error · ${modelName ?? 'model'}`;
      case 'idle':
      default:
        return null;
    }
  };

  const statusText = getStatusText();

  const borderColors = isConnected
    ? undefined // use default internal colors
    : ['rgba(255,255,255,0.7)', 'rgba(0,180,255,0.3)', 'rgba(255,255,255,0.15)'] as const;

  return (
    <View style={styles.wrapper} pointerEvents="box-none">
      {statusText && (
        <View style={styles.statusRow}>
          <Text style={styles.statusText}>{statusText}</Text>
          {lumenMode && <Ionicons name="wifi" size={10} color={colors.cyan} style={styles.wifiIcon} />}
        </View>
      )}
      <GradientBorder radius={100} innerBg="rgba(8,10,18,0.55)" colors={borderColors}>
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
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  wifiIcon: {
    opacity: 0.7,
  },
  statusText: {
    fontFamily: fonts.mono,
    fontSize: fontSizes.xxs,
    color: colors.cyan,
    opacity: 0.7,
    letterSpacing: 1,
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

