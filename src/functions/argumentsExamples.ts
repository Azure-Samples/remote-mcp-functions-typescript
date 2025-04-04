import { z } from "zod";
import { app, InvocationContext } from "@azure/functions";


export async function mcpToolTriggerWithArguments(_toolArguments: unknown, context: InvocationContext): Promise<string> {
    context.log('MCP Server Trigger Test with Arguments');
    const mcptoolargs = context.triggerMetadata.mcptoolargs as { latitude?: number; longitude?: number };
    return `Returning latitude: ${mcptoolargs.latitude}, longitude: ${mcptoolargs.longitude}`;
}

app.mcpTool('mcpToolTriggerWithArguments', {
    toolName: 'mcpToolTriggerWithArguments',
    description: 'Mcp Tool with Arguments Example',
    toolProperties: [
        {
            propertyName: 'latitude',
            propertyValue: 'string',
            description: 'Latitude of the Location',
        },
        {
            propertyName: 'longitude',
            propertyValue: 'string',
            description: 'Longitude of the Location',
        },
    ],
    handler: mcpToolTriggerWithArguments
});

export async function mcpServerTriggerZodSupport(_toolArguments: unknown, context: InvocationContext): Promise<string> {
    context.log('MCP Server Trigger Test with Zod');

    // Retrieve mcptool arguments from trigger metadata
    const mcptoolargs = context.triggerMetadata.mcptoolargs as { latitude?: number; longitude?: number };

    if (!mcptoolargs) {
        context.log('No mcptool arguments found in trigger metadata');
        return "No arguments provided";
    }
    return `Returning latitude: ${mcptoolargs.latitude}, longitude: ${mcptoolargs.longitude}`;
}

app.mcpTool('mcpServerTriggerZodSupport', {
    toolName: 'mcpServerTriggerZodSupport',
    description: 'Mcp Tool with Zod Validation Example',
    toolProperties: {
        latitude: z.number().describe("Latitude of the location"),
        longitude: z.number().describe("Longitude of the location"),
    },
    handler: mcpServerTriggerZodSupport
});
