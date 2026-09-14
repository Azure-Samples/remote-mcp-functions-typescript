<!--
---
name: Remote MCP work-items server with Azure Functions (Node.js/TypeScript)
description: Run a remote MCP server on Azure Functions backed by Azure Database for PostgreSQL.
languages:
- typescript
- javascript
- nodejs
- bicep
- azdeveloper
products:
- azure-functions
- azure-database-postgresql
- azure
page_type: sample
urlFragment: remote-mcp-functions-typescript
---
-->
# Remote MCP work-items server on Azure Functions (Node.js/TypeScript)

A remote [MCP](https://modelcontextprotocol.io/) server, hosted on Azure Functions, that stores
versioned **work-item drafts** and a **question/answer log** in
[Azure Database for PostgreSQL](https://learn.microsoft.com/azure/postgresql/flexible-server/).

It is the Azure port of the local `mcp-memory-server` (`workitems` MCP server): the same 13 tools
and the same two tables, but the SQLite file is replaced by a PostgreSQL flexible server and the
Hono/stdio transports are replaced by the Azure Functions MCP extension. Deploy it with
`azd up` and connect any MCP client to the Function App's MCP endpoint.

![Architecture Diagram](/images/architecture-diagram.png)

## Prerequisites

+ [Node.js](https://nodejs.org/) version 20 or higher
+ [Azure Functions Core Tools](https://learn.microsoft.com/azure/azure-functions/functions-run-local?pivots=programming-language-javascript#install-the-azure-functions-core-tools) >= `4.0.7030`
+ [Azure Developer CLI (azd)](https://aka.ms/azd)
+ [Docker](https://www.docker.com/) — runs Azurite (the local Azure Storage emulator) and, optionally, a local PostgreSQL for development
+ [Visual Studio Code](https://code.visualstudio.com/) with the [Azure Functions extension](https://marketplace.visualstudio.com/items?itemName=ms-azuretools.vscode-azurefunctions) (recommended)

## Project

| Project | Get started | What it contains |
|---------|-------------|------------------|
| [mcp-workitems](mcp-workitems/) | [README](mcp-workitems/README.md) | 13 MCP tools (`add_draft`, `get_draft`, `list_items`, `list_versions`, `search_items`, `update_draft`, `delete_draft`, `add_qa`, `get_qa`, `list_qa`, `search_qa`, `update_qa`, `delete_qa`) over PostgreSQL |

The `infra/` folder provisions the Flex Consumption Function App, storage, Application Insights,
an Entra app registration for built-in MCP auth, and a PostgreSQL flexible server that the
Function App reaches with its managed identity (no database password anywhere).

## Next Steps

+ Learn more about the [Azure Functions MCP extension](https://learn.microsoft.com/azure/azure-functions/functions-bindings-mcp?pivots=programming-language-typescript)
+ Learn more about [built-in MCP auth](https://learn.microsoft.com/azure/azure-functions/functions-mcp-tutorial?tabs=mcp-extension&pivots=programming-language-python#remote-mcp-server-authorization)
+ Learn more about [Entra ID authentication for Azure Database for PostgreSQL](https://learn.microsoft.com/azure/postgresql/flexible-server/concepts-azure-ad-authentication)
