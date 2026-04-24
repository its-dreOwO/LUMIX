/**
 * OpenMeteoService — Fetches current weather from api.open-meteo.com (no API key).
 * Parses WMO weather codes into human-readable conditions + visual variants.
 */

export type WeatherVariant = 'sun' | 'smog' | 'cold';

export interface WeatherData {
  temp: number;          // °C, rounded
  feelsLike: number;     // °C, rounded
  humidity: number;      // %
  windSpeed: number;     // km/h, rounded
  condition: string;     // human-readable label
  variant: WeatherVariant;
  wmoCode: number;
}

// WMO 4677 weather interpretation codes
const WMO_MAP: Record<number, { label: string; variant: WeatherVariant }> = {
  0:  { label: 'Clear sky',            variant: 'sun'  },
  1:  { label: 'Mainly clear',         variant: 'sun'  },
  2:  { label: 'Partly cloudy',        variant: 'sun'  },
  3:  { label: 'Overcast',             variant: 'smog' },
  45: { label: 'Foggy',               variant: 'smog' },
  48: { label: 'Icy fog',             variant: 'smog' },
  51: { label: 'Light drizzle',        variant: 'cold' },
  53: { label: 'Drizzle',             variant: 'cold' },
  55: { label: 'Heavy drizzle',        variant: 'cold' },
  61: { label: 'Light rain',           variant: 'cold' },
  63: { label: 'Rain',                 variant: 'cold' },
  65: { label: 'Heavy rain',           variant: 'cold' },
  71: { label: 'Light snow',           variant: 'cold' },
  73: { label: 'Snow',                 variant: 'cold' },
  75: { label: 'Heavy snow',           variant: 'cold' },
  77: { label: 'Snow grains',          variant: 'cold' },
  80: { label: 'Light showers',        variant: 'cold' },
  81: { label: 'Rain showers',         variant: 'cold' },
  82: { label: 'Violent showers',      variant: 'cold' },
  85: { label: 'Snow showers',         variant: 'cold' },
  86: { label: 'Heavy snow showers',   variant: 'cold' },
  95: { label: 'Thunderstorm',         variant: 'cold' },
  96: { label: 'Thunderstorm w/ hail', variant: 'cold' },
  99: { label: 'Severe thunderstorm',  variant: 'cold' },
};

function parseWmo(code: number): { label: string; variant: WeatherVariant } {
  return WMO_MAP[code] ?? { label: 'Unknown', variant: 'smog' };
}

export async function fetchWeather(lat: number, lon: number): Promise<WeatherData> {
  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code` +
    `&wind_speed_unit=kmh&forecast_days=1`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Open-Meteo HTTP ${res.status}`);

  const json = await res.json();
  const c = json.current;

  const wmoCode: number = c.weather_code ?? 0;
  const { label, variant } = parseWmo(wmoCode);

  return {
    temp:      Math.round(c.temperature_2m ?? 0),
    feelsLike: Math.round(c.apparent_temperature ?? 0),
    humidity:  Math.round(c.relative_humidity_2m ?? 0),
    windSpeed: Math.round(c.wind_speed_10m ?? 0),
    condition: label,
    variant,
    wmoCode,
  };
}
