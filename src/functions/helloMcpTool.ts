import { app, InvocationContext } from "@azure/functions";

// Hello function - responds with hello message
export async function mcpToolHello(_toolArguments: unknown, context: InvocationContext): Promise<string> {
    return "Hello I am MCP Tool!";
}

// Register the hello tool
app.mcpTool('hello', {
    toolName: 'hello',
    description: 'Simple hello world MCP Tool that responses with a hello message.',
    handler: mcpToolHello
});
