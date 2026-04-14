import { McpContent } from '@azure/functions';

@McpContent
export class DecoratedImageMetadata {
    constructor(
        public imageId: string,
        public format: string,
        public tags: string[]
    ) {}
}

export const DECORATED_IMAGE_METADATA_RESULT_SCHEMA = JSON.stringify({
    type: 'object',
    properties: {
        imageId: { type: 'string' },
        format: { type: 'string' },
        tags: { type: 'array', items: { type: 'string' } },
    },
    required: ['imageId', 'format', 'tags'],
    additionalProperties: false,
});
