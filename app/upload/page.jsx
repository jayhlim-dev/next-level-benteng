'use client';

import { useState, useRef } from 'react';
import { RapaportShell } from '../../components/rapaport-shell';
import { VerifyResult } from '../../components/verify-result';

export default function UploadPage() {
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const [verify, setVerify] = useState(null);
    const [verifying, setVerifying] = useState(false);
    const inputRef = useRef(null);

    const handleFileChange = (e) => {
        const selected = e.target.files?.[0];
        setFile(selected || null);
        setResult(null);
        setError(null);
        setVerify(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!file) {
            setError('Please select a PDF or image file.');
            return;
        }

        setLoading(true);
        setError(null);
        setResult(null);
        setVerify(null);

        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Upload failed');
            setResult(data);
            setFile(null);
            if (inputRef.current) inputRef.current.value = '';
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleVerify = async () => {
        if (!result?.filename) return;

        setVerifying(true);
        setVerify(null);
        setError(null);

        try {
            const res = await fetch('/api/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filename: result.filename })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Verification failed');
            setVerify(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setVerifying(false);
        }
    };

    return (
        <RapaportShell
            title="Upload Rapaport"
            subtitle="Upload a Rapaport PDF or image. Small carats use group rows (D-F→DEF); larger carats use one row per color (D, E, F…). Columns are clarities."
        >
            <form onSubmit={handleSubmit} className="max-w-xl">
                <div className="p-8 border border-dashed rounded-2xl border-neutral-700 bg-neutral-950/50">
                    <label className="block mb-4 text-sm font-medium text-neutral-300">
                        PDF, PNG, JPG, or JPEG
                    </label>
                    <input
                        ref={inputRef}
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg,image/png,image/jpeg,application/pdf"
                        onChange={handleFileChange}
                        className="block w-full text-sm text-neutral-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-white file:text-black hover:file:bg-neutral-200"
                    />
                    {file && (
                        <p className="mt-3 text-sm text-neutral-500">
                            Selected: <span className="text-white">{file.name}</span>
                        </p>
                    )}
                </div>

                <button
                    type="submit"
                    disabled={loading || !file}
                    className="mt-6 px-8 py-3 text-sm font-semibold text-black transition bg-white rounded-full hover:bg-neutral-200 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                    {loading ? 'Extracting…' : 'Generate JSON'}
                </button>
            </form>

            {error && (
                <div className="p-4 mt-8 text-sm text-red-300 border rounded-xl border-red-900/50 bg-red-950/30">
                    {error}
                </div>
            )}

            {result?.success && (
                <div className="p-6 mt-8 border rounded-2xl border-emerald-900/40 bg-emerald-950/20">
                    <p className="font-medium text-emerald-300">{result.message}</p>
                    <p className="mt-2 text-sm text-neutral-400">
                        Saved as <code className="text-white">{result.filename}</code>
                    </p>
                    {result.caratRanges?.length > 0 && (
                        <p className="mt-2 text-sm text-neutral-500">
                            Carat ranges detected: {result.caratRanges.join(', ')}
                        </p>
                    )}
                    {result.preview && (
                        <pre className="p-4 mt-4 overflow-auto text-xs rounded-xl bg-black/60 text-neutral-300 max-h-64">
                            {JSON.stringify(result.preview, null, 2)}
                        </pre>
                    )}

                    {result.validationWarnings?.length > 0 && (
                        <div className="p-4 mt-4 text-sm border rounded-xl border-red-900/40 bg-red-950/30 text-red-300">
                            <p className="font-medium">Some carat ranges could not be read</p>
                            <ul className="mt-2 space-y-1 text-xs">
                                {result.validationWarnings.map((w, idx) => (
                                    <li key={idx}>{w.message}</li>
                                ))}
                            </ul>
                            <p className="mt-2 text-xs text-neutral-500">
                                Use a clear Rapaport PDF scan (like the official price sheet). Garbled
                                OCR produces wrong values such as 96 for .30–.39 when the sheet shows ~30.
                            </p>
                        </div>
                    )}

                    {result.dedupeFixes?.length > 0 && (
                        <div className="p-4 mt-4 text-sm border rounded-xl border-amber-900/40 bg-amber-950/20 text-amber-200">
                            <p className="font-medium">
                                OCR duplicate prices corrected ({result.dedupeFixes.length})
                            </p>
                            <p className="mt-1 text-xs text-neutral-400">
                                When two colors in a row had the same value (e.g. H and I both 47), the
                                middle value was recalculated from neighbors (e.g. I → 41).
                            </p>
                            <ul className="mt-2 space-y-1 text-xs font-mono text-neutral-300">
                                {result.dedupeFixes.slice(0, 8).map((f, idx) => (
                                    <li key={idx}>
                                        {f.carat} {f.clarity}.{f.letter}: {f.from} → {f.to}
                                    </li>
                                ))}
                                {result.dedupeFixes.length > 8 && (
                                    <li>…and {result.dedupeFixes.length - 8} more</li>
                                )}
                            </ul>
                        </div>
                    )}

                    <div className="pt-4 mt-4 border-t border-emerald-900/30">
                        <p className="mb-3 text-sm text-neutral-400">
                            Double-check: re-scan the original Rapaport file and compare every price to
                            the saved JSON.
                        </p>
                        <button
                            type="button"
                            onClick={handleVerify}
                            disabled={verifying}
                            className="px-6 py-2.5 text-sm font-semibold text-black bg-white rounded-full hover:bg-neutral-200 disabled:opacity-50"
                        >
                            {verifying ? 'Verifying…' : 'Verify against Rapaport'}
                        </button>
                    </div>

                    <VerifyResult verify={verify} verifying={verifying} />
                </div>
            )}
        </RapaportShell>
    );
}
