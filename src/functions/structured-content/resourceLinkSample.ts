/**
 * MCP Tool returning ResourceLinkBlock
 * 
 * This sample demonstrates how to return a resource link as structured content.
 * ResourceLinkBlock allows you to provide a URI and metadata about the resource.
 * 
 * Usage:
 *   Tool input: { "resource_id": "logo-v1" }
 *   Response:   { type: "resource_link", uri: "file://logo.png", name: "Azure Functions Logo", ... }
 */

import { app, InvocationContext, output, arg } from "@azure/functions";

// Define a resource link response type
interface ResourceLink {
    uri: string;
    name?: string;
    description?: string;
    mimeType?: string;
}

/**
 * Returns a resource link as structured content.
 * This demonstrates structured content with metadata about a resource.
 */
export async function getResourceLink(
    toolArguments: unknown,
    context: InvocationContext
): Promise<ResourceLink> {
    const args = context.triggerMetadata.mcptoolargs as { resource_id?: string };
    const resourceId = args?.resource_id || "default";

    context.log(`Fetching resource: ${resourceId}`);

    // Return a resource link that will be converted to structured content
    return {
        uri: `file://resources/${resourceId}.data`,
        name: `Resource ${resourceId}`,
        description: `Resource file for ${resourceId}`,
        mimeType: "application/octet-stream"
    };
}

// Register the resourceLink tool
app.mcpTool('resourceLink', {
    toolName: 'resourceLink',
    description: 'Returns a resource link with metadata as structured content.',
    toolProperties: {
        resource_id: arg.string().describe('The resource identifier').optional()
    },
    handler: getResourceLink
});
