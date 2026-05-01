import { app } from '@azure/functions';

app.setup({
    enableHttpStream: true,
});

// Import prompt functions to register them
import './functions/codeReviewChecklist';
import './functions/summarizeContent';
import './functions/generateDocumentation';
