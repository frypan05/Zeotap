// backend/src/app/api/ingest/route.ts
import { NextResponse } from 'next/server';
import { Kafka } from 'kafkajs';
import { signalCounter } from '@/lib/metrics';

// Initialize Kafka outside the handler so the connection is reused
// (Crucial for high throughput)
const kafka = new Kafka({
    clientId: 'ims-ingestion-api',
    brokers: ['localhost:9094'], // External port defined in our docker-compose
});

const producer = kafka.producer();
let isProducerConnected = false;

async function connectProducer() {
    if (!isProducerConnected) {
        await producer.connect();
        isProducerConnected = true;
        console.log("Kafka Producer Connected");
    }
}

const WINDOW_SIZE_MS = 1000; // 1 second window
const MAX_REQUESTS_PER_WINDOW = 10000;

let requestCount = 0;
let windowStartTime = Date.now();

function checkRateLimit(): boolean {
    const now = Date.now();
    if (now - windowStartTime > WINDOW_SIZE_MS) {
        // Reset window
        windowStartTime = now;
        requestCount = 0;
    }

    requestCount++;
    return requestCount <= MAX_REQUESTS_PER_WINDOW;
}

export async function POST(req: Request) {
    try {

        // 1. Enforce Rate Limit
        if (!checkRateLimit()) {
            return NextResponse.json(
                { error: 'Rate limit exceeded. System is shedding load to prevent cascading failure.' },
                { status: 429 }
            );
        }

        const body = await req.json();

        // Basic validation (In production, use Zod for this)
        if (!body.component_id || !body.severity) {
            return NextResponse.json({ error: 'Invalid signal payload' }, { status: 400 });
        }
        signalCounter.inc();

        await connectProducer();

        // Fire and forget into the 'raw-signals' topic
        await producer.send({
            topic: 'raw-signals',
            messages: [
                {
                    key: body.component_id, // Partition by component ID ensures ordering!
                    value: JSON.stringify({ ...body, received_at: new Date().toISOString() })
                },
            ],
        });

        // 202 Accepted: We received it, but haven't processed it fully yet (Async logic)
        return NextResponse.json({ success: true, message: 'Signal ingested' }, { status: 202 });

    } catch (error) {
        console.error("Ingestion Error:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
