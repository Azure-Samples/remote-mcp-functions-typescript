/**
 * MCP Tool returning structured snippet data using CallToolResult.
 *
 * Demonstrates returning multiple content blocks (text + structured data):
 *   content:          [TextBlock, TextBlock(JSON)]
 *   structuredContent: the snippet object
 *
 * Usage:
 *   Tool input: { "snippet_name": "quickSort" }
 *   Response:   { type: "multi_content_result", ... }
 */

import { app, InvocationContext, arg } from "@azure/functions";
import { McpToolResponse, McpTextContent } from "@azure/functions";

// In-memory snippet storage (in production, use a database)
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

/**
 * Retrieves a code snippet with structured metadata.
 * Returns explicit content blocks + structuredContent via CallToolResult.
 */
export async function getCodeSnippet(
    toolArguments: unknown,
    context: InvocationContext
): Promise<McpToolResponse> {
    const args = context.triggerMetadata.mcptoolargs as { snippet_name?: string };
    const snippetName = args?.snippet_name || "quickSort";

    context.log(`Retrieving snippet: ${snippetName}`);

    const content = snippetCache[snippetName];
    if (!content) {
        throw new Error(`Snippet '${snippetName}' not found`);
    }

    const snippetData = {
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

    return new McpToolResponse({
        content: [
            new McpTextContent(`Snippet: ${snippetName} (${snippetData.lineCount} lines, ${snippetData.complexity})`),
            new McpTextContent(JSON.stringify(snippetData)),
        ],
        structuredContent: snippetData,
    });
}

// Register the snippet retrieval tool (named 'getCodeSnippet' to avoid collision with snippetsMcpTool)
app.mcpTool('getCodeSnippet', {
    toolName: 'getCodeSnippet',
    description: 'Retrieves a code snippet with full metadata as an McpToolResponse (explicit structuredContent demo).',
    toolProperties: {
        snippet_name: arg.string()
            .describe('Name of the snippet to retrieve (quickSort, binarySearch, etc.)')
            .optional()
    },
    handler: getCodeSnippet
});
