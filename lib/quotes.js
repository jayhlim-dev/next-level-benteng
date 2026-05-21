import fs from 'fs';
import path from 'path';

const QUOTES_PATH = path.join(process.cwd(), 'data', 'quotes.json');

export function loadQuotes() {
    const raw = fs.readFileSync(QUOTES_PATH, 'utf-8');
    const data = JSON.parse(raw);
    return data.quotes ?? [];
}

/** Pick a quote (stable per day, or random if no seed) */
export function getHeroQuote(seed) {
    const quotes = loadQuotes();
    if (!quotes.length) {
        return { id: 0, text: 'Kerja kecil yang konsisten menciptakan hasil besar.', locale: 'id' };
    }
    if (typeof seed === 'number') {
        return quotes[seed % quotes.length];
    }
    const dayIndex = Math.floor(Date.now() / 86_400_000);
    return quotes[dayIndex % quotes.length];
}
