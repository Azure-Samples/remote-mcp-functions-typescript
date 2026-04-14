# MCP Weather App Function App

This app contains an MCP App sample with:
- MCP Resource trigger serving the weather widget HTML
- MCP Tool trigger for fetching weather data from Open-Meteo

## What's included

- weather MCP app function: `src/functions/weatherMcpApp.ts`
- weather service: `src/functions/weatherService.ts`
- widget source: `src/app`

## Run locally

1. Install dependencies

```powershell
npm install
```

2. Build widget + function code

```powershell
npm run build:app
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
