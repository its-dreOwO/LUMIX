import type { WeatherService, CurrentWeather, WeatherCondition } from './WeatherService';

// WMO Weather Interpretation Codes → condition
// https://open-meteo.com/en/docs#weathervariables
function wmoToCondition(code: number): [WeatherCondition, string] {
  if (code === 0 || code === 1) return ['sun', 'Clear'];
  if (code === 2 || code === 3) return ['smog', 'Cloudy'];
  if (code >= 45 && code <= 48) return ['smog', 'Foggy'];
  if (code >= 51 && code <= 67) return ['rain', 'Drizzle'];
  if (code >= 71 && code <= 77) return ['cold', 'Snow'];
  if (code >= 80 && code <= 82) return ['rain', 'Showers'];
  if (code >= 85 && code <= 86) return ['cold', 'Snow showers'];
  if (code >= 95 && code <= 99) return ['smog', 'Thunderstorm'];
  return ['smog', 'Overcast'];
}

export class OpenMeteoService implements WeatherService {
  async getCurrent(lat: number, lon: number): Promise<CurrentWeather> {
    const url =
      `https://api.open-meteo.com/v1/forecast` +
      `?latitude=${lat}&longitude=${lon}` +
      `&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m,relative_humidity_2m,uv_index` +
      `&wind_speed_unit=kmh&temperature_unit=celsius`;

    const res = await fetch(url);
    if (!res.ok) throw new Error(`Open-Meteo error ${res.status}`);
    const data = await res.json();
    const c = data.current;

    const [condition, conditionLabel] = wmoToCondition(c.weather_code);

    return {
      tempC: Math.round(c.temperature_2m),
      feelsLikeC: Math.round(c.apparent_temperature),
      condition,
      conditionLabel,
      windKph: Math.round(c.wind_speed_10m),
      humidity: Math.round(c.relative_humidity_2m),
      uvIndex: Math.round(c.uv_index ?? 0),
    };
  }
}
