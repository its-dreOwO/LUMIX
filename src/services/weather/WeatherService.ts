export type WeatherCondition = 'sun' | 'smog' | 'cold' | 'rain';

export interface CurrentWeather {
  tempC: number;
  feelsLikeC: number;
  condition: WeatherCondition;
  conditionLabel: string;
  windKph: number;
  humidity: number;
  uvIndex: number;
}

export interface WeatherService {
  getCurrent(lat: number, lon: number): Promise<CurrentWeather>;
}
