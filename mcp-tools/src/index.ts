import { app } from '@azure/functions';

app.setup({
    enableHttpStream: true,
});

// Import functions to register them
import './functions/helloMcpTool';
import './functions/snippetsMcpTool';
import './functions/structured-content/imageContentSample';
import './functions/structured-content/mcpContentDecoratorSample';
import './functions/structured-content/resourceLinkSample';
import './functions/structured-content/snippetDataSample';
