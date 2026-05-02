// backend/src/tests/incidentStateMachine.test.ts
import { IncidentStateMachine } from '../lib/incidentStateMachine';
import { PrismaClient } from '@prisma/client';

// Mock Prisma so we don't hit the real database during unit tests
jest.mock('@prisma/client', () => {
    const mPrismaClient = {
        incident: {
            findUnique: jest.fn(),
            update: jest.fn(),
        },
    };
    return { PrismaClient: jest.fn(() => mPrismaClient) };
});

const prisma = new PrismaClient();

describe('IncidentStateMachine RCA Validation', () => {
    it('should THROW an error if trying to close an incident without an RCA', async () => {
        (prisma.incident.findUnique as jest.Mock).mockResolvedValue({
            id: 'test-incident-123',
            status: 'RESOLVED',
            rca: null, // NO RCA!
        });

        // FIX 1: Match the exact error string your state machine actually throws
        await expect(IncidentStateMachine.transition('test-incident-123', 'CLOSED'))
            .rejects
            .toThrow('Cannot close incident without an RCA.');
    });

    it('should ALLOW closing an incident if an RCA is present', async () => {
        // FIX 2: Create mock timestamps so the MTTR calculation doesn't crash
        const mockCreatedAt = new Date('2026-05-01T10:00:00Z');
        const mockSubmittedAt = new Date('2026-05-01T10:30:00Z'); // 30 minutes later

        (prisma.incident.findUnique as jest.Mock).mockResolvedValue({
            id: 'test-incident-123',
            status: 'RESOLVED',
            created_at: mockCreatedAt, // Provide the incident start time
            rca: {
                id: 'rca-123',
                root_cause: 'Database crash',
                submitted_at: mockSubmittedAt // Provide the RCA submission time
            },
        });

        (prisma.incident.update as jest.Mock).mockResolvedValue({
            id: 'test-incident-123',
            status: 'CLOSED',
        });

        const result = await IncidentStateMachine.transition('test-incident-123', 'CLOSED');
        expect(result.status).toBe('CLOSED');
    });
});
