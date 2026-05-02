// backend/src/workers/consumer.ts
import { Kafka } from 'kafkajs';
import { createClient } from 'redis';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const kafka = new Kafka({
    clientId: 'ims-consumer-worker',
    brokers: ['127.0.0.1:9094'],
});

const consumer = kafka.consumer({ groupId: 'incident-processing-group' });
const redis = createClient({ url: 'redis://127.0.0.1:6379' });

redis.on('error', (err) => console.log('Redis Client Error', err));

async function start() {
    await redis.connect();
    await consumer.connect();
    await consumer.subscribe({ topic: 'raw-signals', fromBeginning: true });

    console.log('🎧 Consumer worker running. Connected to Redis, Redpanda, and Postgres.');

    await consumer.run({
        eachMessage: async ({ message }) => {
            if (!message.value) return;

            const signal = JSON.parse(message.value.toString());
            const componentId = signal.component_id;

            // 1. Debounce Logic
            const isNewIncident = await redis.set(`debounce:${componentId}`, 'active', {
                NX: true,
                EX: 10
            });

            let activeIncident;

            if (isNewIncident) {
                console.log(`🚨 NEW INCIDENT: [${signal.severity}] on ${componentId}`);

                // Use upsert so if the component already has an OPEN incident, we don't crash
                activeIncident = await prisma.incident.upsert({
                    where: { component_id: componentId },
                    update: {},
                    create: {
                        component_id: componentId,
                        severity: signal.severity,
                        status: 'OPEN'
                    }
                });

            } else {
                console.log(`💨 Debounced: ${componentId}`);
                // Fetch the currently active incident so we can link the signal to it
                activeIncident = await prisma.incident.findUnique({
                    where: { component_id: componentId }
                });
            }

            // 2. The Data Lake Write (Log every signal, linked to the incident)
            await prisma.signalLog.create({
                data: {
                    component_id: componentId,
                    incident_id: activeIncident?.id || null,
                    raw_payload: signal // Postgres JSONB handles this perfectly
                }
            });
        },
    });
}

start().catch(console.error);
