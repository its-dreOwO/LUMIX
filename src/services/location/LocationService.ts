import * as Location from 'expo-location';
import * as SecureStore from 'expo-secure-store';

const CACHE_KEY = 'lumix_last_location';

export interface Coords {
  lat: number;
  lon: number;
}

export async function requestAndGetLocation(): Promise<Coords | null> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') return getCachedLocation();

  const loc = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });

  const coords: Coords = {
    lat: loc.coords.latitude,
    lon: loc.coords.longitude,
  };

  await SecureStore.setItemAsync(CACHE_KEY, JSON.stringify(coords));
  return coords;
}

export async function getCachedLocation(): Promise<Coords | null> {
  const raw = await SecureStore.getItemAsync(CACHE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Coords;
  } catch {
    return null;
  }
}
