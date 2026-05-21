/** Color → Rapaport color group */
const COLOR_TO_GROUP = {
    D: 'D-F',
    E: 'D-F',
    F: 'D-F',
    G: 'G-H',
    H: 'G-H',
    I: 'I-J',
    J: 'I-J',
    K: 'K-L',
    L: 'K-L',
    M: 'M-N',
    N: 'M-N'
};

/** Clarity → Rapaport clarity group */
const CLARITY_TO_GROUP = {
    IF: 'IF-VVS',
    VVS1: 'IF-VVS',
    VVS2: 'IF-VVS',
    VS1: 'VS',
    VS2: 'VS',
    SI1: 'SI1',
    SI2: 'SI2',
    SI3: 'SI3',
    I1: 'I1',
    I2: 'I2',
    I3: 'I3'
};

/** Standard Rapaport carat range keys */
export const CARAT_RANGES = [
    { key: '.01-.03', min: 0.01, max: 0.03 },
    { key: '.04-.07', min: 0.04, max: 0.07 },
    { key: '.08-.14', min: 0.08, max: 0.14 },
    { key: '.15-.17', min: 0.15, max: 0.17 },
    { key: '.18-.22', min: 0.18, max: 0.22 },
    { key: '.23-.29', min: 0.23, max: 0.29 },
    { key: '.30-.39', min: 0.3, max: 0.39 },
    { key: '.40-.49', min: 0.4, max: 0.49 },
    { key: '.50-.59', min: 0.5, max: 0.59 },
    { key: '.60-.69', min: 0.6, max: 0.69 },
    { key: '.70-.89', min: 0.7, max: 0.89 },
    { key: '.90-.99', min: 0.9, max: 0.99 },
    { key: '1.00-1.49', min: 1.0, max: 1.49 },
    { key: '1.50-1.99', min: 1.5, max: 1.99 },
    { key: '2.00-2.99', min: 2.0, max: 2.99 },
    { key: '3.00-3.99', min: 3.0, max: 3.99 },
    { key: '4.00-4.99', min: 4.0, max: 4.99 },
    { key: '5.00-5.99', min: 5.0, max: 5.99 },
    { key: '6.00-6.99', min: 6.0, max: 6.99 },
    { key: '7.00-7.99', min: 7.0, max: 7.99 },
    { key: '8.00-8.99', min: 8.0, max: 8.99 },
    { key: '9.00-9.99', min: 9.0, max: 9.99 },
    { key: '10.00-10.99', min: 10.0, max: 10.99 }
];

export const COLOR_GROUPS = ['D-F', 'G-H', 'I-J', 'K-L', 'M-N'];
export const CLARITY_GROUPS = ['IF-VVS', 'VS', 'SI1', 'SI2', 'SI3', 'I1', 'I2', 'I3'];

/** Sort carat range keys by minimum carat weight (not alphabetically) */
export function sortCaratKeys(keys) {
    const order = new Map(CARAT_RANGES.map((r, i) => [r.key, i]));

    return [...keys].sort((a, b) => {
        const oa = order.get(a);
        const ob = order.get(b);
        if (oa !== undefined && ob !== undefined) return oa - ob;
        const minA = parseFloat(String(a).split('-')[0]);
        const minB = parseFloat(String(b).split('-')[0]);
        return (Number.isNaN(minA) ? 0 : minA) - (Number.isNaN(minB) ? 0 : minB);
    });
}

export function getColorGroup(color) {
    const normalized = String(color || '')
        .trim()
        .toUpperCase()
        .replace(/[^A-Z]/g, '');
    return COLOR_TO_GROUP[normalized] || null;
}

export function getClarityGroup(clarity) {
    const normalized = String(clarity || '')
        .trim()
        .toUpperCase()
        .replace(/\s/g, '');
    return CLARITY_TO_GROUP[normalized] || null;
}

export function getCaratRangeKey(carat) {
    const value = parseFloat(String(carat).replace(/[^\d.]/g, ''));
    if (Number.isNaN(value)) return null;

    for (const range of CARAT_RANGES) {
        if (value >= range.min && value <= range.max) {
            return range.key;
        }
    }
    return null;
}

/** Normalize carat range key from OCR (e.g. "01-03" → ".01-.03", "1.00 - 1.49" → "1.00-1.49") */
export function normalizeCaratKey(raw) {
    if (!raw) return null;
    let s = String(raw)
        .trim()
        .replace(/\s/g, '')
        .replace(/CT\.?/gi, '');

    const direct = CARAT_RANGES.find((r) => r.key === s);
    if (direct) return direct.key;

    const rangeMatch = s.match(/(\d+\.\d+|\.\d+)-(\d+\.\d+|\.\d+)/);
    if (!rangeMatch) return null;

    const min = parseFloat(rangeMatch[1]);
    const max = parseFloat(rangeMatch[2]);
    if (Number.isNaN(min) || Number.isNaN(max)) return null;

    const fmt = (n) => (n < 1 ? n.toFixed(2).replace(/^0/, '') : n.toFixed(2));
    const key = `${fmt(min)}-${fmt(max)}`;

    const found = CARAT_RANGES.find((r) => r.key === key);
    if (found) return found.key;

    const alt = CARAT_RANGES.find((r) => r.key.replace(/\./g, '') === key.replace(/\./g, ''));
    return alt ? alt.key : key;
}

export function normalizeColorGroup(raw) {
    if (!raw) return null;
    const s = String(raw)
        .trim()
        .toUpperCase()
        .replace(/\s/g, '');

    if (COLOR_GROUPS.includes(s)) return s;

    const compact = s.replace(/[^A-Z-]/g, '');
    if (COLOR_GROUPS.includes(compact)) return compact;

    if (/^[DEF]$/.test(s)) return 'D-F';
    if (/^[GH]$/.test(s)) return 'G-H';
    if (/^[IJ]$/.test(s)) return 'I-J';
    if (/^[KL]$/.test(s)) return 'K-L';
    if (/^[MN]$/.test(s)) return 'M-N';

    const rangeMatch = s.match(/^([A-Z])-([A-Z])$/);
    if (rangeMatch) {
        const mapped = `${rangeMatch[1]}-${rangeMatch[2]}`;
        if (COLOR_GROUPS.includes(mapped)) return mapped;
    }

    return getColorGroup(s.charAt(0));
}

export function normalizeClarityGroup(raw) {
    if (!raw) return null;
    const s = String(raw)
        .trim()
        .toUpperCase()
        .replace(/\s/g, '');

    if (CLARITY_GROUPS.includes(s)) return s;

    if (/IF.?VVS|VVS.?IF|IF-VVS|VVS1|VVS2|^IF$/.test(s)) return 'IF-VVS';
    if (/^VS$|VS1|VS2/.test(s)) return 'VS';
    if (CLARITY_GROUPS.includes(s.replace(/[^A-Z0-9]/g, ''))) {
        return s.replace(/[^A-Z0-9]/g, '');
    }

    return getClarityGroup(s);
}

/** Resolve clarity input to keys to try on detailed tables (IF, VVS1, VVS2, …) */
function resolveClarityKeys(clarity) {
    const normalized = String(clarity || '')
        .trim()
        .toUpperCase()
        .replace(/\s/g, '');

    const direct = ['IF', 'VVS1', 'VVS2', 'VS1', 'VS2', 'SI1', 'SI2', 'SI3', 'I1', 'I2', 'I3'];
    if (direct.includes(normalized)) return [normalized];

    const group = getClarityGroup(clarity) || normalizeClarityGroup(clarity);
    const byGroup = {
        'IF-VVS': ['VVS2', 'VVS1', 'IF'],
        VS: ['VS2', 'VS1'],
        SI1: ['SI1'],
        SI2: ['SI2'],
        SI3: ['SI3'],
        I1: ['I1'],
        I2: ['I2'],
        I3: ['I3']
    };
    return byGroup[group] || [normalized];
}

/** Resolve color input to a single letter (D, E, F, …) */
export function resolveColorLetter(color) {
    const normalized = String(color || '')
        .trim()
        .toUpperCase()
        .replace(/[^A-Z]/g, '');
    if (normalized.length === 1 && COLOR_TO_GROUP[normalized]) return normalized;
    return null;
}

export function lookupPrice(table, carat, color, clarity) {
    const caratKey = getCaratRangeKey(carat);
    const colorLetter = resolveColorLetter(color);
    const colorGroup = getColorGroup(color) || normalizeColorGroup(color);
    const clarityKeys = resolveClarityKeys(clarity);

    if (!caratKey) {
        return {
            price: null,
            caratKey,
            colorKey: colorLetter || colorGroup,
            clarityKey: clarityKeys[0],
            error: 'Could not resolve carat range.'
        };
    }

    const section = table[caratKey];
    if (!section) {
        return {
            price: null,
            caratKey,
            colorKey: colorLetter || colorGroup,
            clarityKey: clarityKeys[0],
            error: `No data for carat range ${caratKey}.`
        };
    }

    // Detailed format: .90-.99 → IF → D → 96
    if (colorLetter) {
        for (const ck of clarityKeys) {
            const price = section[ck]?.[colorLetter];
            if (price !== undefined && price !== null) {
                return { price, caratKey, colorKey: colorLetter, clarityKey: ck, error: null };
            }
        }
    }

    // Legacy grouped format: .90-.99 → D-F → IF-VVS
    if (colorGroup && section[colorGroup] && typeof section[colorGroup] === 'object') {
        const colorSection = section[colorGroup];
        const groupClarity = getClarityGroup(clarity) || normalizeClarityGroup(clarity);
        let price = colorSection[groupClarity];
        if (price === undefined || price === null) {
            for (const ck of clarityKeys) {
                if (colorSection[ck] !== undefined) {
                    price = colorSection[ck];
                    break;
                }
            }
        }
        if (price !== undefined && price !== null) {
            return {
                price,
                caratKey,
                colorKey: colorLetter || colorGroup,
                clarityKey: groupClarity || clarityKeys[0],
                error: null
            };
        }
    }

    return {
        price: null,
        caratKey,
        colorKey: colorLetter || colorGroup,
        clarityKey: clarityKeys[0],
        error: `No price for ${clarityKeys[0]} / ${colorLetter || colorGroup} in ${caratKey}.`
    };
}
