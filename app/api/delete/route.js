import { NextResponse } from 'next/server';
import { deleteJsonFile, listJsonFiles } from '../../../lib/storage.js';

export const runtime = 'nodejs';

export async function GET() {
    const files = listJsonFiles().map(({ filename, createdAt, modifiedAt, size }) => ({
        filename,
        createdAt,
        modifiedAt,
        size
    }));
    return NextResponse.json({ files });
}

export async function DELETE(request) {
    try {
        const body = await request.json();
        const { filename } = body;

        if (!filename) {
            return NextResponse.json({ error: 'Filename is required.' }, { status: 400 });
        }

        const deleted = deleteJsonFile(filename);
        if (!deleted) {
            return NextResponse.json({ error: 'File not found.' }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            message: `Deleted ${filename}.`
        });
    } catch (err) {
        console.error('Delete error:', err);
        return NextResponse.json({ error: err.message || 'Delete failed.' }, { status: 500 });
    }
}
