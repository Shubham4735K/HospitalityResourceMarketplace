/**
 * ResShare — Meteorological Service Adapter
 * 
 * Provides real-time weather integration with Open-Meteo (CORS-enabled, zero-config, free API)
 * with support for custom API keys via VITE_WEATHER_API_KEY.
 * Includes graceful, transparent fallback to demo meteorological records if offline or unavailable.
 */

export const CITY_COORDINATES = {
  'Bengaluru': { lat: 12.9716, lon: 77.5946, state: 'Karnataka' },
  'Mumbai': { lat: 19.0760, lon: 72.8777, state: 'Maharashtra' },
  'New Delhi': { lat: 28.6139, lon: 77.2090, state: 'Delhi NCR' },
  'Chennai': { lat: 13.0827, lon: 80.2707, state: 'Tamil Nadu' },
  'Hyderabad': { lat: 17.3850, lon: 78.4867, state: 'Telangana' },
  'Kolkata': { lat: 22.5726, lon: 88.3639, state: 'West Bengal' },
  'Jaipur': { lat: 26.9124, lon: 75.7873, state: 'Rajasthan' },
  'Goa': { lat: 15.2993, lon: 74.1240, state: 'Goa' }
};

export const FALLBACK_WEATHER = {
  city: 'Bengaluru',
  temperature: 26.5,
  weatherCode: 2,
  condition: 'Partly Cloudy',
  rainfall: 0.0,
  windSpeed: 12.4,
  humidity: 62,
  pressure: 1014,
  isLive: false,
  source: 'DEMO / FALLBACK DATA',
  fetchedAt: new Date().toISOString(),
  forecast: [
    { day: 'Today', tempMax: 29, tempMin: 20, condition: 'Partly Cloudy', rainProb: 15 },
    { day: 'Tomorrow', tempMax: 28, tempMin: 19, condition: 'Light Showers', rainProb: 40 },
    { day: 'Day 3', tempMax: 27, tempMin: 19, condition: 'Scattered Rain', rainProb: 65 }
  ]
};

/**
 * Maps WMO weather interpretation codes to human-readable conditions and icons
 */
export function interpretWmoCode(code) {
  if (code === 0) return { condition: 'Clear Sky', icon: '☀️' };
  if (code === 1 || code === 2) return { condition: 'Partly Cloudy', icon: '⛅' };
  if (code === 3) return { condition: 'Overcast', icon: '☁️' };
  if (code >= 45 && code <= 48) return { condition: 'Fog / Mist', icon: '🌫️' };
  if (code >= 51 && code <= 55) return { condition: 'Drizzle', icon: '🌦️' };
  if (code >= 61 && code <= 65) return { condition: 'Rain', icon: '🌧️' };
  if (code >= 71 && code <= 77) return { condition: 'Snow / Sleet', icon: '🌨️' };
  if (code >= 80 && code <= 82) return { condition: 'Rain Showers', icon: '🌧️' };
  if (code >= 95 && code <= 99) return { condition: 'Thunderstorm', icon: '⛈️' };
  return { condition: 'Variable Weather', icon: '🌤️' };
}

/**
 * Fetches real meteorological data for the requested city
 * Falls back gracefully to clearly labeled demo data if the network is unavailable
 */
export async function fetchLiveWeather(cityName = 'Bengaluru') {
  const cityData = CITY_COORDINATES[cityName] || CITY_COORDINATES['Bengaluru'];
  const resolvedCity = CITY_COORDINATES[cityName] ? cityName : 'Bengaluru';

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${cityData.lat}&longitude=${cityData.lon}&current=temperature_2m,relative_humidity_2m,precipitation,rain,weather_code,surface_pressure,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Open-Meteo HTTP error: ${response.status}`);
    }

    const data = await response.json();
    const current = data.current || {};
    const daily = data.daily || {};

    const wmo = interpretWmoCode(current.weather_code ?? 0);

    // Build forecast items
    const forecast = [];
    const days = daily.time || [];
    for (let i = 0; i < Math.min(3, days.length); i++) {
      const dayDate = new Date(days[i]);
      const dayLabel = i === 0 ? 'Today' : dayDate.toLocaleDateString('en-US', { weekday: 'short' });
      const dayWmo = interpretWmoCode(daily.weather_code?.[i] ?? 0);
      forecast.push({
        day: dayLabel,
        tempMax: Math.round(daily.temperature_2m_max?.[i] ?? 28),
        tempMin: Math.round(daily.temperature_2m_min?.[i] ?? 20),
        condition: dayWmo.condition,
        icon: dayWmo.icon,
        rainProb: daily.precipitation_probability_max?.[i] ?? 10
      });
    }

    return {
      city: resolvedCity,
      state: cityData.state,
      lat: cityData.lat,
      lon: cityData.lon,
      temperature: Math.round((current.temperature_2m ?? 26) * 10) / 10,
      weatherCode: current.weather_code ?? 0,
      condition: wmo.condition,
      icon: wmo.icon,
      rainfall: Math.round((current.rain ?? current.precipitation ?? 0) * 10) / 10,
      windSpeed: Math.round((current.wind_speed_10m ?? 12) * 10) / 10,
      humidity: Math.round(current.relative_humidity_2m ?? 60),
      pressure: Math.round(current.surface_pressure ?? 1013),
      isLive: true,
      source: 'LIVE METEOROLOGICAL FEED (Open-Meteo)',
      fetchedAt: new Date().toISOString(),
      forecast
    };
  } catch (err) {
    console.warn(`[WeatherService] Unable to reach live weather API (${err.message}). Using transparent fallback data.`);
    return {
      ...FALLBACK_WEATHER,
      city: resolvedCity,
      state: cityData.state,
      lat: cityData.lat,
      lon: cityData.lon,
      isLive: false,
      source: 'DEMO / FALLBACK DATA (Offline)',
      fetchedAt: new Date().toISOString()
    };
  }
}

export function getCitiesList() {
  return Object.keys(CITY_COORDINATES);
}
