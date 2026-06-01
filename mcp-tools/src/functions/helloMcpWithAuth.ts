/**
 * On-Behalf-Of (OBO) auth tool — calls Microsoft Graph as the signed-in user.
 *
 * In production (with built-in MCP auth), the user's token arrives via HTTP
 * headers. This tool exchanges that token for a Graph token using the OBO flow,
 * then calls Graph's /me endpoint as that user.
 *
 * In local development, falls back to the developer's local identity
 * (az login, VS Code, etc.).
 */

import { app, InvocationContext, arg } from "@azure/functions";
import {
    ChainedTokenCredential,
    AzureCliCredential,
    AzureDeveloperCliCredential,
    ManagedIdentityCredential,
    OnBehalfOfCredential,
    TokenCredential,
} from "@azure/identity";

const GRAPH_SCOPES = ["https://graph.microsoft.com/.default"];

export async function helloMcpWithAuth(
    _toolArguments: unknown,
    context: InvocationContext
): Promise<string> {
    context.log("helloMcpWithAuth invoked.");

    const isDevelopment =
        process.env.AZURE_FUNCTIONS_ENVIRONMENT === "Development";

    let credential: TokenCredential;

    if (isDevelopment) {
        // Locally, use whatever developer identity is signed in.
        credential = new ChainedTokenCredential(
            new AzureCliCredential(),
            new AzureDeveloperCliCredential()
        );
    } else {
        // In production, exchange the user's token for a Graph token via OBO.
        credential = buildOnBehalfOfCredential(context);
    }

    // Call Microsoft Graph /me
    try {
        const tokenResponse = await credential.getToken(GRAPH_SCOPES);
        if (!tokenResponse) {
            return "Failed to acquire token for Microsoft Graph.";
        }

        const response = await fetch("https://graph.microsoft.com/v1.0/me", {
            headers: { Authorization: `Bearer ${tokenResponse.token}` },
        });

        if (!response.ok) {
            const body = await response.text();
            context.error(`Graph API error (${response.status}): ${body}`);
            return `Graph API error (${response.status}): ${body}`;
        }

        const me = (await response.json()) as {
            displayName?: string;
            mail?: string;
            userPrincipalName?: string;
        };
        const displayName = me.displayName || "Unknown";
        const mail = me.mail || me.userPrincipalName || "";
        return `Hello, ${displayName} (${mail})!`;
    } catch (ex: unknown) {
        const message = ex instanceof Error ? ex.message : String(ex);
        context.error(`Failed to call Microsoft Graph: ${message}`);
        return `Failed to call Microsoft Graph: ${message}`;
    }
}

/**
 * Builds an On-Behalf-Of credential from the built-in auth headers.
 *
 * The OBO flow exchanges the user's token for a downstream token (e.g. Graph)
 * using three pieces of information:
 *   1. The user's bearer token (from X-MS-TOKEN-AAD-ACCESS-TOKEN or Authorization header)
 *   2. The user's tenant ID (from X-MS-CLIENT-PRINCIPAL header)
 *   3. A client assertion proving this app's identity (via managed identity
 *      with a federated credential)
 */
function buildOnBehalfOfCredential(context: InvocationContext): TokenCredential {
    // Extract headers from trigger metadata
    const headers = (
        context.triggerMetadata?.mcpToolContext as
            | { transport?: { properties?: { headers?: Record<string, string> } } }
            | undefined
    )?.transport?.properties?.headers ?? {};

    // 1. Get the user's access token
    let userToken = headers["X-MS-TOKEN-AAD-ACCESS-TOKEN"] || "";
    if (!userToken) {
        const authHeader = headers["Authorization"] || "";
        if (authHeader.startsWith("Bearer ")) {
            userToken = authHeader.slice("Bearer ".length);
        }
    }
    if (!userToken) {
        throw new Error(
            "No user access token found. Ensure built-in MCP auth is enabled with the token store turned on."
        );
    }

    // 2. Get the tenant ID from X-MS-CLIENT-PRINCIPAL
    const encodedPrincipal = headers["X-MS-CLIENT-PRINCIPAL"] || "";
    if (!encodedPrincipal) {
        throw new Error("X-MS-CLIENT-PRINCIPAL header is missing.");
    }

    let tenantId: string | undefined;
    try {
        const principalJson = Buffer.from(encodedPrincipal, "base64").toString(
            "utf-8"
        );
        const principal = JSON.parse(principalJson) as {
            claims?: Array<{ typ?: string; val?: string }>;
        };
        for (const claim of principal.claims || []) {
            if (
                claim.typ === "tid" ||
                claim.typ ===
                    "http://schemas.microsoft.com/identity/claims/tenantid"
            ) {
                tenantId = claim.val;
                break;
            }
        }
    } catch (ex) {
        throw new Error(`Failed to decode X-MS-CLIENT-PRINCIPAL: ${ex}`);
    }

    if (!tenantId) {
        throw new Error(
            "Tenant ID claim not found in X-MS-CLIENT-PRINCIPAL."
        );
    }

    // 3. Build a client assertion using managed identity's federated credential
    const federatedMiClientId = process.env.OVERRIDE_USE_MI_FIC_ASSERTION_CLIENTID;
    if (!federatedMiClientId) {
        throw new Error("OVERRIDE_USE_MI_FIC_ASSERTION_CLIENTID is not set.");
    }

    const clientId = process.env.WEBSITE_AUTH_CLIENT_ID;
    if (!clientId) {
        throw new Error("WEBSITE_AUTH_CLIENT_ID is not set.");
    }

    const tokenExchangeAudience =
        process.env.TokenExchangeAudience || "api://AzureADTokenExchange";
    const managedIdentity = new ManagedIdentityCredential(federatedMiClientId);

    const getAssertion = async (): Promise<string> => {
        const result = await managedIdentity.getToken(
            `${tokenExchangeAudience}/.default`
        );
        return result.token;
    };

    return new OnBehalfOfCredential({
        tenantId,
        clientId,
        getAssertion,
        userAssertionToken: userToken,
    });
}

// Register the tool
app.mcpTool("helloMcpWithAuth", {
    toolName: "helloMcpWithAuth",
    description:
        "Greets the signed-in user by name using the On-Behalf-Of (OBO) flow to call Microsoft Graph.",
    toolProperties: {},
    handler: helloMcpWithAuth,
});
