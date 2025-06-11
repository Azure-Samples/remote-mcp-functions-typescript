import { app, InvocationContext, input, output } from "@azure/functions";

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
const PROPERTY_TYPE = "string";

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
  toolProperties: [
    {
      propertyName: SNIPPET_NAME_PROPERTY_NAME,
      propertyType: PROPERTY_TYPE,
      description: SNIPPET_NAME_PROPERTY_DESCRIPTION,
    },
  ],
  extraInputs: [blobInputBinding],
  handler: getSnippet,
});

// Register the SaveSnippet tool
app.mcpTool("saveSnippet", {
  toolName: SAVE_SNIPPET_TOOL_NAME,
  description: SAVE_SNIPPET_TOOL_DESCRIPTION,
  toolProperties: [
    {
      propertyName: SNIPPET_NAME_PROPERTY_NAME,
      propertyType: PROPERTY_TYPE,
      description: SNIPPET_NAME_PROPERTY_DESCRIPTION,
    },
    {
      propertyName: SNIPPET_PROPERTY_NAME,
      propertyType: PROPERTY_TYPE,
      description: SNIPPET_PROPERTY_DESCRIPTION,
    },
  ],
  extraOutputs: [blobOutputBinding],
  handler: saveSnippet,
});
