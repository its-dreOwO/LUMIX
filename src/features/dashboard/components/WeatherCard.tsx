import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Defs, LinearGradient as SvgLinearGradient, Stop, Text as SvgText } from 'react-native-svg';
import { GlassCard } from '@/components/GlassCard';
import { LiveDot } from '@/components/LiveDot';
import { colors } from '@/theme/colors';
import { fonts, fontSizes, letterSpacings } from '@/theme/typography';
import type { WeatherData, WeatherVariant } from '@/services/OpenMeteoService';

const VARIANT_GRADIENTS: Record<WeatherVariant, [string, string, string]> = {
  sun:  ['rgba(255,180,80,0.14)',  'rgba(255,120,40,0.05)',  'rgba(255,255,255,0.02)'],
  smog: ['rgba(150,150,160,0.14)', 'rgba(100,100,110,0.05)', 'rgba(255,255,255,0.02)'],
  cold: ['rgba(100,180,255,0.14)', 'rgba(120,100,220,0.05)', 'rgba(255,255,255,0.02)'],
};

interface Props {
  weather: WeatherData | null;
  loading?: boolean;
}

export function WeatherCard({ weather, loading }: Props) {
  const variant: WeatherVariant = weather?.variant ?? 'smog';
  const gradient = VARIANT_GRADIENTS[variant];

  return (
    <GlassCard style={styles.card}>
      <LinearGradient
        colors={gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Label */}
      <View style={styles.labelRow}>
        <LiveDot />
        <Text style={styles.label}>WEATHER</Text>
      </View>

      {/* Temperature — top right */}
      <View style={styles.tempBlock}>
        <Text style={styles.tempBig}>
          {weather ? `${weather.temp}°` : '--°'}
        </Text>
        <Text style={styles.tempSub}>CELSIUS</Text>
      </View>

      {/* Condition — middle-left, large gradient text via SVG */}
      <View style={styles.conditionBlock}>
        <Svg height={52} width={220}>
          <Defs>
            <SvgLinearGradient id="condGrad" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor="#00F0FF" />
              <Stop offset="1" stopColor="#8A2BE2" />
            </SvgLinearGradient>
          </Defs>
          <SvgText
            x="0"
            y="40"
            fill="url(#condGrad)"
            fontSize={32}
            fontFamily={fonts.displayLight}
            letterSpacing={-0.5}
          >
            {weather?.condition ?? '—'}
          </SvgText>
        </Svg>
      </View>

      {/* Meta row */}
      <View style={styles.metaRow}>
        <Text style={styles.metaItem}>
          HUMIDITY <Text style={styles.metaVal}>{weather ? `${weather.humidity}%` : '--'}</Text>
        </Text>
        <Text style={styles.metaItem}>
          WIND <Text style={styles.metaVal}>{weather ? `${weather.windSpeed} km/h` : '--'}</Text>
        </Text>
        <Text style={styles.metaItem}>
          FEELS <Text style={styles.metaVal}>{weather ? `${weather.feelsLike}°` : '--'}</Text>
        </Text>
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 190,
    padding: 16,
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
  tempBlock: {
    position: 'absolute',
    top: 16,
    right: 16,
    alignItems: 'flex-end',
  },
  tempBig: {
    fontFamily: fonts.displayLight,
    fontSize: fontSizes['4xl'],
    color: colors.textPrimary,
    letterSpacing: letterSpacings.tight,
    lineHeight: 40,
  },
  tempSub: {
    fontFamily: fonts.mono,
    fontSize: fontSizes.xxs,
    color: colors.silver,
    letterSpacing: letterSpacings.wide,
    marginTop: 4,
  },
  conditionBlock: {
    flex: 1,
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 36, // leave room for meta row
  },
  metaRow: {
    position: 'absolute',
    bottom: 14,
    left: 16,
    right: 16,
    flexDirection: 'row',
    gap: 14,
  },
  metaItem: {
    fontFamily: fonts.mono,
    fontSize: fontSizes.xxs,
    color: colors.silver,
    letterSpacing: letterSpacings.wide,
  },
  metaVal: {
    color: colors.textPrimary,
    fontFamily: fonts.monoMedium,
  },
});
