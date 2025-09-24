import { app, InvocationContext, output } from "@azure/functions";

const PROPERTY_TYPE = "string";

// Hello function - responds with hello message
export async function mcpToolHello(_toolArguments:unknown, context: InvocationContext): Promise<string> {
    // Get snippet name from the tool arguments
    const mcptoolargs = context.triggerMetadata.mcptoolargs as {
        name?: string;
    };
    const name = mcptoolargs?.name;

    console.info(`Hello ${name}, I am MCP Tool!`);

    return `Hello ${name}, I am MCP Tool!`;
}

// Register the hello tool
app.mcpTool('hello', {
    toolName: 'hello',
    description: 'Simple hello world MCP Tool that responses with a hello message.',
    toolProperties:[
    {
      propertyName: "name",
      propertyType: PROPERTY_TYPE,
      description: "Required property to identify the caller.",
      required: true,
    }],
    handler: mcpToolHello
});
