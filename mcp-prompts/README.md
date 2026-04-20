# MCP Prompts sample (TypeScript / Azure Functions)

This sample demonstrates the **`mcpPromptTrigger`** binding exposed by the
`@azure/functions` Node.js library. MCP prompts let clients (IDEs, chat
clients, agents) request reusable, parameterized prompt templates from
your server.

## What's inside

- [`src/functions/codeReviewPrompt.ts`](src/functions/codeReviewPrompt.ts) -
  a `code_review` prompt with a required `code` argument and optional
  `language` argument.
- [`src/functions/summarizePrompt.ts`](src/functions/summarizePrompt.ts) -
  a `summarize` prompt that returns a request to summarize a given body
  of text.
- [`src/functions/greetingPrompt.ts`](src/functions/greetingPrompt.ts) -
  a minimal prompt with only optional arguments.

Each function receives a [`PromptInvocationContext`](../../azure-functions-nodejs-library/src/mcp/PromptInvocationContext.ts)
whose shape mirrors the MCP `prompts/get` payload:

```ts
prompt.name       // prompt name requested by the client
prompt.arguments  // { [argName: string]: string }
prompt.sessionId  // MCP session id (or undefined)
prompt.transport  // transport metadata (optional)
```

The handler returns the prompt body the client will use - typically a
`description` and a `messages` array conforming to the MCP prompt
response schema.

## Run locally

```powershell
npm install
npm start
```

Then connect an MCP client to the function app's SSE endpoint and call
`prompts/list` / `prompts/get` to invoke the prompts above.

## Deploy to Azure

This sample shares the `infra/` templates in the parent folder with the
other samples. To deploy:

```powershell
azd up
```

## Defining a new prompt

```ts
import { app, PromptInvocationContext, InvocationContext } from '@azure/functions';

app.mcpPrompt('myPrompt', {
    promptName: 'my_prompt',
    title: 'Human-friendly title',
    description: 'What this prompt does.',
    promptArguments: [
        { name: 'topic', description: 'Subject matter', required: true },
    ],
    handler: (prompt: PromptInvocationContext, ctx: InvocationContext) => {
        return {
            description: 'Describe the topic in one paragraph.',
            messages: [
                {
                    role: 'user',
                    content: { type: 'text', text: `Describe: ${prompt.arguments.topic}` },
                },
            ],
        };
    },
});
```
