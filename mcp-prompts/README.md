# MCP Prompts — Remote MCP Server on Azure Functions (TypeScript)

This project is a TypeScript Azure Function app that exposes MCP (Model Context Protocol) prompts as a remote MCP server. Prompts are reusable prompt templates that MCP clients can discover and invoke, optionally with arguments.

> **Note:** MCP tools are in the [mcp-tools](../mcp-tools/) project, and the MCP App weather sample is in [mcp-weather-app](../mcp-weather-app/).

## Prompts included

| Prompt | File | Description |
|--------|------|-------------|
| `code_review_checklist` | `src/functions/codeReviewChecklist.ts` | Returns a structured code review checklist. No arguments |
| `summarize_content` | `src/functions/summarizeContent.ts` | Summarizes a body of text |
| `generate_documentation` | `src/functions/generateDocumentation.ts` | Generates documentation for code |

## Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [Azure Functions Core Tools](https://learn.microsoft.com/azure/azure-functions/functions-run-local?pivots=programming-language-javascript#install-the-azure-functions-core-tools) >= `4.0.7030`
- [Azure Developer CLI (azd)](https://aka.ms/azd)
- [Docker](https://www.docker.com/). Required to run Azurite (Azure Storage emulator)

## Prepare your local environment

Start Azurite, the Azure Storage emulator required by the Functions host:

```shell
docker run -d -p 10000:10000 -p 10001:10001 -p 10002:10002 \
    mcr.microsoft.com/azure-storage/azurite
```

> If you use the Azurite VS Code extension instead, run **Azurite: Start** from the command palette.

## Run locally

From this directory (`mcp-prompts/`), start the Functions host:

```shell
func start
```

The MCP endpoint will be available at `http://localhost:7071/runtime/webhooks/mcp`.

## Connect to the MCP server

### Option A: VS Code with GitHub Copilot

1. Open **`.vscode/mcp.json`** in the workspace root. Find the server called **`local-mcp-function`** and click **Start** above the name. It points to:

    ```
    http://localhost:7071/runtime/webhooks/mcp
    ```

2. Once connected, prompts appear as `/` slash commands in the Chat panel. Type `/` to see them, prefixed with the server name:

    ```
    /mcp.local-mcp-function.code_review_checklist
    /mcp.local-mcp-function.summarize_content
    /mcp.local-mcp-function.generate_documentation
    ```

3. Select a prompt. If it has arguments, VS Code will ask you to fill them in.

### Option B: MCP Inspector

1. In a new terminal, install and run MCP Inspector:

    ```shell
    npx @modelcontextprotocol/inspector
    ```

2. Open the Inspector URL (e.g. `http://0.0.0.0:5173/#resources`).
3. Set the transport type to **HTTP**.
4. Set the URL to `http://0.0.0.0:7071/runtime/webhooks/mcp` and click **Connect**.
5. Click **List Prompts**, select a prompt, and **Run Prompt**.

## Deploy to Azure

### Step 1: Sign in

```shell
az login
azd auth login
```

### Step 2: Create an environment

```shell
azd env new <environment-name>
```

### Step 3: Provision and deploy

By default, OAuth-based authentication is enabled using the [built-in MCP auth feature](https://learn.microsoft.com/azure/app-service/configure-authentication-mcp?toc=/azure/azure-functions/toc.json&bc=/azure/azure-functions/breadcrumb/toc.json) with Microsoft Entra as the identity provider.

Configure VS Code as an allowed client application for Microsoft Entra:

```shell
azd env set PRE_AUTHORIZED_CLIENT_IDS aebc6443-996d-45c2-90f0-388ff96faa56
```

Optionally enable VNet isolation:

```shell
azd env set VNET_ENABLED true
```

Deploy the project:

```shell
azd up
```

### Step 4: Connect to the remote MCP server

Open **`.vscode/mcp.json`** and click **Start** above **`remote-mcp-function`**. You'll be prompted for `functionapp-name`. Find it in your `azd` command output or the `.azure/<env>/.env` file.

By default, OAuth-based authentication is enabled using the [built-in MCP auth feature](https://learn.microsoft.com/azure/app-service/configure-authentication-mcp?toc=/azure/azure-functions/toc.json&bc=/azure/azure-functions/breadcrumb/toc.json) with Microsoft Entra as the identity provider. VS Code will prompt you to sign in with your Microsoft account. Sign in with the same account you used to deploy the app.

> **Tip:** A successful connection shows the number of prompts the server exposes. Click **More... → Show Output** above the server name to see request/response details.

### Redeploy and clean up

- **Redeploy:** `azd deploy`
- **Clean up all resources:** `azd down`

## Examining the code

Each prompt is a function with an `app.mcpPrompt` registration. Here's how to define a new prompt:

```typescript
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

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Prompts not showing in VS Code | Ensure the server is started in **MCP: List Servers** and that you're using agent mode in Chat |

## Next Steps

+ Learn more about the [Azure Functions MCP extension](https://learn.microsoft.com/azure/azure-functions/functions-bindings-mcp?pivots=programming-language-typescript)
+ Add [API Management](https://aka.ms/mcp-remote-apim-auth) to your MCP server
