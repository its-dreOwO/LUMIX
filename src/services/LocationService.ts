/**
 * LocationService — Coarse GPS with a 10-minute cache in SecureStore.
 * Requests only WHEN_IN_USE accuracy to minimise battery impact.
 */

import * as Location from 'expo-location';
import * as SecureStore from 'expo-secure-store';

const CACHE_KEY = 'lumix_location';
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

export interface Coords {
  lat: number;
  lon: number;
  cachedAt: number;
}

export async function getLocation(): Promise<Coords | null> {
  // Try cache first
  try {
    const raw = await SecureStore.getItemAsync(CACHE_KEY);
    if (raw) {
      const cached: Coords = JSON.parse(raw);
      if (Date.now() - cached.cachedAt < CACHE_TTL_MS) {
        return cached;
      }
    }
  } catch { /* cache miss — fall through */ }

  // Request fresh location
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return null;

    const loc = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Low, // coarse — faster, less battery
    });

    const coords: Coords = {
      lat: loc.coords.latitude,
      lon: loc.coords.longitude,
      cachedAt: Date.now(),
    };

    await SecureStore.setItemAsync(CACHE_KEY, JSON.stringify(coords));
    return coords;
  } catch (e) {
    console.warn('[LocationService] Failed to get location:', e);
    return null;
  }
}
