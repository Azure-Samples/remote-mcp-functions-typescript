import { app, InvocationContext, arg } from "@azure/functions";

// Hello function - responds with hello message
export async function mcpToolHello(_toolArguments: unknown, context: InvocationContext): Promise<string> {
    const mcptoolargs = context.triggerMetadata.mcptoolargs as {
        name?: string;
    };
    const name = mcptoolargs?.name;

    context.log(`Hello ${name}, I am MCP Tool!`);

    return `Hello ${name || 'World'}, I am MCP Tool!`;
}

// Register the hello tool
app.mcpTool('hello', {
    toolName: 'hello',
    description: 'Simple hello world MCP Tool that responds with a hello message.',
    toolProperties: {
        name: arg.string().describe('Required property to identify the caller.').optional()
    },
    handler: mcpToolHello
});
