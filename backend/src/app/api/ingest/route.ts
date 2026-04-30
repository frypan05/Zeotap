// backend/src/app/api/ingest/route.ts
import { NextResponse } from 'next/server';
import { Kafka } from 'kafkajs';

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

export async function POST(req: Request) {
    try {
        const body = await req.json();

        // Basic validation (In production, use Zod for this)
        if (!body.component_id || !body.severity) {
            return NextResponse.json({ error: 'Invalid signal payload' }, { status: 400 });
        }

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
        return NextResponse.json({ status: 'Accepted' }, { status: 202 });

    } catch (error) {
        console.error("Ingestion Error:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
