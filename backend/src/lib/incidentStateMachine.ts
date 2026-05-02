// backend/src/lib/incidentStateMachine.ts
import { PrismaClient, IncidentStatus } from '@prisma/client';

const prisma = new PrismaClient();

export class IncidentStateMachine {

    // 1. Define allowed transitions
    private static allowedTransitions: Record<IncidentStatus, IncidentStatus[]> = {
        OPEN: ['INVESTIGATING', 'RESOLVED'],
        INVESTIGATING: ['RESOLVED'],
        RESOLVED: ['CLOSED', 'INVESTIGATING'], // Can reopen if it breaks again
        CLOSED: [] // Terminal state
    };

    // 2. The Transition Logic
    static async transition(incidentId: string, newState: IncidentStatus) {
        const incident = await prisma.incident.findUnique({
            where: { id: incidentId },
            include: { rca: true }
        });

        if (!incident) throw new Error("Incident not found");

        // Check if transition is legal
        const validNextStates = this.allowedTransitions[incident.status];
        if (!validNextStates.includes(newState)) {
            throw new Error(`Illegal state transition from ${incident.status} to ${newState}`);
        }

        // MANDATORY RCA CHECK
        if (newState === 'CLOSED') {
            if (!incident.rca) {
                throw new Error("Cannot close incident without an RCA.");
            }

            // Calculate MTTR (Time from OPEN to RCA Submission)
            const mttrMs = incident.rca.submitted_at.getTime() - incident.created_at.getTime();
            const mttrMinutes = parseFloat((mttrMs / 1000 / 60).toFixed(2));

            return await prisma.incident.update({
                where: { id: incidentId },
                data: { status: newState, mttr_minutes: mttrMinutes }
            });
        }

        // Standard transition
        return await prisma.incident.update({
            where: { id: incidentId },
            data: { status: newState }
        });
    }
}
