import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { saveUpload, saveJsonFile, ensureDirs } from '../../../lib/storage.js';
import { parseRapaportFile } from '../../../lib/parser.js';
import { normalizeTableFormat } from '../../../lib/table-format.js';
import { sortCaratKeys } from '../../../lib/rapaport.js';

export const runtime = 'nodejs';

const ALLOWED_TYPES = new Set([
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/jpg'
]);

const ALLOWED_EXT = new Set(['.pdf', '.png', '.jpg', '.jpeg']);

export async function POST(request) {
    try {
        ensureDirs();
        const formData = await request.formData();
        const file = formData.get('file');

        if (!file || typeof file === 'string') {
            return NextResponse.json({ error: 'No file uploaded.' }, { status: 400 });
        }

        const name = file.name || 'upload';
        const ext = path.extname(name).toLowerCase();

        if (!ALLOWED_EXT.has(ext)) {
            return NextResponse.json(
                { error: 'Invalid file type. Allowed: PDF, PNG, JPG, JPEG.' },
                { status: 400 }
            );
        }

        const mime = file.type || '';
        if (mime && !ALLOWED_TYPES.has(mime) && mime !== 'image/jpg') {
            return NextResponse.json({ error: 'Invalid MIME type.' }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const uploadName = `${uuidv4()}${ext}`;
        const uploadPath = saveUpload(uploadName, buffer);

        const { data, dedupeFixes, validationWarnings } = await parseRapaportFile(
            uploadPath,
            mime || `application/${ext.slice(1)}`
        );
        const table = normalizeTableFormat(data);

        const jsonFilename = `rapaport-${uuidv4()}.json`;
        saveJsonFile(jsonFilename, {
            meta: {
                sourceFile: name,
                uploadFile: uploadName,
                createdAt: new Date().toISOString()
            },
            table
        });

        return NextResponse.json({
            success: true,
            message: 'Rapaport table extracted and saved successfully.',
            filename: jsonFilename,
            uploadFile: uploadName,
            caratRanges: sortCaratKeys(Object.keys(table)),
            preview: table,
            dedupeFixes: dedupeFixes || [],
            validationWarnings: validationWarnings || []
        });
    } catch (err) {
        console.error('Upload error:', err);
        return NextResponse.json(
            { error: err.message || 'Failed to process file.' },
            { status: 500 }
        );
    }
}
