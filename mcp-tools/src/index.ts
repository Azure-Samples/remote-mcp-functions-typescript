import { app } from '@azure/functions';
import { initializeTelemetry } from './telemetry';

initializeTelemetry();

app.setup({
    enableHttpStream: true,
});

// Import functions to register them
import './functions/helloMcpTool';
import './functions/helloMcpWithAuth';
import './functions/snippetsMcpTool';
import './functions/weatherServiceTool';
import './functions/structured-content/imageContentSample';
import './functions/structured-content/resourceLinkSample';
import './functions/structured-content/snippetDataSample';
