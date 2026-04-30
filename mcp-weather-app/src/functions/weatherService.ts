// Weather service types matching the C# WeatherResult record
export interface WeatherResult {
  Location: string;
  Condition: string;
  TemperatureC: number | null;
  TemperatureF: number | null;
  HumidityPercent: number | null;
  WindKph: number | null;
  Wind: string;
  ReportedAtUtc: string;
  Source: string;
}

// Weather service types matching the C# WeatherError record
export interface WeatherError {
  Location: string;
  Error: string;
  Source: string;
}

// Normalize location input
function normalizeLocation(location: string): string {
  return !location || location.trim() === "" ? "Seattle, WA" : location.trim();
}

// Simple geocoding to get coordinates from city name using Open-Meteo
async function geocodeAsync(location: string): Promise<{ lat: number; lon: number; canonical: string } | null> {
  try {
    const encoded = encodeURIComponent(location);
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encoded}&count=1&language=en&format=json`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (!data.results || data.results.length === 0) {
      return null;
    }
    
    const match = data.results[0];
    const lat = match.latitude;
    const lon = match.longitude;
    const name = match.name || location;
    const admin1 = match.admin1 || null;
    const country = match.country || null;
    const canonical = [name, admin1, country].filter(s => s && s.trim() !== "").join(", ");
    
    return { lat, lon, canonical: canonical || location };
  } catch {
    return null;
  }
}

// Get latest observation from Open-Meteo
async function getLatestObservationAsync(lat: number, lon: number): Promise<Record<string, unknown> | null> {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m,weather_code`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.current) {
      return data.current;
    }
    return null;
  } catch {
    return null;
  }
}

// Map weather code to condition string
function mapWeatherCode(code: number): string {
  switch (code) {
    case 0: return "Clear sky";
    case 1: return "Mainly clear";
    case 2: return "Partly cloudy";
    case 3: return "Overcast";
    case 45:
    case 48: return "Fog";
    case 51:
    case 53:
    case 55: return "Drizzle";
    case 56:
    case 57: return "Freezing drizzle";
    case 61:
    case 63:
    case 65: return "Rain";
    case 66:
    case 67: return "Freezing rain";
    case 71:
    case 73:
    case 75: return "Snowfall";
    case 77: return "Snow grains";
    case 80:
    case 81:
    case 82: return "Rain showers";
    case 85:
    case 86: return "Snow showers";
    case 95: return "Thunderstorm";
    case 96:
    case 99: return "Thunderstorm with hail";
    default: return "Unknown";
  }
}

// Convert degrees to cardinal direction
function degToCardinal(deg: number): string {
  const dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  return dirs[Math.round(((deg % 360) / 22.5)) % 16];
}

// Parse observation data to WeatherResult
function parseObservation(props: Record<string, unknown>, location: string): WeatherResult {
  const tempC = typeof props.temperature_2m === "number" ? props.temperature_2m : null;
  const tempF = tempC !== null ? Math.round(tempC * 1.8 + 32) : null;
  
  const condition = typeof props.weather_code === "number" 
    ? mapWeatherCode(props.weather_code) 
    : "Unknown";
  
  const humidity = typeof props.relative_humidity_2m === "number" 
    ? Math.round(props.relative_humidity_2m) 
    : null;
  
  const wind = typeof props.wind_speed_10m === "number" ? props.wind_speed_10m : null;
  const windKph = wind !== null ? Math.round(wind) : null;
  
  const windDirDeg = typeof props.wind_direction_10m === "number" ? props.wind_direction_10m : null;
  const windDir = windDirDeg !== null ? ` ${degToCardinal(windDirDeg)}` : "";
  
  const reportedTime = typeof props.time === "string" 
    ? new Date(props.time) 
    : new Date();
  
  return {
    Location: location,
    Condition: condition,
    TemperatureC: tempC !== null ? Math.round(tempC) : null,
    TemperatureF: tempF,
    HumidityPercent: humidity,
    WindKph: windKph,
    Wind: windKph !== null ? `${windKph} km/h${windDir}` : "—",
    ReportedAtUtc: reportedTime.toISOString().replace("T", " ").slice(0, -5) + "Z",
    Source: "open-meteo"
  };
}

/**
 * WeatherService class for fetching weather data from Open-Meteo API.
 * Matches the C# WeatherService implementation.
 */
export class WeatherService {
  /**
   * Get current weather for a location.
   * @param location - City name, address, or zip code
   * @returns WeatherResult on success, WeatherError on failure
   */
  async getCurrentWeatherAsync(location: string): Promise<WeatherResult | WeatherError> {
    const normalized = normalizeLocation(location);
    
    const coords = await geocodeAsync(normalized);
    if (!coords) {
      return {
        Location: normalized,
        Error: "Could not find this location. Try a city, address, or zip code.",
        Source: "open-meteo"
      };
    }
    
    const { lat, lon, canonical } = coords;
    
    const observation = await getLatestObservationAsync(lat, lon);
    if (!observation) {
      return {
        Location: canonical,
        Error: "Could not retrieve current observations.",
        Source: "open-meteo"
      };
    }
    
    return parseObservation(observation, canonical);
  }
}

// Default instance for convenience
export const weatherService = new WeatherService();
