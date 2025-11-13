import { app, InvocationContext, output, arg, input } from "@azure/functions";

const PROPERTY_TYPE = "string";

// Hello function - responds with hello message
export async function mcpToolHello(_toolArguments:unknown, context: InvocationContext): Promise<string> {
    console.log(_toolArguments);
    // Get name from the tool arguments
    const mcptoolargs = context.triggerMetadata.mcptoolargs as {
        name?: string;
    };
    const name = mcptoolargs?.name;

    console.info(`Hello ${name}, I am MCP Tool!`);
    
    return `Hello ${name || 'World'}, I am MCP Tool!`;
}

// Register the hello tool
app.mcpTool('hello', {
    toolName: 'hello',
    description: 'Simple hello world MCP Tool that responses with a hello message.',
    toolProperties:{
        name: arg.string().describe('Required property to identify the caller.').optional()
    },
    handler: mcpToolHello
});
