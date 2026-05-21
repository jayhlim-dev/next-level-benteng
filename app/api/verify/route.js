import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { readJsonFile, getUploadsDir, ensureDirs } from '../../../lib/storage.js';
import { parseRapaportFile } from '../../../lib/parser.js';
import { normalizeTableFormat } from '../../../lib/table-format.js';
import { compareTables, sampleChecks, findConsecutiveDuplicates } from '../../../lib/verify.js';

export const runtime = 'nodejs';

export async function POST(request) {
    try {
        ensureDirs();
        const body = await request.json();
        const { filename } = body;

        if (!filename) {
            return NextResponse.json({ error: 'Filename is required.' }, { status: 400 });
        }

        const saved = readJsonFile(filename);
        if (!saved) {
            return NextResponse.json({ error: 'JSON file not found.' }, { status: 404 });
        }

        const uploadFile = saved.meta?.uploadFile;
        if (!uploadFile) {
            return NextResponse.json(
                { error: 'No source upload linked to this JSON. Re-upload the Rapaport file.' },
                { status: 400 }
            );
        }

        const uploadPath = path.join(getUploadsDir(), path.basename(uploadFile));
        if (!fs.existsSync(uploadPath)) {
            return NextResponse.json(
                { error: 'Original upload file missing from /uploads. Re-upload to verify.' },
                { status: 404 }
            );
        }

        const ext = path.extname(uploadPath).toLowerCase();
        const mime =
            ext === '.pdf'
                ? 'application/pdf'
                : ext === '.png'
                  ? 'image/png'
                  : 'image/jpeg';

        const { data: rescannedRaw } = await parseRapaportFile(uploadPath, mime);
        const rescanned = normalizeTableFormat(rescannedRaw);
        const savedTable = normalizeTableFormat(saved.table || saved);

        const report = compareTables(savedTable, rescanned);
        const remainingDuplicates = findConsecutiveDuplicates(savedTable);
        const rescannedDuplicates = findConsecutiveDuplicates(rescanned);

        const qualityOk = remainingDuplicates.length === 0;

        return NextResponse.json({
            success: report.success && qualityOk,
            message:
                report.success && qualityOk
                    ? 'Verification passed — scan matches JSON and no duplicate color prices in letter ranges.'
                    : !report.success
                      ? 'Verification found differences between saved JSON and a fresh scan.'
                      : `Found ${remainingDuplicates.length} consecutive duplicate color price(s) in saved JSON (e.g. H and I same). Re-upload or review OCR.`,
            filename,
            sourceFile: saved.meta?.sourceFile || uploadFile,
            report,
            savedSamples: sampleChecks(savedTable),
            rescannedSamples: sampleChecks(rescanned),
            duplicatePrices: remainingDuplicates.slice(0, 50),
            rescannedDuplicatePrices: rescannedDuplicates.slice(0, 20)
        });
    } catch (err) {
        console.error('Verify error:', err);
        return NextResponse.json(
            { error: err.message || 'Verification failed.' },
            { status: 500 }
        );
    }
}
