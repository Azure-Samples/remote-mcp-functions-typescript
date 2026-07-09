import { app, InvocationContext, arg } from '@azure/functions';
import { trace, SpanStatusCode } from '@opentelemetry/api';

interface WeatherResult {
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

interface WeatherError {
    Location: string;
    Error: string;
    Source: string;
}

function normalizeLocation(location: string): string {
    if (!location || location.trim() === '') {
        return 'Seattle, WA';
    }

    // Tolerate prompt-style values like "## Seattle" or "zipcode 98021".
    let normalized = location.trim().replace(/^#+\s*/, '');
    normalized = normalized.replace(/^zip\s*code\s*/i, '');
    return normalized;
}

async function geocodeUsZipAsync(zip: string): Promise<{ lat: number; lon: number; canonical: string } | null> {
    try {
        const response = await fetch(`https://api.zippopotam.us/us/${zip}`);
        if (!response.ok) {
            return null;
        }

        const data = (await response.json()) as {
            places?: Array<{
                latitude?: string;
                longitude?: string;
                'place name'?: string;
                state?: string;
            }>;
        };

        const place = data.places?.[0];
        if (!place?.latitude || !place?.longitude) {
            return null;
        }

        const lat = Number(place.latitude);
        const lon = Number(place.longitude);
        if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
            return null;
        }

        const canonical = `${place['place name'] || 'Unknown'}, ${place.state || 'US'} ${zip}`;
        return { lat, lon, canonical };
    } catch {
        return null;
    }
}

async function geocodeAsync(location: string): Promise<{ lat: number; lon: number; canonical: string } | null> {
    // Use ZIP-specific geocoding first for better reliability on US postal codes.
    const zipMatch = location.match(/^\d{5}(?:-\d{4})?$/);
    if (zipMatch) {
        const zipResult = await geocodeUsZipAsync(zipMatch[0]);
        if (zipResult) {
            return zipResult;
        }
    }

    try {
        const encoded = encodeURIComponent(location);
        const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encoded}&count=1&language=en&format=json`;

        const response = await fetch(url);
        const data = (await response.json()) as {
            results?: Array<{
                latitude: number;
                longitude: number;
                name?: string;
                admin1?: string;
                country?: string;
            }>;
        };

        if (!data.results || data.results.length === 0) {
            return null;
        }

        const match = data.results[0];
        const lat = match.latitude;
        const lon = match.longitude;
        const name = match.name || location;
        const admin1 = match.admin1 || null;
        const country = match.country || null;
        const canonical = [name, admin1, country].filter((s) => s && s.trim() !== '').join(', ');

        return { lat, lon, canonical: canonical || location };
    } catch {
        return null;
    }
}

async function getLatestObservationAsync(lat: number, lon: number): Promise<Record<string, unknown> | null> {
    try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m,weather_code`;
        const response = await fetch(url);
        const data = (await response.json()) as { current?: Record<string, unknown> };

        return data.current ?? null;
    } catch {
        return null;
    }
}

function mapWeatherCode(code: number): string {
    switch (code) {
        case 0:
            return 'Clear sky';
        case 1:
            return 'Mainly clear';
        case 2:
            return 'Partly cloudy';
        case 3:
            return 'Overcast';
        case 45:
        case 48:
            return 'Fog';
        case 51:
        case 53:
        case 55:
            return 'Drizzle';
        case 56:
        case 57:
            return 'Freezing drizzle';
        case 61:
        case 63:
        case 65:
            return 'Rain';
        case 66:
        case 67:
            return 'Freezing rain';
        case 71:
        case 73:
        case 75:
            return 'Snowfall';
        case 77:
            return 'Snow grains';
        case 80:
        case 81:
        case 82:
            return 'Rain showers';
        case 85:
        case 86:
            return 'Snow showers';
        case 95:
            return 'Thunderstorm';
        case 96:
        case 99:
            return 'Thunderstorm with hail';
        default:
            return 'Unknown';
    }
}

function degToCardinal(deg: number): string {
    const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    return dirs[Math.round((deg % 360) / 22.5) % 16];
}

function parseObservation(props: Record<string, unknown>, location: string): WeatherResult {
    const tempC = typeof props.temperature_2m === 'number' ? props.temperature_2m : null;
    const tempF = tempC !== null ? Math.round(tempC * 1.8 + 32) : null;

    const condition = typeof props.weather_code === 'number' ? mapWeatherCode(props.weather_code) : 'Unknown';

    const humidity = typeof props.relative_humidity_2m === 'number' ? Math.round(props.relative_humidity_2m) : null;

    const wind = typeof props.wind_speed_10m === 'number' ? props.wind_speed_10m : null;
    const windKph = wind !== null ? Math.round(wind) : null;

    const windDirDeg = typeof props.wind_direction_10m === 'number' ? props.wind_direction_10m : null;
    const windDir = windDirDeg !== null ? ` ${degToCardinal(windDirDeg)}` : '';

    const reportedTime = typeof props.time === 'string' ? new Date(props.time) : new Date();

    return {
        Location: location,
        Condition: condition,
        TemperatureC: tempC !== null ? Math.round(tempC) : null,
        TemperatureF: tempF,
        HumidityPercent: humidity,
        WindKph: windKph,
        Wind: windKph !== null ? `${windKph} km/h${windDir}` : '—',
        ReportedAtUtc: reportedTime.toISOString().replace('T', ' ').slice(0, -5) + 'Z',
        Source: 'open-meteo',
    };
}

class WeatherService {
    async getCurrentWeatherAsync(location: string): Promise<WeatherResult | WeatherError> {
        const tracer = trace.getTracer('mcp-tools.weather-service');
        const normalized = normalizeLocation(location);

        return tracer.startActiveSpan('weather.service.getCurrentWeather', async (serviceSpan) => {
            try {
                serviceSpan.setAttribute('weather.location.input', location);
                serviceSpan.setAttribute('weather.location.normalized', normalized);

                const coords = await tracer.startActiveSpan('weather.geocode', async (geocodeSpan) => {
                    try {
                        const result = await geocodeAsync(normalized);
                        if (result) {
                            geocodeSpan.setAttribute('weather.geo.latitude', result.lat);
                            geocodeSpan.setAttribute('weather.geo.longitude', result.lon);
                            geocodeSpan.setAttribute('weather.geo.canonical', result.canonical);
                        }
                        geocodeSpan.setStatus({ code: SpanStatusCode.OK });
                        return result;
                    } catch (error) {
                        geocodeSpan.recordException(error as Error);
                        geocodeSpan.setStatus({ code: SpanStatusCode.ERROR, message: 'geocode failed' });
                        return null;
                    } finally {
                        geocodeSpan.end();
                    }
                });

                if (!coords) {
                    serviceSpan.setStatus({ code: SpanStatusCode.ERROR, message: 'location not found' });
                    return {
                        Location: normalized,
                        Error: 'Could not find this location. Try a city, address, or zip code.',
                        Source: 'open-meteo',
                    };
                }

                const { lat, lon, canonical } = coords;

                const observation = await tracer.startActiveSpan('weather.current', async (currentSpan) => {
                    try {
                        const result = await getLatestObservationAsync(lat, lon);
                        currentSpan.setStatus({ code: SpanStatusCode.OK });
                        return result;
                    } catch (error) {
                        currentSpan.recordException(error as Error);
                        currentSpan.setStatus({ code: SpanStatusCode.ERROR, message: 'current observation failed' });
                        return null;
                    } finally {
                        currentSpan.end();
                    }
                });

                if (!observation) {
                    serviceSpan.setStatus({ code: SpanStatusCode.ERROR, message: 'observation unavailable' });
                    return {
                        Location: canonical,
                        Error: 'Could not retrieve current observations.',
                        Source: 'open-meteo',
                    };
                }

                serviceSpan.setStatus({ code: SpanStatusCode.OK });
                return parseObservation(observation, canonical);
            } catch (error) {
                serviceSpan.recordException(error as Error);
                serviceSpan.setStatus({ code: SpanStatusCode.ERROR, message: 'weather service failure' });
                return {
                    Location: normalized,
                    Error: 'Could not retrieve current observations.',
                    Source: 'open-meteo',
                };
            } finally {
                serviceSpan.end();
            }
        });
    }
}

const weatherService = new WeatherService();

export async function weatherServiceTool(
    _toolArguments: unknown,
    context: InvocationContext
): Promise<WeatherResult | WeatherError> {
    const tracer = trace.getTracer('mcp-tools.mcp');
    const mcptoolargs = context.triggerMetadata.mcptoolargs as { city?: string };
    const city = mcptoolargs?.city ?? 'Seattle, WA';

    context.log(`Fetching weather for city: ${city}`);
    return tracer.startActiveSpan('mcp.tool.weatherServiceTool', async (toolSpan) => {
        try {
            toolSpan.setAttribute('mcp.tool.name', 'weatherServiceTool');
            toolSpan.setAttribute('mcp.tool.city', city);
            const result = await weatherService.getCurrentWeatherAsync(city);
            if ('Error' in result) {
                toolSpan.setStatus({ code: SpanStatusCode.ERROR, message: result.Error });
            } else {
                toolSpan.setStatus({ code: SpanStatusCode.OK });
            }
            return result;
        } catch (error) {
            toolSpan.recordException(error as Error);
            toolSpan.setStatus({ code: SpanStatusCode.ERROR, message: 'tool execution failed' });
            throw error;
        } finally {
            toolSpan.end();
        }
    });
}

app.mcpTool('weatherServiceTool', {
    toolName: 'weatherServiceTool',
    description: 'Gets the current weather for a specific city.',
    toolProperties: {
        city: arg.string().describe('City name to fetch weather for (for example: Seattle, WA)').optional(),
    },
    handler: weatherServiceTool,
});
