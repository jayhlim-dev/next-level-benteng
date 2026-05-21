'use client';

import { useState, useEffect, useCallback } from 'react';
import { RapaportShell } from '../../components/rapaport-shell';

export default function DeletePage() {
    const [files, setFiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [deleting, setDeleting] = useState(null);
    const [message, setMessage] = useState(null);

    const fetchFiles = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/delete');
            const data = await res.json();
            setFiles(data.files || []);
        } catch {
            setFiles([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchFiles();
    }, [fetchFiles]);

    const handleDelete = async (filename) => {
        if (!confirm(`Delete ${filename}?`)) return;

        setDeleting(filename);
        setMessage(null);

        try {
            const res = await fetch('/api/delete', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filename })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setMessage({ type: 'success', text: data.message });
            await fetchFiles();
        } catch (err) {
            setMessage({ type: 'error', text: err.message });
        } finally {
            setDeleting(null);
        }
    };

    return (
        <RapaportShell
            title="Delete Files"
            subtitle="Remove generated JSON files from /data."
        >
            {message && (
                <div
                    className={`mb-6 p-4 rounded-xl text-sm ${
                        message.type === 'success'
                            ? 'bg-emerald-950/30 text-emerald-300 border border-emerald-900/40'
                            : 'bg-red-950/30 text-red-300 border border-red-900/40'
                    }`}
                >
                    {message.text}
                </div>
            )}

            {loading ? (
                <p className="text-neutral-500">Loading…</p>
            ) : files.length === 0 ? (
                <div className="p-8 text-center border rounded-2xl border-neutral-800">
                    <p className="text-neutral-400">No files to delete.</p>
                </div>
            ) : (
                <ul className="space-y-3">
                    {files.map((file) => (
                        <li
                            key={file.filename}
                            className="flex flex-wrap items-center justify-between gap-4 p-5 border rounded-xl border-neutral-800 bg-neutral-950/50"
                        >
                            <div>
                                <p className="font-mono text-white">{file.filename}</p>
                                <p className="text-sm text-neutral-500">
                                    {new Date(file.createdAt).toLocaleString()}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => handleDelete(file.filename)}
                                disabled={deleting === file.filename}
                                className="px-5 py-2 text-sm font-medium text-red-300 border border-red-900/50 rounded-full hover:bg-red-950/40 disabled:opacity-50"
                            >
                                {deleting === file.filename ? 'Deleting…' : 'Delete'}
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </RapaportShell>
    );
}
