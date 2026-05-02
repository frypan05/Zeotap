// backend/src/lib/metrics.ts
import client from 'prom-client';

// Prevent duplicate metrics during Next.js hot-reloads
const globalForPrometheus = global as unknown as {
    signalCounter: client.Counter<string> | undefined;
};

// Create a counter to track every signal that hits our API
export const signalCounter = globalForPrometheus.signalCounter || new client.Counter({
    name: 'ims_signals_ingested_total',
    help: 'Total number of raw signals ingested by the API',
});

if (process.env.NODE_ENV !== 'production') {
    globalForPrometheus.signalCounter = signalCounter;
}

// Automatically collect default Node.js metrics (CPU, Memory, Event Loop Lag)
client.collectDefaultMetrics();

export const registry = client.register;
