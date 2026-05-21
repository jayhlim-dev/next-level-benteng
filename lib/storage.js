import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');

export function ensureDirs() {
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(UPLOADS_DIR)) {
        fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    }
}

export function getDataDir() {
    return DATA_DIR;
}

export function getUploadsDir() {
    return UPLOADS_DIR;
}

export function listJsonFiles() {
    ensureDirs();
    const files = fs.readdirSync(DATA_DIR).filter((f) => f.endsWith('.json'));
    return files
        .map((filename) => {
            const filePath = path.join(DATA_DIR, filename);
            const stat = fs.statSync(filePath);
            let data = null;
            try {
                const raw = fs.readFileSync(filePath, 'utf-8');
                data = JSON.parse(raw);
            } catch {
                data = null;
            }
            return {
                filename,
                createdAt: stat.birthtime.toISOString(),
                modifiedAt: stat.mtime.toISOString(),
                size: stat.size,
                data
            };
        })
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export function readJsonFile(filename) {
    ensureDirs();
    const safe = path.basename(filename);
    const filePath = path.join(DATA_DIR, safe);
    if (!fs.existsSync(filePath)) return null;
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw);
}

export function saveJsonFile(filename, data) {
    ensureDirs();
    const safe = path.basename(filename);
    const filePath = path.join(DATA_DIR, safe);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    return safe;
}

export function deleteJsonFile(filename) {
    ensureDirs();
    const safe = path.basename(filename);
    const filePath = path.join(DATA_DIR, safe);
    if (!fs.existsSync(filePath)) return false;
    fs.unlinkSync(filePath);
    return true;
}

export function saveUpload(filename, buffer) {
    ensureDirs();
    const safe = path.basename(filename);
    const filePath = path.join(UPLOADS_DIR, safe);
    fs.writeFileSync(filePath, buffer);
    return filePath;
}
