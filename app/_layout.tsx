import { useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { Slot, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';

import {
  SpaceGrotesk_300Light,
  SpaceGrotesk_400Regular,
  SpaceGrotesk_500Medium,
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
} from '@expo-google-fonts/space-grotesk';
import {
  Inter_300Light,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
} from '@expo-google-fonts/inter';
import {
  JetBrainsMono_400Regular,
  JetBrainsMono_500Medium,
} from '@expo-google-fonts/jetbrains-mono';

import { ParticleField, type ParticleFieldRef } from '@/components/ParticleField';
import { TopNav } from '@/components/TopNav';
import { ParticleProvider } from '@/state/particleContext';
import { colors } from '@/theme/colors';

SplashScreen.preventAutoHideAsync();

function ScreenSlot() {
  const pathname = usePathname();
  const opacity = useSharedValue(1);
  const translateY = useSharedValue(0);

  useEffect(() => {
    // Fade + slight slide out, then snap back and fade in
    opacity.value = 0;
    translateY.value = 6;
    opacity.value = withTiming(1, { duration: 280, easing: Easing.out(Easing.cubic) });
    translateY.value = withTiming(0, { duration: 280, easing: Easing.out(Easing.cubic) });
  }, [pathname]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={[StyleSheet.absoluteFill, animStyle]}>
      <Slot />
    </Animated.View>
  );
}

export default function RootLayout() {
  const particleRef = useRef<ParticleFieldRef>(null);

  const [fontsLoaded, fontError] = useFonts({
    SpaceGrotesk_300Light,
    SpaceGrotesk_400Regular,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
    Inter_300Light,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    JetBrainsMono_400Regular,
    JetBrainsMono_500Medium,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) SplashScreen.hideAsync();
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <ParticleProvider value={particleRef}>
      <View style={styles.root}>
        <StatusBar style="light" backgroundColor="transparent" translucent />
        {/* Particle canvas lives here so it persists across screen changes */}
        <ParticleField ref={particleRef} />
        {/* Screen content — animated on route change */}
        <ScreenSlot />
        {/* Top nav overlay — always visible */}
        <TopNav />
      </View>
    </ParticleProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg0,
  },
});
