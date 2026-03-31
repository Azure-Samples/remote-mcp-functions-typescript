/**
 * MCP Tool returning structured data (CallToolResult with multiple content blocks)
 * 
 * This sample demonstrates how to return multiple content blocks:
 * - Text description/summary
 * - The structured data itself
 * - Resource links to related resources
 * 
 * This mimics the Python PR's CallToolResult pattern.
 * 
 * Usage:
 *   Tool input: { "snippet_name": "quickSort" }
 *   Response:   { type: "multi_content_result", content: [...multiple blocks...] }
 */

import { app, InvocationContext, output, arg } from "@azure/functions";

// In-memory snippet storage (in production, would be database)
const snippetCache: Record<string, string> = {
    quickSort: `function quickSort(arr) {
  if (arr.length <= 1) return arr;
  const pivot = arr[0];
  return [
    ...quickSort(arr.slice(1).filter(x => x < pivot)),
    pivot,
    ...quickSort(arr.slice(1).filter(x => x >= pivot))
  ];
}`,
    binarySearch: `function binarySearch(arr, target) {
  let left = 0, right = arr.length - 1;
  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    if (arr[mid] === target) return mid;
    if (arr[mid] < target) left = mid + 1;
    else right = mid - 1;
  }
  return -1;
}`
};

// Structured snippet data that will include metadata
interface CodeSnippet {
    name: string;
    content: string;
    language: string;
    lineCount: number;
    complexity: string;
    metadata?: Record<string, unknown>;
}

/**
 * Retrieves a code snippet with structured metadata.
 * Returns both text representation and structured data.
 */
export async function getCodeSnippet(
    toolArguments: unknown,
    context: InvocationContext
): Promise<CodeSnippet> {
    const args = context.triggerMetadata.mcptoolargs as { snippet_name?: string };
    const snippetName = args?.snippet_name || "quickSort";

    context.log(`Retrieving snippet: ${snippetName}`);

    const content = snippetCache[snippetName];
    if (!content) {
        throw new Error(`Snippet '${snippetName}' not found`);
    }

    // Return structured snippet data
    // This will be converted to structured content with both text and data representation
    return {
        name: snippetName,
        content: content,
        language: "javascript",
        lineCount: content.split('\n').length,
        complexity: snippetName === "quickSort" ? "O(n log n) average" : "O(log n)",
        metadata: {
            category: "algorithm",
            tags: ["sorting", "searching"],
            lastUpdated: new Date().toISOString(),
            version: "1.0"
        }
    };
}

// Register the snippet retrieval tool
app.mcpTool('getSnippet', {
    toolName: 'getSnippet',
    description: 'Retrieves a code snippet with full metadata as structured content.',
    toolProperties: {
        snippet_name: arg.string()
            .describe('Name of the snippet to retrieve (quickSort, binarySearch, etc.)')
            .optional()
    },
    handler: getCodeSnippet
});
