import { app, InvocationContext, PromptInvocationContext } from '@azure/functions';
import { CodeReviewPromptName, CodeReviewPromptDescription } from '../promptsInformation';

/**
 * Simple prompt with no arguments. Returns a static code review checklist.
 * Demonstrates the basic app.mcpPrompt usage.
 */
app.mcpPrompt('CodeReviewChecklist', {
    promptName: CodeReviewPromptName,
    description: CodeReviewPromptDescription,
    handler: (_prompt: PromptInvocationContext, context: InvocationContext): string => {
        context.log('Code review checklist prompt invoked.');

        return [
            "You are a senior software engineer performing a code review.",
            'Use the following checklist to evaluate the code:',
            '',
            "1. **Correctness** \u2014 Does the code do what it's supposed to?",
            '2. **Error Handling** \u2014 Are edge cases and failures handled?',
            '3. **Security** \u2014 Are there any vulnerabilities (injection, auth, secrets)?',
            '4. **Performance** \u2014 Are there obvious inefficiencies?',
            '5. **Readability** \u2014 Is the code clear and well-named?',
            '6. **Tests** \u2014 Are there adequate tests for the changes?',
            '',
            'Provide your feedback in a structured format with a severity level',
            '(critical, warning, suggestion) for each finding.',
        ].join('\n');
    },
});
