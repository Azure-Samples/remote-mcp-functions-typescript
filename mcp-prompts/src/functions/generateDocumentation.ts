import { app, InvocationContext, promptArg, PromptInvocationContext } from '@azure/functions';
import { GenerateDocsPromptName, GenerateDocsPromptDescription } from '../promptsInformation';

/**
 * Prompt that declares its arguments up-front using the `promptArg` builder,
 * mirroring the .NET sample that uses [McpPromptArgument] attributes. Arguments
 * are validated by the runtime and surfaced on `ctx.arguments` in the handler.
 */
app.mcpPrompt('GenerateDocumentation', {
    promptName: GenerateDocsPromptName,
    description: GenerateDocsPromptDescription,
    promptArguments: {
        function_name: promptArg.describe('The function to document.').isRequired(),
        style: promptArg.describe("Documentation style (e.g., 'concise', 'verbose')."),
    },
    handler: async (ctx: PromptInvocationContext, context: InvocationContext) => {
        const functionName = ctx.arguments.function_name ?? '(unknown)';
        const style = ctx.arguments.style ?? 'concise';

        context.log(`Generate docs prompt invoked for function: ${functionName}`);

        return [
            `Generate API documentation for the function named **${functionName}**.`,
            '',
            `Documentation style: **${style}**`,
            '',
            'Include the following sections:',
            '- **Description** \u2014 What the function does.',
            '- **Parameters** \u2014 List each parameter with its type and purpose.',
            '- **Return Value** \u2014 What the function returns.',
            '- **Example Usage** \u2014 A short code example showing how to call it.',
        ].join('\n');
    },
});
