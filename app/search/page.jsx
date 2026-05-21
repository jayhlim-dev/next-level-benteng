'use client';

import { useState } from 'react';
import { RapaportShell } from '../../components/rapaport-shell';

export default function SearchPage() {
    const [carat, setCarat] = useState('0.02');
    const [color, setColor] = useState('D');
    const [clarity, setClarity] = useState('VVS2');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);

    const handleSearch = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setResult(null);

        try {
            const res = await fetch('/api/search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ carat, color, clarity })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setResult(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <RapaportShell
            title="Search Prices"
            subtitle="Find Rapaport prices by carat, color letter (D–N), and clarity (IF, VVS1, VVS2, VS1, …)."
        >
            <form onSubmit={handleSearch} className="max-w-lg space-y-5">
                <div>
                    <label className="block mb-2 text-sm text-neutral-400">Carat</label>
                    <input
                        type="text"
                        value={carat}
                        onChange={(e) => setCarat(e.target.value)}
                        placeholder="0.02"
                        className="w-full px-4 py-3 text-white border rounded-xl border-neutral-700 bg-neutral-950 focus:outline-none focus:border-neutral-500"
                    />
                </div>
                <div>
                    <label className="block mb-2 text-sm text-neutral-400">Color</label>
                    <input
                        type="text"
                        value={color}
                        onChange={(e) => setColor(e.target.value)}
                        placeholder="D"
                        className="w-full px-4 py-3 text-white border rounded-xl border-neutral-700 bg-neutral-950 focus:outline-none focus:border-neutral-500"
                    />
                </div>
                <div>
                    <label className="block mb-2 text-sm text-neutral-400">Clarity</label>
                    <input
                        type="text"
                        value={clarity}
                        onChange={(e) => setClarity(e.target.value)}
                        placeholder="VVS2"
                        className="w-full px-4 py-3 text-white border rounded-xl border-neutral-700 bg-neutral-950 focus:outline-none focus:border-neutral-500"
                    />
                </div>
                <button
                    type="submit"
                    disabled={loading}
                    className="px-8 py-3 text-sm font-semibold text-black bg-white rounded-full hover:bg-neutral-200 disabled:opacity-50"
                >
                    {loading ? 'Searching…' : 'Search Price'}
                </button>
            </form>

            <div className="p-5 mt-8 text-sm border rounded-xl border-neutral-800 bg-neutral-950/30 text-neutral-500">
                <p className="mb-2 font-medium text-neutral-400">Grouping reference</p>
                <p>Color: single letter D, E, F, G, H, I, J, K, L, M, or N</p>
                <p className="mt-1">Clarity: IF, VVS1, VVS2, VS1, VS2, SI1, SI2, SI3, I1, I2, I3</p>
                <p className="mt-1 text-neutral-600">
                    JSON layout: carat → clarity → color (e.g. .90-.99 → VVS2 → D)
                </p>
            </div>

            {error && (
                <div className="p-4 mt-6 text-sm text-red-300 border rounded-xl border-red-900/50 bg-red-950/30">
                    {error}
                </div>
            )}

            {result?.success && result.bestMatch && (
                <div className="p-8 mt-8 border rounded-2xl border-neutral-700 bg-gradient-to-br from-neutral-900 to-black">
                    <p className="text-xs tracking-widest uppercase text-neutral-500">Rapaport Price</p>
                    <p className="mt-2 text-5xl font-light text-white">
                        {result.bestMatch.price}
                        <span className="ml-2 text-2xl text-neutral-500">/ct</span>
                    </p>
                    <dl className="grid gap-2 mt-6 text-sm sm:grid-cols-3">
                        <div>
                            <dt className="text-neutral-500">Carat range</dt>
                            <dd className="text-white">{result.bestMatch.caratKey}</dd>
                        </div>
                        <div>
                            <dt className="text-neutral-500">Color</dt>
                            <dd className="text-white">{result.bestMatch.colorKey}</dd>
                        </div>
                        <div>
                            <dt className="text-neutral-500">Clarity</dt>
                            <dd className="text-white">{result.bestMatch.clarityKey}</dd>
                        </div>
                    </dl>
                    <p className="mt-4 text-xs text-neutral-600">Source: {result.bestMatch.filename}</p>
                    {result.results?.length > 1 && (
                        <p className="mt-2 text-xs text-neutral-500">
                            {result.results.length} matching files found
                        </p>
                    )}
                </div>
            )}

            {result && !result.success && (
                <div className="p-6 mt-8 border rounded-2xl border-amber-900/40 bg-amber-950/20">
                    <p className="text-amber-200">{result.message}</p>
                    {result.resolved && (
                        <dl className="grid gap-2 mt-4 text-sm sm:grid-cols-3">
                            <div>
                                <dt className="text-neutral-500">Carat range</dt>
                                <dd>{result.resolved.caratKey || '—'}</dd>
                            </div>
                            <div>
                                <dt className="text-neutral-500">Color group</dt>
                                <dd>{result.resolved.colorKey || '—'}</dd>
                            </div>
                            <div>
                                <dt className="text-neutral-500">Clarity group</dt>
                                <dd>{result.resolved.clarityKey || '—'}</dd>
                            </div>
                        </dl>
                    )}
                </div>
            )}
        </RapaportShell>
    );
}
