'use client';

const COLOR_GROUPS = [
    { label: 'D-F', letters: ['D', 'E', 'F'] },
    { label: 'G-H', letters: ['G', 'H'] },
    { label: 'I-J', letters: ['I', 'J'] },
    { label: 'K-L', letters: ['K', 'L'] },
    { label: 'M-N', letters: ['M', 'N'] }
];

export function VerifyResult({ verify, verifying }) {
    if (verifying) {
        return (
            <div className="p-6 mt-4 border rounded-2xl border-neutral-700 bg-neutral-950/50">
                <p className="text-sm text-neutral-400">Re-scanning Rapaport and comparing to saved JSON…</p>
            </div>
        );
    }

    if (!verify) return null;

    const { report, message } = verify;
    const ok = verify.success;

    return (
        <div
            className={`p-6 mt-4 border rounded-2xl ${
                ok ? 'border-emerald-900/40 bg-emerald-950/20' : 'border-amber-900/40 bg-amber-950/20'
            }`}
        >
            <p className={`font-medium ${ok ? 'text-emerald-300' : 'text-amber-200'}`}>{message}</p>

            {report && (
                <>
                    <div className="grid gap-3 mt-4 sm:grid-cols-2 lg:grid-cols-4">
                        <Stat label="Match rate" value={`${report.matchRate}%`} />
                        <Stat label="Matched cells" value={report.summary.matched} />
                        <Stat label="Mismatches" value={report.summary.mismatches} highlight={report.summary.mismatches > 0} />
                        <Stat
                            label="Missing in JSON"
                            value={report.summary.missingInSaved}
                            highlight={report.summary.missingInSaved > 0}
                        />
                    </div>

                    <p className="mt-3 text-sm text-neutral-500">
                        Full check: all {report.summary.matched} prices across{' '}
                        {report.caratRanges?.saved?.length ?? '—'} carat ranges, every clarity and color
                        (D–N). The table below is only a readable sample.
                    </p>

                    {verify.duplicatePrices?.length > 0 && (
                        <div className="p-4 mt-4 text-sm border rounded-xl border-red-900/40 bg-red-950/30 text-red-300">
                            <p className="font-medium">
                                Duplicate color prices ({verify.duplicatePrices.length})
                            </p>
                            <p className="mt-1 text-xs text-neutral-400">
                                Consecutive colors must not share the same price on .30–.39, .70–.89,
                                .90–10.99 ranges. Re-upload to auto-correct.
                            </p>
                            <ul className="mt-2 space-y-1 font-mono text-xs">
                                {verify.duplicatePrices.slice(0, 10).map((d, idx) => (
                                    <li key={idx}>
                                        {d.carat} {d.clarity}: {d.prev}={d.price}, {d.curr}={d.price}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {report.summary.extraInSaved > 0 && (
                        <p className="mt-2 text-sm text-neutral-500">
                            Extra in saved JSON (not in re-scan): {report.summary.extraInSaved}
                        </p>
                    )}

                    {verify.savedSamples?.length > 0 && (
                        <div className="mt-6">
                            <p className="mb-2 text-xs font-semibold tracking-wide uppercase text-neutral-500">
                                IF sample — all carat ranges (D–N: DEF, GH, IJ, KL, MN — saved vs scan)
                            </p>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left min-w-[720px]">
                                    <thead>
                                        <tr className="text-neutral-500 border-b border-neutral-800">
                                            <th rowSpan={2} className="py-2 pr-4 align-bottom">
                                                Carat
                                            </th>
                                            <th rowSpan={2} className="py-2 pr-4 align-bottom">
                                                Source
                                            </th>
                                            {COLOR_GROUPS.map((g) => (
                                                <th
                                                    key={g.label}
                                                    colSpan={g.letters.length}
                                                    className="py-2 text-center border-l border-neutral-800"
                                                >
                                                    {g.label}
                                                </th>
                                            ))}
                                        </tr>
                                        <tr className="text-xs text-neutral-600 border-b border-neutral-800">
                                            {COLOR_GROUPS.flatMap((g) =>
                                                g.letters.map((letter) => (
                                                    <th
                                                        key={letter}
                                                        className="py-1 text-center border-l border-neutral-900"
                                                    >
                                                        {letter}
                                                    </th>
                                                ))
                                            )}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {verify.savedSamples.map((s) => {
                                            const rescan = verify.rescannedSamples?.find(
                                                (r) => r.carat === s.carat
                                            );
                                            return (
                                                <tr key={s.carat} className="border-b border-neutral-900">
                                                    <td className="py-2 font-mono text-white">{s.carat}</td>
                                                    <td className="py-2 text-neutral-500">Saved / Scan</td>
                                                    {COLOR_GROUPS.flatMap((g) =>
                                                        g.letters.map((letter) => (
                                                            <td
                                                                key={letter}
                                                                className="py-2 text-center border-l border-neutral-900/50"
                                                            >
                                                                <CellPair
                                                                    saved={s.prices[letter]}
                                                                    scan={rescan?.prices[letter]}
                                                                />
                                                            </td>
                                                        ))
                                                    )}
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                            {report.caratRanges?.saved?.length > 0 && (
                                <p className="mt-3 text-xs text-neutral-600">
                                    Ranges verified: {report.caratRanges.saved.join(', ')}
                                </p>
                            )}
                        </div>
                    )}

                    {report.mismatches?.length > 0 && (
                        <details className="mt-4">
                            <summary className="text-sm cursor-pointer text-amber-300">
                                Show mismatches ({report.mismatches.length}
                                {report.summary.mismatches > report.mismatches.length ? '+' : ''})
                            </summary>
                            <pre className="p-4 mt-2 overflow-auto text-xs rounded-xl bg-black/60 text-neutral-300 max-h-48">
                                {JSON.stringify(report.mismatches, null, 2)}
                            </pre>
                        </details>
                    )}

                    {report.missingInSaved?.length > 0 && (
                        <details className="mt-2">
                            <summary className="text-sm cursor-pointer text-red-300">
                                Missing in saved JSON ({report.missingInSaved.length}+)
                            </summary>
                            <pre className="p-4 mt-2 overflow-auto text-xs rounded-xl bg-black/60 text-neutral-300 max-h-48">
                                {JSON.stringify(report.missingInSaved, null, 2)}
                            </pre>
                        </details>
                    )}
                </>
            )}
        </div>
    );
}

function Stat({ label, value, highlight }) {
    return (
        <div className="p-3 rounded-xl bg-black/40">
            <p className="text-xs text-neutral-500">{label}</p>
            <p className={`text-xl font-light ${highlight ? 'text-amber-300' : 'text-white'}`}>{value}</p>
        </div>
    );
}

function CellPair({ saved, scan }) {
    const match = saved === scan;
    return (
        <span className="font-mono text-xs">
            <span className={match ? 'text-white' : 'text-amber-300'}>{saved ?? '—'}</span>
            <span className="text-neutral-600"> / </span>
            <span className={match ? 'text-neutral-500' : 'text-red-300'}>{scan ?? '—'}</span>
        </span>
    );
}
