/**
 * MCP tools for versioned work-item drafts (table `workitems`).
 * Same tool names and semantics as the mcp-memory-server `workitems` server.
 */
import { app, arg, InvocationContext, McpToolResponse } from '@azure/functions';
import {
    addDraft,
    deleteDraft,
    getDraft,
    listItems,
    listVersions,
    searchItems,
    updateDraft,
} from '../db';
import {
    clearableString,
    errorResult,
    json,
    limitArg,
    optionalPositiveInt,
    optionalString,
    requiredPositiveInt,
    requiredString,
    toolArgs,
} from './mcpHelpers';

const notFound = (name: string, version?: number) =>
    errorResult(`No draft found for "${name}"${version === undefined ? '' : ` version ${version}`}.`);

interface DraftArgs {
    name?: string;
    content?: string;
    draft_version?: number | string;
    update_from_previous_version?: string;
    gitlab_workitem_id?: string | null;
    gitlab_workitem_url?: string | null;
    query?: string;
    limit?: number | string;
}

const gitlabIdArg = (extra: string) =>
    arg.string().describe(`Related GitLab work item id${extra}`).optional();
const gitlabUrlArg = (extra: string) =>
    arg.string().describe(`Related GitLab work item URL${extra}`).optional();

app.mcpTool('addDraft', {
    toolName: 'add_draft',
    description:
        'Append a new draft of a work item. draft_version is assigned automatically as the next version for that name.',
    toolProperties: {
        name: arg.string().describe('Work item name'),
        content: arg.string().describe('Full draft content'),
        update_from_previous_version: arg
            .string()
            .describe('What changed since the previous draft')
            .optional(),
        gitlab_workitem_id: gitlabIdArg(' (carried over from the previous draft when omitted)'),
        gitlab_workitem_url: gitlabUrlArg(' (carried over from the previous draft when omitted)'),
    },
    handler: async (_: unknown, context: InvocationContext): Promise<McpToolResponse> => {
        const a = toolArgs<DraftArgs>(context);
        const name = requiredString(a.name, 'name');
        context.log(`add_draft: ${name}`);
        return json(
            await addDraft(
                name,
                requiredString(a.content, 'content'),
                optionalString(a.update_from_previous_version),
                optionalString(a.gitlab_workitem_id),
                optionalString(a.gitlab_workitem_url)
            )
        );
    },
});

app.mcpTool('getDraft', {
    toolName: 'get_draft',
    description: 'Read one draft of a work item. Omit draft_version to get the latest.',
    toolProperties: {
        name: arg.string().describe('Work item name'),
        draft_version: arg.integer().describe('Draft version; omit for the latest').optional(),
    },
    handler: async (_: unknown, context: InvocationContext): Promise<McpToolResponse> => {
        const a = toolArgs<DraftArgs>(context);
        const name = requiredString(a.name, 'name');
        const version = optionalPositiveInt(a.draft_version, 'draft_version');
        const row = await getDraft(name, version);
        return row ? json(row) : notFound(name, version);
    },
});

app.mcpTool('listItems', {
    toolName: 'list_items',
    description: 'List the latest draft of every work item, with its total draft count.',
    toolProperties: {},
    handler: async (): Promise<McpToolResponse> => json(await listItems()),
});

app.mcpTool('listVersions', {
    toolName: 'list_versions',
    description: 'List every draft of one work item, oldest first.',
    toolProperties: {
        name: arg.string().describe('Work item name'),
    },
    handler: async (_: unknown, context: InvocationContext): Promise<McpToolResponse> => {
        const a = toolArgs<DraftArgs>(context);
        return json(await listVersions(requiredString(a.name, 'name')));
    },
});

app.mcpTool('searchItems', {
    toolName: 'search_items',
    description: 'Substring search over work item names and content.',
    toolProperties: {
        query: arg.string().describe('Substring to search for (case-insensitive)'),
        limit: arg.integer().describe('Max rows to return (default 20, max 200)').optional(),
    },
    handler: async (_: unknown, context: InvocationContext): Promise<McpToolResponse> => {
        const a = toolArgs<DraftArgs>(context);
        return json(await searchItems(requiredString(a.query, 'query'), limitArg(a.limit, 20)));
    },
});

app.mcpTool('updateDraft', {
    toolName: 'update_draft',
    description:
        'Edit an existing draft in place. Prefer add_draft when the change is a new revision. Pass an empty string for a GitLab field to clear it.',
    toolProperties: {
        name: arg.string().describe('Work item name'),
        draft_version: arg.integer().describe('Draft version to edit'),
        content: arg.string().describe('New draft content').optional(),
        update_from_previous_version: arg.string().describe('New change note').optional(),
        gitlab_workitem_id: gitlabIdArg('; pass an empty string to clear'),
        gitlab_workitem_url: gitlabUrlArg('; pass an empty string to clear'),
    },
    handler: async (_: unknown, context: InvocationContext): Promise<McpToolResponse> => {
        const a = toolArgs<DraftArgs>(context);
        const name = requiredString(a.name, 'name');
        const version = requiredPositiveInt(a.draft_version, 'draft_version');
        const row = await updateDraft(name, version, {
            content: optionalString(a.content),
            update_from_previous_version: optionalString(a.update_from_previous_version),
            gitlab_workitem_id: clearableString(a.gitlab_workitem_id),
            gitlab_workitem_url: clearableString(a.gitlab_workitem_url),
        });
        return row ? json(row) : notFound(name, version);
    },
});

app.mcpTool('deleteDraft', {
    toolName: 'delete_draft',
    description: 'Delete one draft, or every draft of a work item when draft_version is omitted.',
    toolProperties: {
        name: arg.string().describe('Work item name'),
        draft_version: arg.integer().describe('Draft version; omit to delete all drafts').optional(),
    },
    handler: async (_: unknown, context: InvocationContext): Promise<McpToolResponse> => {
        const a = toolArgs<DraftArgs>(context);
        const deleted = await deleteDraft(
            requiredString(a.name, 'name'),
            optionalPositiveInt(a.draft_version, 'draft_version')
        );
        return json({ deleted });
    },
});
