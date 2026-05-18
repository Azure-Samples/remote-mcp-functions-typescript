# MCP Tools — Remote MCP Server on Azure Functions (TypeScript)

This project is a TypeScript Azure Function app that exposes multiple MCP (Model Context Protocol) tools as a remote MCP server. It includes a hello world tool, snippet save/get backed by Azure Blob Storage bindings, and tools demonstrating structured content responses (images, QR codes, badges, resource links, structured data).

> **Note:** MCP prompts are in the [mcp-prompts](../mcp-prompts/) project, and the MCP App weather sample is in [mcp-weather-app](../mcp-weather-app/).

## Tools included

| Tool | File | Description |
|------|------|-------------|
| `hello` | `src/functions/helloMcpTool.ts` | Simple hello world tool |
| `savesnippet` | `src/functions/snippetsMcpTool.ts` | Saves a code snippet to blob storage |
| `getsnippets` | `src/functions/snippetsMcpTool.ts` | Retrieves a snippet from blob storage |
| `getImageWithText` | `src/functions/structured-content/imageContentSample.ts` | Returns multi-block content (text + image) |
| `getImageWithMetadata` | `src/functions/structured-content/imageContentSample.ts` | Returns `McpToolResponse` with `structuredContent` |
| `generateQrCode` | `src/functions/structured-content/imageContentSample.ts` | Generates a QR code PNG from text |
| `generateBadge` | `src/functions/structured-content/imageContentSample.ts` | Generates an SVG status badge |
| `resourceLink` | `src/functions/structured-content/resourceLinkSample.ts` | Returns a resource link content block |
| `getCodeSnippet` | `src/functions/structured-content/snippetDataSample.ts` | Retrieves a snippet with structured metadata |

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

From this directory (`mcp-tools/`), start the Functions host:

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

2. In Copilot chat **agent** mode, try prompts like:

    ```
    Say Hello
    ```

    ```
    Save this snippet as snippet1
    ```

    ```
    Retrieve snippet1 and apply to newFile.ts
    ```

3. When prompted to run a tool, consent by clicking **Continue**.

### Option B: MCP Inspector

1. In a new terminal, install and run MCP Inspector:

    ```shell
    npx @modelcontextprotocol/inspector
    ```

2. Open the Inspector URL (e.g. `http://0.0.0.0:5173/#resources`).
3. Set the transport type to **HTTP**.
4. Set the URL to `http://0.0.0.0:7071/runtime/webhooks/mcp` and click **Connect**.
5. Click **List Tools**, select a tool, and **Run Tool**.

### Verify local blob storage

After testing snippet save, you can verify blobs were stored in Azurite:

```shell
az storage blob list \
    --container-name snippets \
    --connection-string "DefaultEndpointsProtocol=http;AccountName=devstoreaccount1;AccountKey=Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==;BlobEndpoint=http://127.0.0.1:10000/devstoreaccount1;"
```

Or open **Azure Storage Explorer** → **Emulator & Attached** → **Blob Containers** → **snippets**.

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

> **Tip:** A successful connection shows the number of tools the server exposes. Click **More... → Show Output** above the server name to see request/response details.

### Redeploy and clean up

- **Redeploy:** `azd deploy`
- **Clean up all resources:** `azd down`

## Examining the code

### Blob bindings for snippet storage

This sample uses Azure Functions [blob bindings](https://learn.microsoft.com/azure/azure-functions/functions-bindings-storage-blob?pivots=programming-language-typescript). No Azure SDK code needed:

```typescript
const blobInputBinding = input.storageBlob({
  connection: "AzureWebJobsStorage",
  path: `snippets/{mcptoolargs.snippetname}.json`,
});

app.mcpTool("getSnippet", {
  toolName: "getsnippets",
  description: "Gets code snippets from your snippet collection.",
  toolProperties: {
    snippetname: arg.string().describe("The name of the snippet.")
  },
  extraInputs: [blobInputBinding],
  handler: getSnippet,
});
```

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Connection refused locally | Ensure Azurite is running (`docker run -p 10000:10000 -p 10001:10001 -p 10002:10002 mcr.microsoft.com/azure-storage/azurite`) |
| Snippet save/get returns errors | Verify Azurite is reachable and `local.settings.json` has `"AzureWebJobsStorage": "UseDevelopmentStorage=true"` |

## Next Steps

+ Learn more about the [Azure Functions MCP extension](https://learn.microsoft.com/azure/azure-functions/functions-bindings-mcp?pivots=programming-language-typescript)
+ Add [API Management](https://aka.ms/mcp-remote-apim-auth) to your MCP server
