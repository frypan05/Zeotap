// backend/src/app/api/health/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
    // In Phase 5, we will add checks here to ping Kafka, Redis, and Postgres
    // to ensure downstream services are alive. For now, it reports API status.

  return NextResponse.json(
    {
      status: 'UP',
      timestamp: new Date().toISOString(),
      service: 'ims-backend-api'
    },
    { status: 200 }
  );
}
