import { InvocationContext, McpTextContent, McpToolResponse } from '@azure/functions';

/** Read the tool arguments the MCP extension puts on the invocation context. */
export function toolArgs<T extends object>(context: InvocationContext): T {
    return (context.triggerMetadata?.mcptoolargs ?? {}) as T;
}

/** Trim a string argument; undefined for missing/blank values. */
export function optionalString(value: unknown): string | undefined {
    if (value === undefined || value === null) return undefined;
    const s = String(value).trim();
    return s === '' ? undefined : s;
}

/** Like optionalString, but an explicit null or empty string maps to null (a clear request). */
export function clearableString(value: unknown): string | null | undefined {
    if (value === undefined) return undefined;
    if (value === null) return null;
    const s = String(value).trim();
    return s === '' ? null : s;
}

/** Positive integer argument; undefined when missing. Throws on garbage. */
export function optionalPositiveInt(value: unknown, name: string): number | undefined {
    if (value === undefined || value === null || value === '') return undefined;
    const n = Number(value);
    if (!Number.isInteger(n) || n <= 0) throw new Error(`${name} must be a positive integer`);
    return n;
}

export function requiredString(value: unknown, name: string): string {
    const s = optionalString(value);
    if (s === undefined) throw new Error(`${name} is required`);
    return s;
}

export function requiredPositiveInt(value: unknown, name: string): number {
    const n = optionalPositiveInt(value, name);
    if (n === undefined) throw new Error(`${name} is required`);
    return n;
}

/** Clamp a limit argument to [1, 200], falling back to the default. */
export function limitArg(value: unknown, fallback: number): number {
    const n = optionalPositiveInt(value, 'limit') ?? fallback;
    return Math.min(n, 200);
}

/** JSON text result, mirroring the memory server's `json()` helper. */
export function json(data: unknown): McpToolResponse {
    return new McpToolResponse({
        content: [new McpTextContent(JSON.stringify(data, null, 2))],
        structuredContent: data,
    });
}

/**
 * Descriptive failure (e.g. not found). The Functions MCP extension does not
 * forward `isError` from a returned McpToolResponse, and a thrown error is
 * replaced by a generic message, so the reason is returned as text plus a
 * structured `{ error }` object instead.
 */
export function errorResult(message: string): McpToolResponse {
    return new McpToolResponse({
        content: [new McpTextContent(message)],
        structuredContent: { error: message },
        isError: true,
    });
}
