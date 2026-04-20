import { app, InvocationContext, PromptInvocationContext } from '@azure/functions';
import { SummarizePromptName, SummarizePromptDescription } from '../promptsInformation';

/**
 * Prompt with declared arguments. Generates a context-aware summarization prompt
 * for a given topic and audience. Mirrors the .NET sample that uses
 * [McpPromptArgument] attributes to declare arguments.
 */
app.mcpPrompt('SummarizeContent', {
    promptName: SummarizePromptName,
    description: SummarizePromptDescription,
    promptArguments: [
        { name: 'topic', description: 'The topic or content to summarize.', required: true },
        {
            name: 'audience',
            description: "Target audience (e.g., 'executive', 'developer', 'beginner').",
            required: false,
        },
    ],
    handler: (prompt: PromptInvocationContext, context: InvocationContext): string => {
        const topic = prompt.arguments.topic ?? '';
        const audience = prompt.arguments.audience;

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
