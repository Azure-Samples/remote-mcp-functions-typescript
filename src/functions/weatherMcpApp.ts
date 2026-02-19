import { app, InvocationContext, arg } from "@azure/functions";
import * as fs from "fs";
import * as path from "path";
import { WeatherService, WeatherResult, WeatherError } from "./weatherService";

// Constants for the Weather Widget resource
const WEATHER_WIDGET_URI = "ui://weather/index.html";
const WEATHER_WIDGET_NAME = "Weather Widget";
const WEATHER_WIDGET_DESCRIPTION = "Interactive weather display for MCP Apps";
const WEATHER_WIDGET_MIME_TYPE = "text/html;profile=mcp-app";

// Metadata for the tool (as valid JSON string)
const TOOL_METADATA = JSON.stringify({
  ui: {
    resourceUri: "ui://weather/index.html"
  }
});

// Metadata for the resource (as valid JSON string)
const RESOURCE_METADATA = JSON.stringify({
  ui: {
    prefersBorder: true
  }
});

// Create weather service instance
const weatherService = new WeatherService();

// GetWeatherWidget function - returns the HTML content for the weather widget
export async function getWeatherWidget(
  resourceContext: unknown,
  context: InvocationContext
): Promise<string> {
  context.log("Getting weather widget");
  
  try {
    // __dirname is dist/src/functions, go up 3 levels to project root, then to src/app/dist
    const filePath = path.join(__dirname, "..", "..", "..", "src", "app", "dist", "index.html");
    return fs.readFileSync(filePath, "utf-8");
  } catch (error) {
    context.log(`Error reading weather widget file: ${error}`);
    // Return a fallback HTML if file not found
    return `<!DOCTYPE html>
<html>
<head><title>Weather Widget</title></head>
<body>
  <h1>Weather Widget</h1>
  <p>Widget content not found. Please ensure the app/dist/index.html file exists.</p>
</body>
</html>`;
  }
}

// GetWeather function - returns current weather for a location
export async function getWeather(
  _toolArguments: unknown,
  context: InvocationContext
): Promise<object> {
  context.log("Getting weather");

  // Get location from the tool arguments
  const mcptoolargs = context.triggerMetadata.mcptoolargs as {
    location?: string;
  };
  const location = mcptoolargs?.location ?? "";

  try {
    const result = await weatherService.getCurrentWeatherAsync(location);
    
    if ("TemperatureC" in result) {
      const weather = result as WeatherResult;
      context.log(`Weather fetched for ${weather.Location}: ${weather.TemperatureC}°C`);
    } else {
      const error = result as WeatherError;
      context.warn(`Weather error for ${error.Location}: ${error.Error}`);
    }

    return result;
  } catch (error) {
    context.error(`Failed to get weather for ${location}: ${error}`);
    return {
      Location: location || "Unknown",
      Error: `Unable to fetch weather: ${error instanceof Error ? error.message : String(error)}`,
      Source: "api.open-meteo.com"
    } as WeatherError;
  }
}

// Register the GetWeatherWidget resource
app.mcpResource("getWeatherWidget", {
  uri: WEATHER_WIDGET_URI,
  resourceName: WEATHER_WIDGET_NAME,
  description: WEATHER_WIDGET_DESCRIPTION,
  mimeType: WEATHER_WIDGET_MIME_TYPE,
  metadata: RESOURCE_METADATA,
  handler: getWeatherWidget,
});

// Register the GetWeather tool
// Note: metadata property is not yet supported in the TypeScript SDK for mcpTool
// The TOOL_METADATA is defined for future use when the SDK is updated
app.mcpTool("getWeather", {
  toolName: "GetWeather",
  description: "Returns current weather for a location via Open-Meteo.",
  toolProperties: {
    location: arg.string().describe("City name to check weather for (e.g., Seattle, New York, Miami)")
  },
  metadata: TOOL_METADATA,
  handler: getWeather,
});
