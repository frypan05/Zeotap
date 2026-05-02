// backend/src/app/api/incidents/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
    try {
        const incidents = await prisma.incident.findMany({
            orderBy: { created_at: 'desc' },
            include: {
                _count: {
                    select: { signals: true } // Just get the count, not the massive payload
                },
                rca: true
            }
        });

        return NextResponse.json(incidents, { status: 200 });
    } catch (error) {
        console.error("API Error:", error);
        return NextResponse.json({ error: 'Failed to fetch incidents' }, { status: 500 });
    }
}
