import { app, InvocationContext, input, output, arg } from "@azure/functions";

// Constants matching the C# ToolsInformation class
const GET_SNIPPET_TOOL_NAME = "getsnippets";
const GET_SNIPPET_TOOL_DESCRIPTION =
  "Gets code snippets from your snippet collection.";
const SAVE_SNIPPET_TOOL_NAME = "savesnippet";
const SAVE_SNIPPET_TOOL_DESCRIPTION =
  "Saves a code snippet into your snippet collection.";
const SNIPPET_NAME_PROPERTY_NAME = "snippetname";
const SNIPPET_PROPERTY_NAME = "snippet";
const SNIPPET_NAME_PROPERTY_DESCRIPTION = "The name of the snippet.";
const SNIPPET_PROPERTY_DESCRIPTION = "The code snippet.";

// Define blob input and output bindings
const blobInputBinding = input.storageBlob({
  connection: "AzureWebJobsStorage",
  path: `snippets/{mcptoolargs.${SNIPPET_NAME_PROPERTY_NAME}}.json`,
});

const blobOutputBinding = output.storageBlob({
  connection: "AzureWebJobsStorage",
  path: `snippets/{mcptoolargs.${SNIPPET_NAME_PROPERTY_NAME}}.json`,
});

// GetSnippet function - retrieves a snippet by name
export async function getSnippet(
  _toolArguments: unknown,
  context: InvocationContext
): Promise<string> {
  console.info("Getting snippet");

  // Get snippet name from the tool arguments
  const mcptoolargs = context.triggerMetadata.mcptoolargs as {
    snippetname?: string;
  };
  const snippetName = mcptoolargs?.snippetname;

  console.info(`Snippet name: ${snippetName}`);

  if (!snippetName) {
    return "No snippet name provided";
  }

  // Get the content from blob binding - properly retrieving from extraInputs
  const snippetContent = context.extraInputs.get(blobInputBinding);

  if (!snippetContent) {
    return `Snippet '${snippetName}' not found`;
  }

  console.info(`Retrieved snippet: ${snippetName}`);
  return snippetContent as string;
}

// SaveSnippet function - saves a snippet with a name
export async function saveSnippet(
  _toolArguments: unknown,
  context: InvocationContext
): Promise<string> {
  console.info("Saving snippet");

  // Get snippet name and content from the tool arguments
  const mcptoolargs = context.triggerMetadata.mcptoolargs as {
    snippetname?: string;
    snippet?: string;
  };

  const snippetName = mcptoolargs?.snippetname;
  const snippet = mcptoolargs?.snippet;

  if (!snippetName) {
    return "No snippet name provided";
  }

  if (!snippet) {
    return "No snippet content provided";
  }

  // Save the snippet to blob storage using the output binding
  context.extraOutputs.set(blobOutputBinding, snippet);

  console.info(`Saved snippet: ${snippetName}`);
  return snippet;
}

// Register the GetSnippet tool
app.mcpTool("getSnippet", {
  toolName: GET_SNIPPET_TOOL_NAME,
  description: GET_SNIPPET_TOOL_DESCRIPTION,
  toolProperties: {
    [SNIPPET_NAME_PROPERTY_NAME]: arg.string().describe(SNIPPET_NAME_PROPERTY_DESCRIPTION)
  },
  extraInputs: [blobInputBinding],
  handler: getSnippet,
});

// Import Azure Storage SDK for listing blobs
import { BlobServiceClient } from "@azure/storage-blob";

// Summarize multiple snippets at once
export async function summarizeSnippets(
  _toolArguments: unknown,
  context: InvocationContext
): Promise<string> {
  console.info("Summarizing snippets");

  try {
    // Get the storage connection string
    const connectionString = process.env.AzureWebJobsStorage;
    if (!connectionString) {
      return "❌ Azure Storage connection string not configured";
    }

    // Create blob service client
    const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
    const containerClient = blobServiceClient.getContainerClient("snippets");
    
    if (!(await containerClient.exists())) {
      return "❌ No snippets container found";
    }

    let summary = `📊 **Snippets Summary**\n\n`;
    let totalWords = 0;
    let totalChars = 0;

    // Read and display all snippets
    for await (const blob of containerClient.listBlobsFlat()) {
      const blobClient = containerClient.getBlobClient(blob.name);
      const response = await blobClient.download();
      
      if (response.readableStreamBody) {
        const chunks = [];
        for await (const chunk of response.readableStreamBody) {
          chunks.push(chunk);
        }
        const content = Buffer.concat(chunks).toString();
        const words = content.trim().split(/\s+/).length;
        const chars = content.length;
        
        totalWords += words;
        totalChars += chars;
        
        const fileName = blob.name.replace('.json', '');
        summary += `**${fileName}** (${words} words, ${chars} chars)\n`;
        summary += `\`\`\`\n${content}\n\`\`\`\n\n`;
      }
    }

    summary = `📊 **Snippets Summary** (${totalWords} total words, ${totalChars} total chars)\n\n` + summary;
    return summary;

  } catch (error) {
    console.error("Error in summarizeSnippets:", error);
    return `❌ Error generating summary: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
}

// Register the SaveSnippet tool
app.mcpTool("saveSnippet", {
  toolName: SAVE_SNIPPET_TOOL_NAME,
  description: SAVE_SNIPPET_TOOL_DESCRIPTION,
  toolProperties: {
    [SNIPPET_NAME_PROPERTY_NAME]: arg.string().describe(SNIPPET_NAME_PROPERTY_DESCRIPTION),
    [SNIPPET_PROPERTY_NAME]: arg.string().describe(SNIPPET_PROPERTY_DESCRIPTION)
  },
  extraOutputs: [blobOutputBinding],
  handler: saveSnippet,
});

// Register the SummarizeSnippets tool
app.mcpTool("summarizeSnippets", {
  toolName: "summarize_snippets",
  description: "Analyze and summarize all code snippets in storage with statistics and insights",
  toolProperties: {
    // No parameters needed - analyzes all snippets in storage
  },
  handler: summarizeSnippets,
});
