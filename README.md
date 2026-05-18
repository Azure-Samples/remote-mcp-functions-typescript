<!--
---
name: Remote MCP with Azure Functions (Node.js/TypeScript/JavaScript)
description: Run a remote MCP server on Azure functions.  
languages:
- typescript
- javascript
- nodejs
- bicep
- azdeveloper
products:
- azure-functions
- azure
page_type: sample
urlFragment: remote-mcp-functions-typescript
---
-->
# Remote MCP Servers using Azure Functions (Node.js/TypeScript)

Build and deploy remote [MCP](https://modelcontextprotocol.io/) servers to Azure using Azure Functions. Each sample is a self-contained quickstart you can clone, run locally, and `azd up` to the cloud in minutes.

[![Open in GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://codespaces.new/Azure-Samples/remote-mcp-functions-typescript)

Looking for another language? See the [.NET/C#](https://github.com/Azure-Samples/remote-mcp-functions-dotnet) and [Python](https://github.com/Azure-Samples/remote-mcp-functions-python) versions.

**Watch the video overview**

<a href="https://www.youtube.com/watch?v=U9DsLcP5vEk">
  <img src="./images/video-overview.png" alt="Watch the video" width="500" />
</a>

![Architecture Diagram](/images/architecture-diagram.png)

## Prerequisites

Install these before working with any sample:

+ [Node.js](https://nodejs.org/) version 18 or higher
+ [Azure Functions Core Tools](https://learn.microsoft.com/azure/azure-functions/functions-run-local?pivots=programming-language-javascript#install-the-azure-functions-core-tools) >= `4.0.7030`
+ [Azure Developer CLI (azd)](https://aka.ms/azd)
+ [Visual Studio Code](https://code.visualstudio.com/) with the [Azure Functions extension](https://marketplace.visualstudio.com/items?itemName=ms-azuretools.vscode-azurefunctions) (recommended)
+ [Docker](https://www.docker.com/) — Runs Azurite, the local Azure Storage emulator

## Samples

| Sample | Get started | What it demonstrates |
|--------|-------------|---------------------|
| [mcp-tools](mcp-tools/) | [README](mcp-tools/README.md) | MCP Tool triggers: hello world, snippet save/get with Azure Blob bindings, structured content (images, resource links) |
| [mcp-prompts](mcp-prompts/) | [README](mcp-prompts/README.md) | MCP Prompt triggers: reusable, parameterized prompt templates (code review, summarize, documentation) |
| [mcp-weather-app](mcp-weather-app/) | [README](mcp-weather-app/README.md) | MCP Apps: tool + UI resource serving an interactive weather widget in a sandboxed iframe |


## Next Steps

+ Learn more about the [Azure Functions MCP extension](https://learn.microsoft.com/azure/azure-functions/functions-bindings-mcp?pivots=programming-language-typescript)
+ Learn more about [built-in MCP auth](https://learn.microsoft.com/azure/azure-functions/functions-mcp-tutorial?tabs=mcp-extension&pivots=programming-language-python#remote-mcp-server-authorization)
+ Follow our blog posts on [Azure SDK Blog](https://devblogs.microsoft.com/azure-sdk) and [Tech Community](https://techcommunity.microsoft.com/category/azure/blog/appsonazureblog) for updates. 

