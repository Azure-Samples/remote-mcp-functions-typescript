import { z } from "zod";
import { app, InvocationContext } from "@azure/functions";

export async function mcpToolTriggerWithArguments(
  _toolArguments: unknown,
  context: InvocationContext
): Promise<string> {
  context.log("MCP Server Trigger Test with Arguments");
  const mcptoolargs = context.triggerMetadata.mcptoolargs as {
    latitude?: number;
    longitude?: number;
  };
  return `Returning latitude: ${mcptoolargs.latitude}, longitude: ${mcptoolargs.longitude}`;
}

app.mcpTool("mcpToolTriggerWithArguments", {
  toolName: "mcpToolTriggerWithArguments",
  description: "Mcp Tool with Arguments Example",
  toolProperties: [
    {
      propertyName: "latitude",
      propertyType: "string",
      description: "Latitude of the Location",
    },
    {
      propertyName: "longitude",
      propertyType: "string",
      description: "Longitude of the Location",
    },
  ],
  handler: mcpToolTriggerWithArguments,
});

export async function mcpToolTriggerWithZod(
  _toolArguments: unknown,
  context: InvocationContext
): Promise<string> {
  context.log("MCP Server Trigger Test with Arguments");

  // Retrieve mcptool arguments from trigger metadata
  const mcptoolargs = context.triggerMetadata.mcptoolargs as {
    latitude?: number;
    longitude?: number;
  };

  if (!mcptoolargs) {
    context.log("No mcptool arguments found in trigger metadata");
    return "No arguments provided";
  }

  return `Returning latitude: ${mcptoolargs.latitude}, longitude: ${mcptoolargs.longitude}`;
}

app.mcpTool("mcpToolTriggerWithZod", {
  toolName: "mcpToolTriggerWithZod",
  description: "Mcp Tool with Zod Validation Example",
  toolProperties: {
    latitude: z.number().describe("Latitude of the location"),
    longitude: z.array(z.string()).describe("Longitude of the location"),
  },
  handler: mcpToolTriggerWithZod,
});

const geoLocation = z.object({
  latitude: z.number().describe("Latitude of the location"),
  longitude: z.boolean().describe("Longitude of the location"),
});

export async function mcpToolTriggerWithZodObject(
  _toolArguments: unknown,
  context: InvocationContext
): Promise<string> {
  context.log("MCP Tool Trigger with Zod Object Example");

  // Retrieve mcptool arguments from trigger metadata
  const mcptoolargs = context.triggerMetadata.mcptoolargs as {
    latitude?: number;
    longitude?: boolean;
  };

  if (!mcptoolargs) {
    context.log("No mcptool arguments found in trigger metadata");
    return "No arguments provided";
  }

  return `Returning latitude: ${mcptoolargs.latitude}, longitude: ${mcptoolargs.longitude}`;
}

app.mcpTool("mcpToolTriggerWithZodObject", {
  toolName: "mcpToolTriggerWithZodObject",
  description: "Mcp Tool with Zod Validation Example",
  toolProperties: geoLocation,
  handler: mcpToolTriggerWithZodObject,
});
