import { normalizeTableFormat, COLOR_LETTERS } from './table-format.js';
import { sortCaratKeys } from './rapaport.js';
import { shouldDedupeCarat } from './dedupe-colors.js';

/** Collect every price cell as { carat, clarity, color, price } */
function flattenTable(table) {
    const cells = [];
    const normalized = normalizeTableFormat(table || {});

    for (const [carat, clarities] of Object.entries(normalized)) {
        if (!clarities || typeof clarities !== 'object') continue;
        for (const [clarity, colors] of Object.entries(clarities)) {
            if (!colors || typeof colors !== 'object') continue;
            for (const [color, price] of Object.entries(colors)) {
                if (price === undefined || price === null) continue;
                cells.push({ carat, clarity, color, price: Number(price) });
            }
        }
    }
    return cells;
}

function cellKey({ carat, clarity, color }) {
    return `${carat}|${clarity}|${color}`;
}

/**
 * Re-scan table vs saved JSON — returns match report.
 */
export function compareTables(savedTable, rescannedTable) {
    const saved = normalizeTableFormat(savedTable);
    const rescanned = normalizeTableFormat(rescannedTable);

    const savedMap = new Map(flattenTable(saved).map((c) => [cellKey(c), c.price]));
    const rescanMap = new Map(flattenTable(rescanned).map((c) => [cellKey(c), c.price]));

    const matched = [];
    const mismatches = [];
    const missingInSaved = [];
    const extraInSaved = [];

    for (const [key, rescanPrice] of rescanMap) {
        const savedPrice = savedMap.get(key);
        const parts = key.split('|');
        const entry = { carat: parts[0], clarity: parts[1], color: parts[2] };

        if (savedPrice === undefined) {
            missingInSaved.push({ ...entry, rescanned: rescanPrice });
        } else if (savedPrice !== rescanPrice) {
            mismatches.push({ ...entry, saved: savedPrice, rescanned: rescanPrice });
        } else {
            matched.push({ ...entry, price: savedPrice });
        }
    }

    for (const [key, savedPrice] of savedMap) {
        if (!rescanMap.has(key)) {
            const parts = key.split('|');
            extraInSaved.push({
                carat: parts[0],
                clarity: parts[1],
                color: parts[2],
                saved: savedPrice
            });
        }
    }

    const totalRescanned = rescanMap.size;
    const matchRate =
        totalRescanned > 0 ? Math.round((matched.length / totalRescanned) * 100) : 0;

    return {
        success: mismatches.length === 0 && missingInSaved.length === 0 && extraInSaved.length === 0,
        matchRate,
        summary: {
            matched: matched.length,
            mismatches: mismatches.length,
            missingInSaved: missingInSaved.length,
            extraInSaved: extraInSaved.length,
            rescannedCells: totalRescanned,
            savedCells: savedMap.size
        },
        caratRanges: {
            saved: sortCaratKeys(Object.keys(saved)),
            rescanned: sortCaratKeys(Object.keys(rescanned))
        },
        matched: matched.slice(0, 50),
        mismatches: mismatches.slice(0, 100),
        missingInSaved: missingInSaved.slice(0, 50),
        extraInSaved: extraInSaved.slice(0, 50)
    };
}

/** Spot-check IF prices for every color letter (D–N) per carat range */
export function sampleChecks(table) {
    const normalized = normalizeTableFormat(table);
    const samples = [];

    for (const carat of sortCaratKeys(Object.keys(normalized))) {
        const section = normalized[carat];
        if (!section?.IF) continue;
        const row = {};
        for (const letter of COLOR_LETTERS) {
            if (section.IF[letter] !== undefined) row[letter] = section.IF[letter];
        }
        if (Object.keys(row).length) {
            samples.push({ carat, clarity: 'IF', prices: row });
        }
    }

    return samples;
}

/** Find consecutive colors that still share the same price (should not happen on letter-layout ranges) */
export function findConsecutiveDuplicates(table) {
    const duplicates = [];
    const normalized = normalizeTableFormat(table || {});

    for (const [caratKey, section] of Object.entries(normalized)) {
        if (!shouldDedupeCarat(caratKey)) continue;

        for (const [clarity, colors] of Object.entries(section)) {
            if (!colors || typeof colors !== 'object') continue;

            for (let i = 1; i < COLOR_LETTERS.length; i++) {
                const prev = COLOR_LETTERS[i - 1];
                const curr = COLOR_LETTERS[i];
                const pPrev = colors[prev];
                const pCurr = colors[curr];

                if (
                    pPrev !== undefined &&
                    pCurr !== undefined &&
                    pPrev !== null &&
                    pCurr !== null &&
                    pPrev === pCurr
                ) {
                    duplicates.push({ carat: caratKey, clarity, prev, curr, price: pCurr });
                }
            }
        }
    }

    return duplicates;
}
