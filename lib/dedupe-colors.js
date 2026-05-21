import { COLOR_LETTERS } from './table-format.js';
import { getMaxPlausiblePrice } from './validate-prices.js';

/** Carat ranges where each color has its own row — run duplicate fix */
export function shouldDedupeCarat(caratKey) {
    const parts = String(caratKey).split('-');
    if (parts.length !== 2) return false;

    const min = parseFloat(parts[0].startsWith('.') ? `0${parts[0]}` : parts[0]);
    const max = parseFloat(parts[1]);

    if (Number.isNaN(min) || Number.isNaN(max)) return false;

    if (min >= 0.9 && max <= 10.99) return true;
    if (min >= 0.3 && max <= 0.39) return true;
    if (min >= 0.7 && max <= 0.89) return true;

    return false;
}

/**
 * When OCR assigns the same price to consecutive colors (e.g. H=47, I=47),
 * correct using neighbors: I = round((H + J) / 2) → 41 when J=35.
 */
export function fixConsecutiveDuplicatePrices(table) {
    if (!table || typeof table !== 'object') return table;

    const fixes = [];

    for (const [caratKey, section] of Object.entries(table)) {
        if (!shouldDedupeCarat(caratKey) || !section || typeof section !== 'object') continue;

        for (const [clarity, colors] of Object.entries(section)) {
            if (!colors || typeof colors !== 'object') continue;

            for (let i = 1; i < COLOR_LETTERS.length; i++) {
                const prevLetter = COLOR_LETTERS[i - 1];
                const currLetter = COLOR_LETTERS[i];
                const nextLetter = COLOR_LETTERS[i + 1];

                const prevPrice = colors[prevLetter];
                const currPrice = colors[currLetter];
                const nextPrice = nextLetter ? colors[nextLetter] : null;

                if (currPrice === undefined || currPrice === null) continue;
                if (prevPrice === undefined || prevPrice === null) continue;
                if (currPrice !== prevPrice) continue;

                const maxP = getMaxPlausiblePrice(caratKey, clarity);
                if (currPrice > maxP) continue;

                let corrected = null;

                if (
                    nextPrice !== undefined &&
                    nextPrice !== null &&
                    prevPrice !== nextPrice
                ) {
                    corrected = Math.round((prevPrice + nextPrice) / 2);
                } else if (prevPrice > 10) {
                    corrected = Math.round(prevPrice * 0.9);
                }

                if (corrected !== null && corrected !== currPrice) {
                    colors[currLetter] = corrected;
                    fixes.push({
                        carat: caratKey,
                        clarity,
                        letter: currLetter,
                        from: currPrice,
                        to: corrected,
                        prev: prevLetter,
                        next: nextLetter,
                        prevPrice,
                        nextPrice
                    });
                }
            }
        }
    }

    return { table, fixes };
}
