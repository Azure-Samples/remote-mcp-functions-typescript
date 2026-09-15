/**
 * MCP tools for the Claude question/answer log (table `qa_log`).
 * Same tool names and semantics as the mcp-memory-server `workitems` server.
 */
import { app, arg, InvocationContext, McpToolResponse } from '@azure/functions';
import { addQa, deleteQa, getQa, listQa, searchQa, updateQa } from '../db';
import {
    clearableString,
    errorResult,
    json,
    limitArg,
    optionalString,
    requiredPositiveInt,
    requiredString,
    toolArgs,
} from './mcpHelpers';

const qaNotFound = (id: number) => errorResult(`No Q&A entry found with id ${id}.`);

interface QaArgs {
    id?: number | string;
    question?: string;
    answer?: string;
    gitlab_workitem_id?: string | null;
    gitlab_workitem_url?: string | null;
    query?: string;
    limit?: number | string;
}

app.mcpTool('addQa', {
    toolName: 'add_qa',
    description:
        'Record a Claude question/answer exchange. GitLab work item id and URL are optional and can be attached later with update_qa.',
    toolProperties: {
        question: arg.string().describe('The question asked'),
        answer: arg.string().describe('The answer given'),
        gitlab_workitem_id: arg.string().describe('Related GitLab work item id').optional(),
        gitlab_workitem_url: arg.string().describe('Related GitLab work item URL').optional(),
    },
    handler: async (_: unknown, context: InvocationContext): Promise<McpToolResponse> => {
        const a = toolArgs<QaArgs>(context);
        return json(
            await addQa(
                requiredString(a.question, 'question'),
                requiredString(a.answer, 'answer'),
                optionalString(a.gitlab_workitem_id),
                optionalString(a.gitlab_workitem_url)
            )
        );
    },
});

app.mcpTool('getQa', {
    toolName: 'get_qa',
    description: 'Read one Q&A entry by id.',
    toolProperties: {
        id: arg.integer().describe('Q&A entry id'),
    },
    handler: async (_: unknown, context: InvocationContext): Promise<McpToolResponse> => {
        const id = requiredPositiveInt(toolArgs<QaArgs>(context).id, 'id');
        const row = await getQa(id);
        return row ? json(row) : qaNotFound(id);
    },
});

app.mcpTool('listQa', {
    toolName: 'list_qa',
    description: 'List Q&A entries, newest first. Optionally filter by GitLab work item id.',
    toolProperties: {
        gitlab_workitem_id: arg.string().describe('Only entries for this GitLab work item id').optional(),
        limit: arg.integer().describe('Max rows to return (default 50, max 200)').optional(),
    },
    handler: async (_: unknown, context: InvocationContext): Promise<McpToolResponse> => {
        const a = toolArgs<QaArgs>(context);
        return json(await listQa(optionalString(a.gitlab_workitem_id), limitArg(a.limit, 50)));
    },
});

app.mcpTool('searchQa', {
    toolName: 'search_qa',
    description: 'Substring search over Q&A questions and answers.',
    toolProperties: {
        query: arg.string().describe('Substring to search for (case-insensitive)'),
        limit: arg.integer().describe('Max rows to return (default 20, max 200)').optional(),
    },
    handler: async (_: unknown, context: InvocationContext): Promise<McpToolResponse> => {
        const a = toolArgs<QaArgs>(context);
        return json(await searchQa(requiredString(a.query, 'query'), limitArg(a.limit, 20)));
    },
});

app.mcpTool('updateQa', {
    toolName: 'update_qa',
    description:
        'Edit a Q&A entry, e.g. attach the GitLab work item id/URL after the work item is created. Pass an empty string for a GitLab field to clear it.',
    toolProperties: {
        id: arg.integer().describe('Q&A entry id'),
        question: arg.string().describe('New question text').optional(),
        answer: arg.string().describe('New answer text').optional(),
        gitlab_workitem_id: arg
            .string()
            .describe('GitLab work item id; pass an empty string to clear')
            .optional(),
        gitlab_workitem_url: arg
            .string()
            .describe('GitLab work item URL; pass an empty string to clear')
            .optional(),
    },
    handler: async (_: unknown, context: InvocationContext): Promise<McpToolResponse> => {
        const a = toolArgs<QaArgs>(context);
        const id = requiredPositiveInt(a.id, 'id');
        const row = await updateQa(id, {
            question: optionalString(a.question),
            answer: optionalString(a.answer),
            gitlab_workitem_id: clearableString(a.gitlab_workitem_id),
            gitlab_workitem_url: clearableString(a.gitlab_workitem_url),
        });
        return row ? json(row) : qaNotFound(id);
    },
});

app.mcpTool('deleteQa', {
    toolName: 'delete_qa',
    description: 'Delete one Q&A entry by id.',
    toolProperties: {
        id: arg.integer().describe('Q&A entry id'),
    },
    handler: async (_: unknown, context: InvocationContext): Promise<McpToolResponse> => {
        const id = requiredPositiveInt(toolArgs<QaArgs>(context).id, 'id');
        return json({ deleted: await deleteQa(id) });
    },
});
