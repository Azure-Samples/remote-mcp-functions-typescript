/**
 * McpContent decorator sample for TypeScript MCP tools.
 *
 * This sample focuses only on the decorator flow:
 * - A class decorated with @McpContent (defined in a separate file)
 * - A tool returning an instance of that decorated class
 * - Optional resultSchema describing structured output shape
 */

import { app, arg } from '@azure/functions';
import type { InvocationContext } from '@azure/functions';
import {
    DecoratedImageMetadata,
    DECORATED_IMAGE_METADATA_RESULT_SCHEMA,
} from './decoratedImageMetadata';

export async function getImageInfo(
    _toolArguments: unknown,
    _context: InvocationContext
): Promise<DecoratedImageMetadata> {
    return new DecoratedImageMetadata('logo', 'png', ['functions']);
}

app.mcpTool('getImageInfo', {
    toolName: 'getImageInfo',
    description: 'Get image information (McpContent decorator demo)',
    toolProperties: {
        imageId: arg.string().describe('Optional image identifier').optional(),
    },
    resultSchema: DECORATED_IMAGE_METADATA_RESULT_SCHEMA,
    handler: getImageInfo,
});
