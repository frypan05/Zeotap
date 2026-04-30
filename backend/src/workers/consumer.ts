// backend/src/workers/consumer.ts
import { Kafka } from 'kafkajs';
import { createClient } from 'redis';

// 1. Initialize Redpanda (Kafka) Client
const kafka = new Kafka({
    clientId: 'ims-consumer-worker',
    brokers: ['127.0.0.1:9094'], // Connecting from host to Docker
});

const consumer = kafka.consumer({ groupId: 'incident-processing-group' });

// 2. Initialize Redis Client
const redis = createClient({
    url: 'redis://127.0.0.1:6379'
});

redis.on('error', (err) => console.log('Redis Client Error', err));

async function start() {
    await redis.connect();
    console.log('🟢 Connected to Redis');

    await consumer.connect();
    console.log('🟢 Connected to Redpanda');

    await consumer.subscribe({ topic: 'raw-signals', fromBeginning: true });

    console.log('🎧 Listening for signals...');

    await consumer.run({
        // We process messages in batches for high throughput
        eachMessage: async ({ topic, partition, message }) => {
            if (!message.value) return;

            const signal = JSON.parse(message.value.toString());
            const componentId = signal.component_id;

            // --- THE DEBOUNCING LOGIC ---
            // Try to set a key in Redis. "NX" means "Only set if it Doesn't Exist".
            // "EX 10" means "Expire this key in 10 seconds".
            const isNewIncident = await redis.set(`debounce:${componentId}`, 'active', {
                NX: true,
                EX: 10
            });

            if (isNewIncident) {
                // This is the FIRST signal for this component in the last 10 seconds.
                console.log(`🚨 NEW INCIDENT: [${signal.severity}] on ${componentId}`);
                // TODO: In Phase 3, we will insert this into Postgres as a Work Item!
            } else {
                // We've already seen this recently. It's a duplicate/ongoing issue.
                // We skip creating an incident to save the database.
                console.log(`💨 Debounced (Skipped): ${componentId}`);
                // TODO: In Phase 3, we will dump this raw signal into the NoSQL audit log.
            }
        },
    });
}

start().catch(console.error);
