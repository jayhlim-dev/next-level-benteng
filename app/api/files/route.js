import { NextResponse } from 'next/server';
import { listJsonFiles } from '../../../lib/storage.js';

export const runtime = 'nodejs';

export async function GET() {
    try {
        const files = listJsonFiles();
        return NextResponse.json({ files });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
