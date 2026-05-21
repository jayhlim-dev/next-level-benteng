import { COLOR_LETTERS } from './table-format.js';

/** Max plausible IF price for D color by carat range top */
export function getMaxPlausiblePrice(caratKey, clarity = 'IF') {
    const maxCarat = parseFloat(String(caratKey).split('-')[1]);
    if (Number.isNaN(maxCarat)) return 500;

    if (maxCarat <= 0.17) return 12;
    if (maxCarat <= 0.39) return 45;
    if (maxCarat <= 0.69) return 65;
    if (maxCarat <= 0.99) return 120;
    if (maxCarat <= 1.99) return 280;
    if (maxCarat <= 4.99) return 650;
    return 1500;
}

export function isSectionPlausible(caratKey, section) {
    if (!section?.IF) return false;
    const maxP = getMaxPlausiblePrice(caratKey);
    const d = section.IF.D ?? section.IF.d;
    if (d === undefined || d === null) return false;
    if (d > maxP) return false;
    if (d < 1 && maxCaratAbove017(caratKey)) return false;
    return true;
}

function maxCaratAbove017(caratKey) {
    const max = parseFloat(String(caratKey).split('-')[1]);
    return !Number.isNaN(max) && max > 0.17;
}

/** OCR lines that are notes, garbage, or misread headers — not price rows */
export function isGarbageDataLine(line) {
    if (!line || line.length < 3) return true;
    if (/may trade|discount|premium|illegal|unethical|reproduce|©|Tel:|www\.|RAPAPORT DIAMOND/i.test(line)) {
        return true;
    }
    if (/996|,\)|\t.*\t.*996/.test(line)) return true;

    const nums = (line.match(/\d+\.?\d*/g) || [])
        .map(Number)
        .filter((n) => n >= 5 && n < 2000);

    if (nums.length >= 4 && new Set(nums).size === 1) return true;
    if (nums.length >= 2 && nums[0] >= 80 && nums.every((n) => n === nums[0] || n < 10)) return true;

    return false;
}

/** Label-only row: "D-F" with no prices on same line */
export function isLabelOnlyGroupLine(line) {
    return /^\s*(D-F|G-H|I-J|K-L|M-N)\s*$/i.test(line.trim());
}

export function stripInvalidCaratSections(table) {
    const cleaned = { ...table };
    const warnings = [];

    for (const [caratKey, section] of Object.entries(cleaned)) {
        if (!isSectionPlausible(caratKey, section)) {
            delete cleaned[caratKey];
            warnings.push({
                carat: caratKey,
                message: `Removed ${caratKey}: prices do not match expected range for this carat (e.g. IF.D too high). OCR may be unreadable for this block.`
            });
        }
    }

    return { table: cleaned, warnings };
}
