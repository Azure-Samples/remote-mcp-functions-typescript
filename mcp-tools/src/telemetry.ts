/**
 * OpenTelemetry initialisation for the mcp-tools Azure Functions worker process.
 *
 * Design decisions:
 *
 *  SimpleSpanProcessor instead of BatchSpanProcessor
 *  ─────────────────────────────────────────────────
 *  Azure Functions Flex Consumption can idle/recycle the worker process within
 *  seconds of an invocation completing.  The default BatchSpanProcessor holds
 *  spans in memory for up to 5 s before flushing; recycling the process before
 *  that timer fires silently drops every span from that invocation.  The init
 *  spans that DO appear in Azure Monitor are exported synchronously during SDK
 *  startup — before any idle period.  Switching to SimpleSpanProcessor causes
 *  each span to be exported immediately on span.end(), guaranteeing delivery.
 *
 *  UndiciInstrumentation
 *  ─────────────────────
 *  Node 18+ global fetch() is backed by undici internally.  The standard HTTP
 *  instrumentation (node:http / node:https) does NOT capture fetch() calls.
 *  UndiciInstrumentation patches global fetch so outbound calls to
 *  geocoding-api.open-meteo.com and api.open-meteo.com appear as child
 *  dependency spans correlated with the parent weather tool span.
 *
 *  AzureFunctionsInstrumentation
 *  ──────────────────────────────
 *  Propagates the W3C traceparent from the Azure Functions host invocation into
 *  the worker's active context, so all worker spans are children of the host
 *  request span and show up in the correct operation hierarchy.
 */
import { AzureMonitorTraceExporter } from '@azure/monitor-opentelemetry-exporter';
import { ManagedIdentityCredential } from '@azure/identity';
import { AzureFunctionsInstrumentation } from '@azure/functions-opentelemetry-instrumentation';
import { UndiciInstrumentation } from '@opentelemetry/instrumentation-undici';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { NodeTracerProvider, SimpleSpanProcessor } from '@opentelemetry/sdk-trace-node';

let telemetryInitialized = false;

/**
 * Parse the managed identity client ID from APPLICATIONINSIGHTS_AUTHENTICATION_STRING.
 * Format: "ClientId=<uuid>;Authorization=AAD"
 * Returns undefined when the env var is absent (e.g. local dev).
 */
function getManagedIdentityClientId(): string | undefined {
    const authString = process.env.APPLICATIONINSIGHTS_AUTHENTICATION_STRING;
    if (!authString) return undefined;
    const match = authString.match(/ClientId=([^;]+)/i);
    return match ? match[1] : undefined;
}

export function initializeTelemetry(): void {
    if (telemetryInitialized) {
        return;
    }

    const aiConnectionString = process.env.APPLICATIONINSIGHTS_CONNECTION_STRING;
    if (!aiConnectionString) {
        // Skip in local dev — no-op, spans go nowhere.
        return;
    }

    // The deployed App Insights workspace has disableLocalAuth=true, meaning
    // InstrumentationKey-based (local auth) exports are rejected.
    // Parse the managed identity client ID from APPLICATIONINSIGHTS_AUTHENTICATION_STRING
    // and authenticate via AAD so exports are accepted.
    const clientId = getManagedIdentityClientId();
    const exporter = new AzureMonitorTraceExporter({
        connectionString: aiConnectionString,
        ...(clientId ? { credential: new ManagedIdentityCredential(clientId) } : {}),
    });

    // SimpleSpanProcessor: each span is exported synchronously on span.end().
    // This guarantees delivery even when the Flex Consumption worker is recycled
    // seconds after an invocation (no batch queue to lose).
    const provider = new NodeTracerProvider({
        spanProcessors: [new SimpleSpanProcessor(exporter)],
    });
    provider.register();

    registerInstrumentations({
        tracerProvider: provider,
        instrumentations: [
            new AzureFunctionsInstrumentation(),
            new UndiciInstrumentation(),
        ],
    });

    telemetryInitialized = true;
}

