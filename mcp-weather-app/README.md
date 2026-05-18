# MCP Weather App — Remote MCP Server on Azure Functions (TypeScript)

A sample MCP App that displays weather information with an interactive UI.

## What are MCP Apps?

[MCP Apps](https://modelcontextprotocol.io/extensions/apps/overview) let tools return interactive interfaces instead of plain text. When a tool declares a UI resource, the host renders it in a sandboxed iframe where users can interact directly.

### MCP Apps = Tool + UI Resource

The architecture relies on two MCP primitives:

1. **Tools** with UI metadata pointing to a resource URI
2. **Resources** containing bundled HTML/JavaScript served via the `ui://` scheme

Azure Functions makes it easy to build both.

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

## Getting Started

### 1. Build the UI

The UI must be bundled before running the function app:

```shell
cd src/app
npm install
npm run build
cd ../..
```

This creates a bundled `src/app/dist/index.html` file that the function serves.

### 2. Build and run the Function App

In the `src/mcp-weather-app` directory, start the Functions host:

```shell
func start
```

The MCP endpoint will be available at `http://localhost:7071/runtime/webhooks/mcp`.

### 3. Connect from VS Code

Open **`.vscode/mcp.json`** in the workspace root. Find the server called **`local-mcp-function`** and click **Start** above the name. It points to:

```
http://localhost:7071/runtime/webhooks/mcp
```

### 4. Prompt the Agent

Ask Copilot: "What's the weather in Seattle?"

You should see an interactive weather widget rendered in the chat.

## How it works

1. User asks: "What's the weather in Seattle?"
2. Agent calls the `GetWeather` tool
3. Tool returns weather data (JSON) **and** the host sees the `ui.resourceUri` metadata
4. Host fetches the UI resource from `ui://weather/index.html`
5. Host renders the HTML in a sandboxed iframe, passing the tool result as context
6. User sees an interactive weather widget instead of plain text

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

### The tool with UI metadata

The `GetWeather` tool uses metadata to declare it has an associated UI:

```typescript
const TOOL_METADATA = JSON.stringify({
  ui: { resourceUri: "ui://weather/index.html" }
});

app.mcpTool("getWeather", {
  toolName: "GetWeather",
  description: "Returns current weather for a location via Open-Meteo.",
  toolProperties: {
    location: arg.string().describe("City name to check weather for")
  },
  metadata: TOOL_METADATA,
  handler: getWeather,
});
```

### The resource serving the UI

```typescript
app.mcpResource("getWeatherWidget", {
  uri: "ui://weather/index.html",
  resourceName: "Weather Widget",
  description: "Interactive weather display for MCP Apps",
  mimeType: "text/html;profile=mcp-app",
  metadata: RESOURCE_METADATA,
  handler: getWeatherWidget,
});
```

### The UI (TypeScript)

The frontend in `src/app/src/weatherMcpApp.ts` receives the tool result and renders the weather display. It's bundled with Vite into a single `index.html` that the resource serves.

## Troubleshooting

| Problem | Solution |
|---------|----------|
| UI not loading | Make sure you ran `npm install && npm run build` in the `src/app/` directory before `func start` |

## Next Steps

+ Learn more about the [Azure Functions MCP extension](https://learn.microsoft.com/azure/azure-functions/functions-bindings-mcp?pivots=programming-language-typescript)
+ Add [API Management](https://aka.ms/mcp-remote-apim-auth) to your MCP server
