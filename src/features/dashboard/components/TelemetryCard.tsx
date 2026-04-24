import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import * as Battery from 'expo-battery';
import * as Network from 'expo-network';
import { GlassCard } from '@/components/GlassCard';
import { LiveDot } from '@/components/LiveDot';
import { colors } from '@/theme/colors';
import { fonts, fontSizes, letterSpacings } from '@/theme/typography';

// ── Battery ring ─────────────────────────────────────────────────────────────

const RING_SIZE = 96;
const STROKE = 6;
const R = (RING_SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * R;

function BatteryRing({ level }: { level: number }) {
  const filled = CIRCUMFERENCE * (1 - level);
  return (
    <View style={styles.ringWrap}>
      <Svg width={RING_SIZE} height={RING_SIZE}>
        {/* Track */}
        <Circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={R}
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={STROKE}
          fill="none"
        />
        {/* Fill */}
        <Circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={R}
          stroke={colors.cyan}
          strokeWidth={STROKE}
          fill="none"
          strokeDasharray={`${CIRCUMFERENCE}`}
          strokeDashoffset={filled}
          strokeLinecap="round"
          rotation="-90"
          origin={`${RING_SIZE / 2}, ${RING_SIZE / 2}`}
        />
      </Svg>
      <View style={styles.ringCenter}>
        <Text style={styles.ringPct}>
          {Math.round(level * 100)}
          <Text style={styles.ringPctUnit}>%</Text>
        </Text>
        <Text style={styles.ringLbl}>BATTERY</Text>
      </View>
    </View>
  );
}

// ── Gauge bar ─────────────────────────────────────────────────────────────────

function GaugeBar({ label, value, unit }: { label: string; value: string; unit?: string }) {
  const numericPct = parseFloat(value) / 100;
  return (
    <View style={styles.gauge}>
      <View style={styles.gaugeHead}>
        <Text style={styles.gaugeLabel}>{label}</Text>
        <Text style={styles.gaugeVal}>{value}{unit}</Text>
      </View>
      <View style={styles.gaugeTrack}>
        <View style={[styles.gaugeFill, { width: `${Math.min(numericPct * 100, 100)}%` as any }]} />
      </View>
    </View>
  );
}

// ── Connectivity row ──────────────────────────────────────────────────────────

function ConnRow({ name, sub, active }: { name: string; sub: string; active: boolean }) {
  return (
    <View style={styles.connRow}>
      <View>
        <Text style={styles.connName}>{name}</Text>
        <Text style={styles.connSub}>{sub}</Text>
      </View>
      <View style={[styles.toggle, active && styles.toggleOn]}>
        <View style={[styles.knob, active && styles.knobOn]} />
      </View>
    </View>
  );
}

// ── Main card ─────────────────────────────────────────────────────────────────

interface TelemetryState {
  batteryLevel: number;
  batteryState: Battery.BatteryState;
  networkType: string;
  isConnected: boolean;
}

export function TelemetryCard() {
  const [state, setState] = useState<TelemetryState>({
    batteryLevel: 0.75,
    batteryState: Battery.BatteryState.UNPLUGGED,
    networkType: 'UNKNOWN',
    isConnected: false,
  });

  useEffect(() => {
    async function load() {
      try {
        const [level, battState, netState] = await Promise.all([
          Battery.getBatteryLevelAsync(),
          Battery.getBatteryStateAsync(),
          Network.getNetworkStateAsync(),
        ]);
        setState({
          batteryLevel: level,
          batteryState: battState,
          networkType: netState.type ?? 'UNKNOWN',
          isConnected: netState.isConnected ?? false,
        });
      } catch (e) {
        console.warn('[TelemetryCard] Failed to load telemetry:', e);
      }
    }
    load();
  }, []);

  const batteryPct = Math.round(state.batteryLevel * 100);
  const isCharging = state.batteryState === Battery.BatteryState.CHARGING;
  const isWifi = state.networkType === Network.NetworkStateType.WIFI;
  const isCellular = state.networkType === Network.NetworkStateType.CELLULAR;

  return (
    <GlassCard style={styles.card}>
      {/* Label */}
      <View style={styles.labelRow}>
        <LiveDot />
        <Text style={styles.label}>TELEMETRY</Text>
      </View>

      {/* Ring + gauges row */}
      <View style={styles.telemetryRow}>
        <BatteryRing level={state.batteryLevel} />

        <View style={styles.gauges}>
          <GaugeBar label="BATTERY" value={String(batteryPct)} unit="%" />
          <GaugeBar
            label="STATUS"
            value={isCharging ? '100' : String(batteryPct)}
            unit={isCharging ? ' CHG' : '%'}
          />
        </View>
      </View>

      {/* Connectivity */}
      <View style={styles.connectivity}>
        <ConnRow
          name="Wi-Fi"
          sub={isWifi && state.isConnected ? 'CONNECTED' : 'DISCONNECTED'}
          active={isWifi && state.isConnected}
        />
        <ConnRow
          name="Mobile Data"
          sub={isCellular && state.isConnected ? 'CONNECTED' : 'DISCONNECTED'}
          active={isCellular && state.isConnected}
        />
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 240,
    padding: 16,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 14,
  },
  label: {
    fontFamily: fonts.mono,
    fontSize: fontSizes.xxs,
    color: colors.textDim,
    letterSpacing: letterSpacings.wider,
  },
  telemetryRow: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'center',
    marginBottom: 14,
  },
  ringWrap: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  ringCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringPct: {
    fontFamily: fonts.displayLight,
    fontSize: fontSizes['2xl'],
    color: colors.textPrimary,
    letterSpacing: letterSpacings.tight,
  },
  ringPctUnit: {
    fontSize: fontSizes.md,
    color: colors.silver,
  },
  ringLbl: {
    fontFamily: fonts.mono,
    fontSize: 7.5,
    color: colors.silver,
    letterSpacing: letterSpacings.wider,
    marginTop: 2,
  },
  gauges: {
    flex: 1,
    gap: 10,
  },
  gauge: {
    gap: 4,
  },
  gaugeHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  gaugeLabel: {
    fontFamily: fonts.mono,
    fontSize: fontSizes.xxs,
    color: colors.silver,
    letterSpacing: letterSpacings.wide,
  },
  gaugeVal: {
    fontFamily: fonts.monoMedium,
    fontSize: fontSizes.xxs,
    color: colors.textPrimary,
  },
  gaugeTrack: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  gaugeFill: {
    height: '100%',
    backgroundColor: colors.cyan,
    borderRadius: 2,
    shadowColor: colors.cyan,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
  },
  connectivity: {
    gap: 8,
  },
  connRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  connName: {
    fontFamily: fonts.display,
    fontSize: fontSizes.sm,
    color: colors.textPrimary,
  },
  connSub: {
    fontFamily: fonts.mono,
    fontSize: fontSizes.xxs,
    color: colors.silver,
    letterSpacing: letterSpacings.wide,
    marginTop: 1,
  },
  toggle: {
    width: 34,
    height: 18,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
  },
  toggleOn: {
    backgroundColor: 'rgba(0,240,255,0.2)',
    borderColor: 'rgba(0,240,255,0.4)',
  },
  knob: {
    position: 'absolute',
    left: 1,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.silver,
    top: 1,
  },
  knobOn: {
    left: 17,
    backgroundColor: colors.cyan,
  },
});
