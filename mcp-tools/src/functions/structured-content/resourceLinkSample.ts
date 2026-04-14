/**
 * MCP Tool returning a ResourceLinkContentBlock.
 *
 * Demonstrates duck-typing: returning `{ type: 'resource_link', uri, ... }`
 * is detected automatically by the library as a ResourceLinkContentBlock.
 *
 * Usage:
 *   Tool input: { "resource_id": "logo-v1" }
 *   Response:   { type: "resource_link", uri: "file://logo.png", name: "...", ... }
 */

import { app, InvocationContext, arg } from "@azure/functions";
import type { ResourceLinkContentBlock } from "@azure/functions";

/**
 * Returns a resource link content block.
 */
export async function getResourceLink(
    toolArguments: unknown,
    context: InvocationContext
): Promise<ResourceLinkContentBlock> {
    const args = context.triggerMetadata.mcptoolargs as { resource_id?: string };
    const resourceId = args?.resource_id || "default";

    context.log(`Fetching resource: ${resourceId}`);

    return {
        type: 'resource_link',
        uri: `file://resources/${resourceId}.data`,
        name: `Resource ${resourceId}`,
        description: `Resource file for ${resourceId}`,
        mimeType: "application/octet-stream"
    };
}

// Register the resourceLink tool
app.mcpTool('resourceLink', {
    toolName: 'resourceLink',
    description: 'Returns a resource link content block (duck-typing demo).',
    toolProperties: {
        resource_id: arg.string().describe('The resource identifier').optional()
    },
    handler: getResourceLink
});
