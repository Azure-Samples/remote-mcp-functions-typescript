/**
 * Structured content samples for TypeScript MCP tools.
 *
 * TypeScript erases type information at runtime, so the library uses two complementary
 * techniques to decide how to serialize a tool's return value:
 *
 *  1. Duck-typing (shape detection) — works automatically, no extra code needed:
 *       • Return `ImageContentBlock | TextContentBlock | ...` → single content block
 *       • Return `ContentBlock[]`                            → multi_content_result
 *       • Return `CallToolResult`                            → content + optional structuredContent
 *
 *  2. @McpContent decorator:
 *       • Attach `McpContent(MyClass)` to a custom class.
 *       • Any returned instance is automatically serialized as text + structuredContent.
 *       • Plain objects / interfaces WITHOUT the decorator stay as text only.
 */

import { app, McpContent, arg } from '@azure/functions';
import type { InvocationContext } from '@azure/functions';
import { McpTextContent, McpImageContent, McpToolResponse } from '@azure/functions';
import * as QRCode from 'qrcode';

// Simple placeholder image payload for sample purposes (1x1 transparent PNG).
const base64ImageData =
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

// ── Option 1: McpContent decorator ──────────────────────────────────────────
//
// The library detects the marker at runtime and emits both:
//   content:          [{ type:'text', text: JSON.stringify(instance) }]
//   structuredContent: <the instance as JSON>
//
// resultSchema describes the shape to MCP clients that support it.

const IMAGE_INFO_RESULT_SCHEMA = JSON.stringify({
    type: 'object',
    properties: {
        imageId: { type: 'string' },
        format: { type: 'string' },
        tags: { type: 'array', items: { type: 'string' } },
    },
    required: ['imageId', 'format', 'tags'],
    additionalProperties: false,
});

@McpContent
class ImageMetadata {
    constructor(
        public imageId: string,
        public format: string,
        public tags: string[]
    ) {}
}

// Programmatic form — works today (decorator syntax requires TS experimentalDecorators).
// You can also write:  McpContent(ImageMetadata)
//McpContent(ImageMetadata);

export async function getImageInfo(
    _toolArguments: unknown,
    _context: InvocationContext
): Promise<ImageMetadata> {
    return new ImageMetadata('logo', 'png', ['functions']);
}

app.mcpTool('GetImageInfo', {
    toolName: 'GetImageInfo',
    description: 'Get image information (McpContent decorator demo)',
    toolProperties: {
        imageId: arg.string().describe('Optional image identifier').optional(),
    },
    resultSchema: IMAGE_INFO_RESULT_SCHEMA,
    handler: getImageInfo,
});

// ── Option 2: Return a single ContentBlock directly ───────────────────────────
//
// The library detects { type:'image', data, mimeType } by duck-typing and emits it
// as a single image content block — no decorator or schema needed.

export async function getImageDirect(
    _toolArguments: unknown,
    _context: InvocationContext
): Promise<McpImageContent> {
    return new McpImageContent({ data: base64ImageData, mimeType: 'image/png' });
}

app.mcpTool('GetImageDirect', {
    toolName: 'GetImageDirect',
    description: 'Returns a single ImageContentBlock — duck-typing demo',
    toolProperties: {
        imageId: arg.string().describe('Optional image identifier').optional(),
    },
    handler: getImageDirect,
});

// ── Option 3: Return ContentBlock[] ──────────────────────────────────────────
//
// The library detects an array of typed blocks and emits a multi_content_result.

export async function getImageWithText(
    _toolArguments: unknown,
    _context: InvocationContext
): Promise<[McpTextContent, McpImageContent]> {
    return [
        new McpTextContent('Here is the Azure Functions logo'),
        new McpImageContent({ data: base64ImageData, mimeType: 'image/png' }),
    ];
}

app.mcpTool('GetImageWithText', {
    toolName: 'GetImageWithText',
    description: 'Returns ContentBlock[] — multi-block duck-typing demo',
    toolProperties: {
        imageId: arg.string().describe('Optional image identifier').optional(),
    },
    handler: getImageWithText,
});

// ── Option 4: CallToolResult — full manual control ────────────────────────────
//
// Use when you want explicit control over both content blocks and structuredContent.

export async function getImageWithMetadata(
    _toolArguments: unknown,
    _context: InvocationContext
): Promise<McpToolResponse> {
    return new McpToolResponse({
        content: [
            new McpTextContent('Here is the image'),
            new McpImageContent({ data: base64ImageData, mimeType: 'image/png' }),
        ],
        structuredContent: {
            imageId: 'logo',
            format: 'png',
            tags: ['functions'],
        },
    });
}

app.mcpTool('GetImageWithMetadata', {
    toolName: 'GetImageWithMetadata',
    description: 'Returns CallToolResult with explicit structuredContent',
    toolProperties: {
        imageId: arg.string().describe('Optional image identifier').optional(),
    },
    handler: getImageWithMetadata,
});

// ── Option 5: Generate QR Code (single ImageContentBlock) ──────────────────────
//
// Returns a single image content block — no array, no decorator needed.
// In production, use a library like `qrcode` to generate actual QR codes.

export async function generateQrCode(
    toolArguments: unknown,
    context: InvocationContext
): Promise<McpImageContent> {
    const args = (toolArguments ?? {}) as { text?: string };
    const text = typeof args.text === 'string' && args.text.trim() ? args.text.trim() : 'Hello QR';

    context.log(`Generating QR code for text of length ${text.length}`);

    const dataUrl = await QRCode.toDataURL(text, {
        type: 'image/png',
        errorCorrectionLevel: 'Q',
        margin: 2,
        scale: 10,
    });

    const base64Data = dataUrl.split(',')[1];
    if (!base64Data) {
        throw new Error('Failed to generate base64 QR code image data.');
    }

    return new McpImageContent({ data: base64Data, mimeType: 'image/png' });
}

app.mcpTool('GenerateQrCode', {
    toolName: 'GenerateQrCode',
    description: 'Generates a QR code PNG — single ImageContentBlock example',
    toolProperties: {
        text: arg.string().describe('Text to encode in QR code').optional(),
    },
    handler: generateQrCode,
});

// ── Option 6: Generate SVG Badge (ContentBlock[] array) ──────────────────────
//
// Returns an array: text description + SVG image.
// The library detects the array and emits it as multi_content_result.

export async function generateBadge(
    _toolArguments: unknown,
    _context: InvocationContext
): Promise<(McpTextContent | McpImageContent)[]> {
    const args = (_context.triggerMetadata.mcptoolargs ?? {}) as {
        label?: string;
        value?: string;
        color?: string;
    };

    const label = typeof args.label === 'string' && args.label.trim() ? args.label.trim() : 'build';
    const value = typeof args.value === 'string' && args.value.trim() ? args.value.trim() : 'passing';
    const color = typeof args.color === 'string' && args.color.trim() ? args.color.trim() : '#4CAF50';

    console.log(`_toolArguments received for GenerateBadge: ${JSON.stringify(args)} `);
    console.log(`Generating badge with label="${label}", value="${value}", color="${color}"`);

    // Generate SVG badge
    const labelWidth = label.length * 7 + 12;
    const valueWidth = value.length * 7 + 12;
    const totalWidth = labelWidth + valueWidth;

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="20">
  <rect width="${labelWidth}" height="20" fill="#555"/>
  <rect x="${labelWidth}" width="${valueWidth}" height="20" fill="${color}"/>
  <text x="${labelWidth / 2}" y="14" fill="#fff" text-anchor="middle"
        font-family="Verdana,sans-serif" font-size="11">${label}</text>
  <text x="${labelWidth + valueWidth / 2}" y="14" fill="#fff" text-anchor="middle"
        font-family="Verdana,sans-serif" font-size="11">${value}</text>
</svg>`;

    const svgBase64 = Buffer.from(svg).toString('base64');

    // Return class instances — duck-typing still emits multi_content_result.
    return [
        new McpTextContent(`Badge: ${label} — ${value}`),
        new McpImageContent({ data: svgBase64, mimeType: 'image/svg+xml' }),
    ];
}

app.mcpTool('GenerateBadge', {
    toolName: 'GenerateBadge',
    description: 'Generates an SVG status badge — multi-ContentBlock[] example',
    toolProperties: {
        label: arg.string().describe('Badge label (left side)').optional(),
        value: arg.string().describe('Badge value (right side)').optional(),
        color: arg.string().describe('Badge color (hex or SVG color, default: #4CAF50)').optional(),
    },
    handler: generateBadge,
});

// ── Option 7: Raw MCP SDK-like response shape (warning path) ────────────────
//
// This intentionally returns the plain object shape commonly used by
// @modelcontextprotocol/sdk. The Functions library does not auto-convert this
// shape, and will log a one-time warning before serializing it as plain text.

export async function getSdkStyleResponseWarningSample(
    _toolArguments: unknown,
    _context: InvocationContext
): Promise<unknown> {
    return {
        content: [
            {
                type: 'text',
                text: 'This raw SDK-style result should trigger the warning path.',
            },
        ],
        structuredContent: {
            source: '@modelcontextprotocol/sdk-like-shape',
            expectedBehavior: 'warning_then_plain_text_serialization',
        },
    };
}

app.mcpTool('GetSdkStyleResponseWarningSample', {
    toolName: 'GetSdkStyleResponseWarningSample',
    description: 'Returns a raw SDK-style response object to exercise the library warning path.',
    toolProperties: {},
    handler: getSdkStyleResponseWarningSample,
});
