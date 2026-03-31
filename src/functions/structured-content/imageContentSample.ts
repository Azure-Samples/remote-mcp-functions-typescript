/**
 * MCP Tool returning Image content as structured content
 * 
 * This sample demonstrates how to return image content as base64-encoded data.
 * Images can be embedded directly in the response with metadata.
 * 
 * Usage:
 *   Tool input: { "image_type": "chart" }
 *   Response:   { type: "image", data: "<base64 image data>", mimeType: "image/png" }
 */

import { app, InvocationContext, output, arg } from "@azure/functions";
import * as fs from "fs";
import * as path from "path";

// Sample structured image content response
interface ImageContent {
    type: 'image';
    data: string;       // base64-encoded image data
    mimeType: string;   // e.g., "image/png", "image/jpeg", "image/svg+xml"
    description?: string;
}

/**
 * Generate or loads an image and returns it as base64 data.
 * In a real scenario, this might generate a chart or fetch an image from storage.
 */
export async function getImageContent(
    toolArguments: unknown,
    context: InvocationContext
): Promise<ImageContent> {
    const args = context.triggerMetadata.mcptoolargs as { image_type?: string };
    const imageType = args?.image_type || "default";

    context.log(`Generating image content for type: ${imageType}`);

    // Create a simple 1x1 pixel PNG as example (in reality, this would be actual image data)
    // This is a minimal valid PNG in base64
    const simplePixelPng = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

    return {
        type: 'image',
        data: simplePixelPng,
        mimeType: 'image/png',
        description: `Generated image for ${imageType}`
    };
}

// Register the image content tool
app.mcpTool('imageContent', {
    toolName: 'imageContent',
    description: 'Returns image content as base64-encoded structured data.',
    toolProperties: {
        image_type: arg.string().describe('The type of image to generate (chart, diagram, logo, etc.)').optional()
    },
    handler: getImageContent
});
