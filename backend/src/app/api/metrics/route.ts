// backend/src/app/api/metrics/route.ts
import { NextResponse } from 'next/server';
import { registry } from '@/lib/metrics';

export async function GET() {
    try {
        const metrics = await registry.metrics();
        return new NextResponse(metrics, {
            headers: {
                'Content-Type': registry.contentType,
            },
            status: 200,
        });
    } catch (error) {
        return new NextResponse('Error generating metrics', { status: 500 });
    }
}
