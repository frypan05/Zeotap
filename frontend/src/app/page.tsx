// frontend/src/app/page.tsx
import Link from 'next/link';

// Force Next.js to fetch fresh data on every request (no caching)
export const dynamic = 'force-dynamic';

async function getIncidents() {
    const res = await fetch('http://192.168.1.3:3001/api/incidents', { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to fetch incidents');
    return res.json();
}

export default async function Dashboard() {
    const incidents = await getIncidents();

    return (
        <main className="min-h-screen bg-gray-900 text-white p-8">
            <div className="max-w-6xl mx-auto">
                <header className="mb-8 border-b border-gray-700 pb-4">
                    <h1 className="text-3xl font-bold">🚨 Mission Control (IMS)</h1>
                    <p className="text-gray-400 mt-2">Active Infrastructure Incidents</p>
                </header>

                <div className="grid gap-4">
                    {incidents.map((inc: any) => (
                        <Link href={`/incident/${inc.id}`} key={inc.id}>
                            <div className="bg-gray-800 border border-gray-700 p-6 rounded-lg hover:border-blue-500 transition cursor-pointer flex justify-between items-center">

                                <div>
                                    <div className="flex items-center gap-3 mb-2">
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${inc.severity === 'P0' ? 'bg-red-600 text-white' :
                                            inc.severity === 'P1' ? 'bg-orange-600 text-white' :
                                                'bg-yellow-600 text-white'
                                            }`}>
                                            {inc.severity}
                                        </span>
                                        <h2 className="text-xl font-semibold font-mono">{inc.component_id}</h2>
                                    </div>
                                    <p className="text-sm text-gray-400">
                                        Created: {new Date(inc.created_at).toLocaleString()}
                                    </p>
                                </div>

                                <div className="text-right">
                                    <div className="text-2xl font-bold">{inc._count.signals}</div>
                                    <div className="text-xs text-gray-400 uppercase tracking-wide">Signals Linked</div>
                                    <div className={`mt-2 text-sm font-bold ${inc.status === 'CLOSED' ? 'text-green-500' : 'text-blue-400'}`}>
                                        {inc.status}
                                    </div>
                                </div>

                            </div>
                        </Link>
                    ))}
                    {incidents.length === 0 && <p className="text-gray-400">No active incidents. System is healthy.</p>}
                </div>
            </div>
        </main>
    );
}
