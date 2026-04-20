import { app, InvocationContext, PromptInvocationContext } from '@azure/functions';
import { GenerateDocsPromptName, GenerateDocsPromptDescription } from '../promptsInformation';

/**
 * Prompt that reads its arguments directly from the PromptInvocationContext,
 * mirroring the .NET sample that uses context.Arguments?.GetValueOrDefault(...).
 * Useful when arguments are configured by the MCP client rather than declared
 * up-front on the trigger.
 */
app.mcpPrompt('GenerateDocumentation', {
    promptName: GenerateDocsPromptName,
    description: GenerateDocsPromptDescription,
    promptArguments: [
        { name: 'function_name', description: 'The function to document.', required: false },
        { name: 'style', description: "Documentation style (e.g., 'concise', 'verbose').", required: false },
    ],
    handler: (prompt: PromptInvocationContext, context: InvocationContext): string => {
        const functionName = prompt.arguments.function_name ?? '(unknown)';
        const style = prompt.arguments.style ?? 'concise';

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
