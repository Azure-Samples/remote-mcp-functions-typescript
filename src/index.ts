import { app } from '@azure/functions';

app.setup({
    enableHttpStream: true,
});

// Import functions to register them
import './functions/helloMcpTool';
import './functions/snippetsMcpTool';
import './functions/weatherMcpApp';
