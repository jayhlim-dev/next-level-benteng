import { NextResponse } from 'next/server';
import { listJsonFiles } from '../../../lib/storage.js';
import { lookupPrice } from '../../../lib/rapaport.js';
import { normalizeTableFormat } from '../../../lib/table-format.js';

export const runtime = 'nodejs';

async function runSearch({ carat, color, clarity }) {

        if (!carat || !color || !clarity) {
            return NextResponse.json(
                { error: 'Carat, color, and clarity are required.' },
                { status: 400 }
            );
        }

        const files = listJsonFiles();
        if (files.length === 0) {
            return NextResponse.json(
                { error: 'No Rapaport JSON files found. Upload a table first.' },
                { status: 404 }
            );
        }

        const results = [];

        for (const file of files) {
            const raw = file.data?.table || file.data;
            if (!raw || typeof raw !== 'object') continue;
            const table = normalizeTableFormat(raw);

            const lookup = lookupPrice(table, carat, color, clarity);
            if (lookup.price !== null) {
                results.push({
                    filename: file.filename,
                    createdAt: file.createdAt,
                    ...lookup
                });
            }
        }

        if (results.length === 0) {
            const sample = files[0];
            const raw = sample?.data?.table || sample?.data;
            const table = normalizeTableFormat(raw);
            const lookup = lookupPrice(table, carat, color, clarity);
            return NextResponse.json({
                success: false,
                message: lookup.error || 'No matching price found in any file.',
                resolved: {
                    caratKey: lookup.caratKey,
                    colorKey: lookup.colorKey,
                    clarityKey: lookup.clarityKey
                },
                filesSearched: files.length
            });
        }

        return NextResponse.json({
            success: true,
            query: { carat, color, clarity },
            results,
            bestMatch: results[0]
        });
}

export async function POST(request) {
    try {
        const body = await request.json();
        return await runSearch(body);
    } catch (err) {
        console.error('Search error:', err);
        return NextResponse.json({ error: err.message || 'Search failed.' }, { status: 500 });
    }
}

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const carat = searchParams.get('carat');
    const color = searchParams.get('color');
    const clarity = searchParams.get('clarity');

    if (!carat || !color || !clarity) {
        return NextResponse.json(
            { error: 'Query params carat, color, and clarity are required.' },
            { status: 400 }
        );
    }

    try {
        return await runSearch({ carat, color, clarity });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
