// backend/src/app/api/incidents/[id]/rca/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { IncidentStateMachine } from '@/lib/incidentStateMachine';

const prisma = new PrismaClient();

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
    try {
        const params = await context.params; // <-- THE FIX
        const body = await req.json();
        const { root_cause, fix_applied, prevention_steps } = body;

        if (!root_cause || !fix_applied || !prevention_steps) {
            return NextResponse.json({ error: 'All RCA fields are required.' }, { status: 400 });
        }

        await prisma.rca.create({
            data: {
                incident_id: params.id,
                root_cause,
                fix_applied,
                prevention_steps
            }
        });

        const closedIncident = await IncidentStateMachine.transition(params.id, 'CLOSED');

        return NextResponse.json({ success: true, incident: closedIncident }, { status: 200 });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}
