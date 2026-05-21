import { listJsonFiles } from '../../lib/storage.js';
import { RapaportShell } from '../../components/rapaport-shell';

export const dynamic = 'force-dynamic';

export default function ViewPage() {
    const files = listJsonFiles();

    return (
        <RapaportShell
            title="JSON Viewer"
            subtitle="All generated Rapaport JSON files stored in /data."
        >
            {files.length === 0 ? (
                <div className="p-8 text-center border rounded-2xl border-neutral-800 bg-neutral-950/50">
                    <p className="text-neutral-400">No JSON files yet.</p>
                    <a href="/upload" className="inline-block mt-4 text-sm text-white underline">
                        Upload a Rapaport file
                    </a>
                </div>
            ) : (
                <div className="space-y-6">
                    {files.map((file) => {
                        const table = file.data?.table || file.data;
                        const preview = JSON.stringify(table, null, 2);
                        const created = new Date(file.createdAt).toLocaleString();

                        return (
                            <article
                                key={file.filename}
                                className="overflow-hidden border rounded-2xl border-neutral-800 bg-neutral-950/40"
                            >
                                <div className="flex flex-wrap items-start justify-between gap-4 p-6 border-b border-neutral-800">
                                    <div>
                                        <h2 className="font-mono text-lg text-white">{file.filename}</h2>
                                        <p className="mt-1 text-sm text-neutral-500">Created {created}</p>
                                        <p className="text-xs text-neutral-600">
                                            {(file.size / 1024).toFixed(1)} KB
                                        </p>
                                    </div>
                                </div>
                                <pre className="p-6 overflow-auto text-xs leading-relaxed text-neutral-300 max-h-96 bg-black/40">
                                    {preview}
                                </pre>
                            </article>
                        );
                    })}
                </div>
            )}
        </RapaportShell>
    );
}
