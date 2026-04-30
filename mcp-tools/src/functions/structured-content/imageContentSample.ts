/**
 * MCP Tool samples returning image-related content blocks.
 *
 * Demonstrates the class-based content-block API:
 * - direct ImageContent
 * - McpContentBlock[]
 * - McpToolResponse with structuredContent
 */

import { app, InvocationContext, arg } from '@azure/functions';
import { McpImageContent, McpToolResponse, McpTextContent } from '@azure/functions';
import * as QRCode from 'qrcode';

// Simple placeholder image payload for sample purposes (1x1 transparent PNG).
const base64ImageData =
    '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';

export async function getImageWithText(
    _toolArguments: unknown,
    _context: InvocationContext
): Promise<[McpTextContent, McpImageContent]> {
    return [
        new McpTextContent('Here is the Azure Functions logo'),
        new McpImageContent({ data: base64ImageData, mimeType: 'image/png' }),
    ];
}

app.mcpTool('getImageWithText', {
    toolName: 'getImageWithText',
    description: 'Returns McpContentBlock[] - multi-block example',
    toolProperties: {
        imageId: arg.string().describe('Optional image identifier').optional(),
    },
    handler: getImageWithText,
});

export async function getImageWithMetadata(
    _toolArguments: unknown,
    _context: InvocationContext
): Promise<McpToolResponse> {
    const metadata = {
        imageId: 'logo',
        format: 'png',
        tags: ['functions', 'azure', 'serverless'],
    };

    return new McpToolResponse({
        content: [
            new McpTextContent(JSON.stringify(metadata)),
            new McpImageContent({ data: base64ImageData, mimeType: 'image/png' }),
        ],
        structuredContent: metadata,
    });
}

app.mcpTool('getImageWithMetadata', {
    toolName: 'getImageWithMetadata',
    description: 'Returns McpToolResponse with explicit structuredContent',
    toolProperties: {
        imageId: arg.string().describe('Optional image identifier').optional(),
    },
    handler: getImageWithMetadata,
});

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

app.mcpTool('generateQrCode', {
    toolName: 'generateQrCode',
    description: 'Generates a QR code PNG - single ImageContent example',
    toolProperties: {
        text: arg.string().describe('Text to encode in QR code').optional(),
    },
    handler: generateQrCode,
});

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

    return [
        new McpTextContent(`Badge: ${label} - ${value}`),
        new McpImageContent({ data: svgBase64, mimeType: 'image/svg+xml' }),
    ];
}

app.mcpTool('generateBadge', {
    toolName: 'generateBadge',
    description: 'Generates an SVG status badge - multi McpContentBlock[] example',
    toolProperties: {
        label: arg.string().describe('Badge label (left side)').optional(),
        value: arg.string().describe('Badge value (right side)').optional(),
        color: arg.string().describe('Badge color (hex or SVG color, default: #4CAF50)').optional(),
    },
    handler: generateBadge,
});
