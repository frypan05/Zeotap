// frontend/src/app/incident/[id]/page.tsx
"use client";

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';

export default function IncidentDetail() {
    const router = useRouter();

    // 1. THE FIX: Use the hook to safely unwrap params in Next.js 15+
    const params = useParams();
    const incidentId = params?.id as string;

    const [incident, setIncident] = useState<any>(null);
    const [rcaForm, setRcaForm] = useState({ root_cause: '', fix_applied: '', prevention_steps: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        // Wait until the hook has successfully extracted the ID
        if (!incidentId) return;

        fetch(`/api/incidents/${incidentId}`)
            .then(res => res.json())
            .then(data => setIncident(data))
            .catch(err => console.error("Failed to load telemetry:", err));
    }, [incidentId]);

    const submitRCA = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        // 2. Use the safely extracted incidentId here as well
        const res = await fetch(`/api/incidents/${incidentId}/rca`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(rcaForm)
        });

        if (res.ok) {
            alert("RCA Submitted. Incident is now CLOSED.");
            router.push('/');
        } else {
            const data = await res.json();
            alert(`Error: ${data.error}`);
            setIsSubmitting(false);
        }
    };

    if (!incident) return <div className="p-10 text-white font-mono">Loading telemetry...</div>;

    return (
        <main className="min-h-screen bg-gray-900 text-white p-8">
            <div className="max-w-6xl mx-auto grid grid-cols-2 gap-8">

                {/* LEFT COLUMN: TELEMETRY & LOGS */}
                <div>
                    <button onClick={() => router.push('/')} className="text-blue-400 hover:text-blue-300 mb-6">
                        &larr; Back to Dashboard
                    </button>

                    <h1 className="text-3xl font-bold font-mono mb-2">{incident.component_id}</h1>
                    <div className="flex gap-4 mb-6 text-sm">
                        <span className="bg-gray-800 px-3 py-1 rounded">Status: {incident.status}</span>
                        <span className="bg-gray-800 px-3 py-1 rounded">Severity: {incident.severity}</span>
                    </div>

                    <h2 className="text-xl font-semibold mb-4 border-b border-gray-700 pb-2">Raw Error Signals</h2>
                    <div className="bg-black p-4 rounded-lg h-[500px] overflow-y-auto font-mono text-xs text-green-400">
                        {incident.signals && incident.signals.length > 0 ? (
                            incident.signals.map((sig: any) => (
                                <div key={sig.id} className="mb-3 border-b border-gray-800 pb-2">
                                    <div>[{new Date(sig.created_at).toLocaleTimeString()}]</div>
                                    <div>{JSON.stringify(sig.raw_payload)}</div>
                                </div>
                            ))
                        ) : (
                            <div className="text-gray-500">No error signals available</div>
                        )}
                    </div>
                </div>

                {/* RIGHT COLUMN: RCA WORKFLOW FORM */}
                <div className="bg-gray-800 p-8 rounded-lg border border-gray-700">
                    <h2 className="text-2xl font-bold mb-6 text-blue-400">Root Cause Analysis (RCA)</h2>

                    {incident.status === 'CLOSED' ? (
                        <div className="text-green-400 font-mono text-lg mt-10">
                            ✅ Incident fully resolved.<br />
                            MTTR: {incident.mttr_minutes} minutes.
                        </div>
                    ) : (
                        <form onSubmit={submitRCA} className="flex flex-col gap-4">
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">What was the root cause?</label>
                                <textarea required className="w-full bg-gray-900 border border-gray-700 rounded p-3 text-white" rows={3}
                                    value={rcaForm.root_cause} onChange={e => setRcaForm({ ...rcaForm, root_cause: e.target.value })} />
                            </div>

                            <div>
                                <label className="block text-sm text-gray-400 mb-1">What fix was applied?</label>
                                <textarea required className="w-full bg-gray-900 border border-gray-700 rounded p-3 text-white" rows={3}
                                    value={rcaForm.fix_applied} onChange={e => setRcaForm({ ...rcaForm, fix_applied: e.target.value })} />
                            </div>

                            <div>
                                <label className="block text-sm text-gray-400 mb-1">How do we prevent this?</label>
                                <textarea required className="w-full bg-gray-900 border border-gray-700 rounded p-3 text-white" rows={3}
                                    value={rcaForm.prevention_steps} onChange={e => setRcaForm({ ...rcaForm, prevention_steps: e.target.value })} />
                            </div>

                            <button disabled={isSubmitting} type="submit"
                                className="mt-4 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded transition disabled:opacity-50">
                                {isSubmitting ? 'Closing Incident...' : 'Submit RCA & Close Incident'}
                            </button>
                        </form>
                    )}
                </div>

            </div>
        </main>
    );
}
