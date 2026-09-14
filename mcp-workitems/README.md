# MCP work-items server — Azure Functions + Azure Database for PostgreSQL (TypeScript)

This Function App exposes the `workitems` MCP server (from `mcp-memory-server`) as a remote MCP
server. It keeps versioned work-item drafts and a Claude question/answer log, both persisted in
an **Azure Database for PostgreSQL – Flexible Server** instead of a local SQLite file.

## Tools

| Tool | File | Purpose |
|------|------|---------|
| `add_draft` | `src/functions/workitemTools.ts` | Append a new draft (`name`, `content`, optional change note and GitLab id/URL). The version number is assigned automatically; GitLab fields carry over from the previous draft when omitted |
| `get_draft` | `src/functions/workitemTools.ts` | Read one draft; omit `draft_version` for the latest |
| `list_items` | `src/functions/workitemTools.ts` | Latest draft of every item, with its total draft count |
| `list_versions` | `src/functions/workitemTools.ts` | Every draft of one item, oldest first |
| `search_items` | `src/functions/workitemTools.ts` | Case-insensitive substring search over name, content and change note |
| `update_draft` | `src/functions/workitemTools.ts` | Edit an existing draft in place; pass an empty string to clear a GitLab field |
| `delete_draft` | `src/functions/workitemTools.ts` | Delete one draft, or all drafts of a name |
| `add_qa` | `src/functions/qaTools.ts` | Record a question/answer exchange, optional GitLab id/URL |
| `get_qa` | `src/functions/qaTools.ts` | Read one Q&A entry by id |
| `list_qa` | `src/functions/qaTools.ts` | Q&A entries newest first, optionally filtered by GitLab work item id |
| `search_qa` | `src/functions/qaTools.ts` | Case-insensitive substring search over questions and answers |
| `update_qa` | `src/functions/qaTools.ts` | Edit a Q&A entry; pass an empty string to clear a GitLab field |
| `delete_qa` | `src/functions/qaTools.ts` | Delete one Q&A entry by id |

Every tool returns the affected row(s) as JSON text (also as `structuredContent`). Not-found
lookups return the same descriptive message as the original server (`No draft found for "x" version 2.`)
as text plus `structuredContent: { error }`. The Functions MCP extension does not forward `isError`
from a returned response, and a thrown error is replaced by a generic message, so a descriptive
text result is the most useful shape for clients.

## Schema

The tables are created on first use (`CREATE TABLE IF NOT EXISTS`), see `src/db.ts`.

Table `workitems` — one row per draft:

| column | type | notes |
| --- | --- | --- |
| `id` | INTEGER identity | primary key |
| `name` | TEXT | work item name |
| `draft_version` | INTEGER | 1-based, unique per name, assigned automatically |
| `content` | TEXT | the draft itself |
| `update_from_previous_version` | TEXT | what changed since the prior draft; null on v1 |
| `gitlab_workitem_id` | TEXT | optional; carried over from the previous draft when omitted |
| `gitlab_workitem_url` | TEXT | optional; carried over from the previous draft when omitted |
| `created_at` | TIMESTAMPTZ | `now()` |

Table `qa_log` — one row per question/answer exchange:

| column | type | notes |
| --- | --- | --- |
| `id` | INTEGER identity | primary key |
| `question` | TEXT | the question asked |
| `answer` | TEXT | the answer given |
| `gitlab_workitem_id` | TEXT | optional; indexed |
| `gitlab_workitem_url` | TEXT | optional |
| `created_at` | TIMESTAMPTZ | `now()` |

## Configuration

| Setting | Meaning |
| --- | --- |
| `POSTGRES_HOST` | Server host name, e.g. `psql-xxxx.postgres.database.azure.com` |
| `POSTGRES_DATABASE` | Database name (default `workitems`) |
| `POSTGRES_USER` | Role to connect as. With Entra auth this is the managed identity name (in Azure) or your own UPN (locally) |
| `POSTGRES_PASSWORD` | Optional. When set, plain password auth is used (local docker). When absent, an Entra ID token is fetched with `DefaultAzureCredential` |
| `POSTGRES_SSL` | `false` to disable TLS (local docker only) |
| `POSTGRES_PORT` | Default `5432` |
| `AZURE_CLIENT_ID` | Set by the Bicep to the user-assigned managed identity so `DefaultAzureCredential` picks it in Azure |

## Prerequisites

- [Node.js](https://nodejs.org/) 20+
- [Azure Functions Core Tools](https://learn.microsoft.com/azure/azure-functions/functions-run-local?pivots=programming-language-javascript#install-the-azure-functions-core-tools) >= `4.0.7030`
- [Azure Developer CLI (azd)](https://aka.ms/azd)
- [Docker](https://www.docker.com/) for Azurite and (optionally) a local PostgreSQL

## Run locally

Start Azurite (required by the Functions host) and a local PostgreSQL:

```shell
docker run -d -p 10000:10000 -p 10001:10001 -p 10002:10002 \
    mcr.microsoft.com/azure-storage/azurite
```

```shell
docker run -d --name workitems-pg -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=workitems \
    -p 5432:5432 postgres:16-alpine
```

`local.settings.json` already points at that container (`POSTGRES_PASSWORD=postgres`, `POSTGRES_SSL=false`).

Then, from this directory:

```shell
npm install
npm start
```

The MCP endpoint is `http://localhost:7071/runtime/webhooks/mcp`.

### Run locally against the Azure database

After `azd up`, you can point the local host at the provisioned server using your own Entra
identity (you are added as a PostgreSQL Entra admin during provisioning). Edit `local.settings.json`:

```json
"POSTGRES_HOST": "<POSTGRES_HOST from azd env get-values>",
"POSTGRES_DATABASE": "workitems",
"POSTGRES_USER": "<your UPN, e.g. you@contoso.com>",
"POSTGRES_PASSWORD": "",
"POSTGRES_SSL": "true"
```

Remove `POSTGRES_PASSWORD` (or leave it empty), run `az login`, and add your client IP to the
server firewall:

```shell
az postgres flexible-server firewall-rule create --resource-group <rg> --name <POSTGRES_SERVER_NAME> \
    --rule-name local-dev --start-ip-address <your-ip> --end-ip-address <your-ip>
```

## Connect to the MCP server

### Option A: VS Code with GitHub Copilot

1. Open **`.vscode/mcp.json`** in the workspace root, find **`local-mcp-function`** and click **Start**.
2. In Copilot chat **agent** mode try:

    ```
    Add a draft named "login-page" with content "First cut of the login page spec"
    ```

    ```
    List all work items
    ```

    ```
    Record this Q&A: question "Which auth provider?" answer "Entra ID"
    ```

### Option B: MCP Inspector

```shell
npx @modelcontextprotocol/inspector
```

Set transport **HTTP**, URL `http://localhost:7071/runtime/webhooks/mcp`, **Connect**, **List Tools**.

### Option C: Claude Code

```shell
claude mcp add --transport http workitems http://localhost:7071/runtime/webhooks/mcp
```

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

The Function App requires OAuth through the [built-in MCP auth feature](https://learn.microsoft.com/azure/app-service/configure-authentication-mcp?toc=/azure/azure-functions/toc.json&bc=/azure/azure-functions/breadcrumb/toc.json) with Microsoft Entra, enabled by default. Pre-authorize VS Code:

```shell
azd env set PRE_AUTHORIZED_CLIENT_IDS aebc6443-996d-45c2-90f0-388ff96faa56
```

Optionally enable VNet isolation for storage:

```shell
azd env set VNET_ENABLED true
```

Provision and deploy:

```shell
azd up
```

This creates, in addition to the Function App resources:

- an **Azure Database for PostgreSQL – Flexible Server** (`Standard_B1ms`, PostgreSQL 16, Entra-only authentication, password auth disabled)
- a `workitems` database
- a firewall rule allowing Azure services (the Function App has no fixed outbound IP on Flex Consumption)
- two Entra administrators: the Function App's user-assigned managed identity, and the deploying user (so you can query the database with `psql` and an `az` token)

The Function App gets `POSTGRES_HOST`, `POSTGRES_DATABASE`, `POSTGRES_USER` (the identity name) and `AZURE_CLIENT_ID` app settings; the `pg` pool requests a fresh Entra token for every new connection.

### Step 4: Consent to the application

Open the URL printed as `AUTH_REDIRECT_URI` / the app registration in the Entra portal and grant consent as described in the [MCP auth tutorial](https://learn.microsoft.com/azure/azure-functions/functions-mcp-tutorial?tabs=mcp-extension&pivots=programming-language-typescript#remote-mcp-server-authorization).

### Step 5: Connect

In **`.vscode/mcp.json`** start **`remote-mcp-function`** and enter the Function App name (`azd env get-value AZURE_FUNCTION_NAME`). Sign in when prompted.

### Query the database yourself

```shell
export PGPASSWORD=$(az account get-access-token --resource-type oss-rdbms --query accessToken -o tsv)
psql "host=$(azd env get-value POSTGRES_HOST) dbname=workitems user=$(az ad signed-in-user show --query userPrincipalName -o tsv) sslmode=require"
```

## Redeploy

```shell
azd deploy
```

## Clean up

```shell
azd down
```
