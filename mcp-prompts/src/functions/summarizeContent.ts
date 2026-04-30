import { app, InvocationContext, promptArg, PromptInvocationContext } from '@azure/functions';
import { SummarizePromptName, SummarizePromptDescription } from '../promptsInformation';

/**
 * Prompt with declared arguments. Generates a context-aware summarization prompt
 * for a given topic and audience. Mirrors the .NET sample that uses
 * [McpPromptArgument] attributes to declare arguments.
 */
app.mcpPrompt('SummarizeContent', {
    promptName: SummarizePromptName,
    description: SummarizePromptDescription,
    promptArguments: {
        topic: promptArg.describe('The topic or content to summarize.').isRequired(),
        audience: promptArg.describe(
            "Target audience (e.g., 'executive', 'developer', 'beginner').",
        ),
    },
    handler: async (ctx: PromptInvocationContext, context: InvocationContext) => {
        const topic = ctx.arguments.topic ?? '';
        const audience = ctx.arguments.audience;

        context.log(`Summarize prompt invoked for topic: ${topic}`);

        const audienceInstruction = audience
            ? `Tailor the summary for a **${audience}** audience.`
            : 'Write the summary for a general technical audience.';

        return [
            'Summarize the following topic concisely and accurately:',
            '',
            `**Topic:** ${topic}`,
            '',
            audienceInstruction,
            '',
            'Guidelines:',
            '- Start with a one-sentence overview.',
            '- Include 3\u20135 key points as bullet items.',
            '- End with a brief conclusion or recommendation.',
            '- Keep the total length under 300 words.',
        ].join('\n');
    },
});
