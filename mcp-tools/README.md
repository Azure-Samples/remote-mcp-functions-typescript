# MCP Tools Function App

This app contains MCP Tool triggers focused on:
- rich content samples (image, resource links, structured content)
- snippet samples (save/get snippets via blob bindings)

## What's included

- hello tool: `src/functions/helloMcpTool.ts`
- snippet tools: `src/functions/snippetsMcpTool.ts`
- structured content samples:
  - `src/functions/structured-content/imageContentSample.ts`
  - `src/functions/structured-content/resourceLinkSample.ts`
  - `src/functions/structured-content/snippetDataSample.ts`
  - `src/functions/structured-content/mcpContentDecoratorSample.ts`

## Run locally

1. Install dependencies

```powershell
npm install
```

2. Build

```powershell
npm run build
```

3. Start Functions host

```powershell
func start
```

By default the MCP endpoint is:

```text
http://0.0.0.0:7071/runtime/webhooks/mcp
```

## Deploy independently with azd

Run these commands from this folder:

```powershell
azd init
azd env new
azd provision
azd deploy
```

`azure.yaml` in this folder points to shared infra at `../infra`, so provisioning and deployment can be run from this app folder independently.
