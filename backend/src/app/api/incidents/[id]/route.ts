// backend/src/app/api/incidents/[id]/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient, IncidentStatus } from '@prisma/client';
import { IncidentStateMachine } from '@/lib/incidentStateMachine';

const prisma = new PrismaClient();

// Await the params object in Next.js 15
export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
    try {
        const params = await context.params; // <-- THE FIX

        const incident = await prisma.incident.findUnique({
            where: { id: params.id },
            include: {
                signals: {
                    orderBy: { created_at: 'desc' },
                    take: 50
                },
                rca: true
            }
        });

        if (!incident) return NextResponse.json({ error: 'Not found' }, { status: 404 });
        return NextResponse.json(incident, { status: 200 });
    } catch (error) {
        return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
    }
}

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
    try {
        const params = await context.params; // <-- THE FIX
        const body = await req.json();
        const { status } = body;

        const updatedIncident = await IncidentStateMachine.transition(params.id, status as IncidentStatus);

        return NextResponse.json(updatedIncident, { status: 200 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}
