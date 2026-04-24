import React, { useEffect, useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/theme/colors';
import { fonts, fontSizes, letterSpacings } from '@/theme/typography';
import { getLocation } from '@/services/LocationService';
import { fetchWeather } from '@/services/OpenMeteoService';
import { getNotes } from '@/storage/NotesRepository';
import { getEvents } from '@/storage/EventsRepository';
import type { WeatherData } from '@/services/OpenMeteoService';
import type { Note } from '@/storage/NotesRepository';
import type { CalendarEvent } from '@/storage/EventsRepository';
import { WeatherCard } from './components/WeatherCard';
import { CalendarCard } from './components/CalendarCard';
import { NotesCard } from './components/NotesCard';
import { BriefingCard } from './components/BriefingCard';
import { TelemetryCard } from './components/TelemetryCard';

export function DashboardScreen() {
  const insets = useSafeAreaInsets();

  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [notes, setNotes] = useState<Note[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    // Weather + location
    try {
      const coords = await getLocation();
      if (coords) {
        const w = await fetchWeather(coords.lat, coords.lon);
        setWeather(w);
      }
    } catch (e) {
      console.warn('[Dashboard] Weather fetch failed:', e);
    } finally {
      setWeatherLoading(false);
    }

    // Notes + events from local DB
    try {
      const [n, e] = await Promise.all([getNotes(), getEvents()]);
      setNotes(n);
      setEvents(e);
    } catch (e) {
      console.warn('[Dashboard] DB load failed:', e);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setWeatherLoading(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  // TopNav sits at top:52, pill ~44px tall + status row ~20px = ~116px clearance needed
  const topClearance = insets.top + 116;

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: topClearance }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.cyan}
            colors={[colors.cyan]}
          />
        }
      >
        {/* Screen title */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>DASHBOARD</Text>
          <Text style={styles.headerSub}>LIVE OVERVIEW</Text>
        </View>

        {/* Weather */}
        <WeatherCard weather={weather} loading={weatherLoading} />

        {/* Calendar + Notes side by side */}
        <View style={styles.pair}>
          <CalendarCard events={events} />
          <NotesCard notes={notes} />
        </View>

        {/* Briefing */}
        <BriefingCard items={[]} />

        {/* Telemetry */}
        <TelemetryCard />
      </ScrollView>

      {/* Top fade — darkens content scrolling behind the TopNav pill */}
      <LinearGradient
        colors={['rgba(0,0,0,1)', 'rgba(0,0,0,0.85)', 'rgba(0,0,0,0)']}
        style={[styles.fadeTop, { height: topClearance }]}
        pointerEvents="none"
      />

      {/* Bottom fade — softens content at the screen edge */}
      <LinearGradient
        colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.9)', 'rgba(0,0,0,1)']}
        style={[styles.fadeBottom, { paddingBottom: insets.bottom }]}
        pointerEvents="none"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg0,
  },
  content: {
    paddingHorizontal: 14,
    paddingBottom: 100,
    gap: 12,
  },
  fadeTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  fadeBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
  },
  header: {
    marginBottom: 4,
  },
  headerTitle: {
    fontFamily: fonts.mono,
    fontSize: fontSizes.xxs,
    color: colors.textDim,
    letterSpacing: letterSpacings.widest,
  },
  headerSub: {
    fontFamily: fonts.mono,
    fontSize: fontSizes.xxs,
    color: colors.cyan,
    letterSpacing: letterSpacings.widest,
    opacity: 0.6,
    marginTop: 2,
  },
  pair: {
    flexDirection: 'row',
    gap: 12,
  },
});
