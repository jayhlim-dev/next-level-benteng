/** Individual diamond colors (columns on Rapaport matrix) */
export const COLOR_LETTERS = ['D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N'];

/** Clarity columns on the printed Rapaport sheet (per row) */
export const SHEET_CLARITY_COLUMNS = ['IF-VVS', 'VS', 'SI1', 'SI2', 'SI3', 'I1', 'I2', 'I3'];

/** Stored JSON clarity keys expanded from each sheet column */
export const SHEET_TO_STORED_CLARITIES = {
    'IF-VVS': ['IF', 'VVS1', 'VVS2'],
    VS: ['VS1', 'VS2'],
    SI1: ['SI1'],
    SI2: ['SI2'],
    SI3: ['SI3'],
    I1: ['I1'],
    I2: ['I2'],
    I3: ['I3']
};

/** Clarity grades in JSON output */
export const CLARITY_COLUMNS = ['IF', 'VVS1', 'VVS2', 'VS1', 'VS2', 'SI1', 'SI2', 'SI3', 'I1', 'I2', 'I3'];

/** Color-group row on sheet → letters that share that row's prices */
export const GROUP_TO_LETTERS = {
    'D-F': ['D', 'E', 'F'],
    'G-H': ['G', 'H'],
    'I-J': ['I', 'J'],
    'K-L': ['K', 'L'],
    'M-N': ['M', 'N']
};

const GROUPED_COLOR_KEYS = new Set(Object.keys(GROUP_TO_LETTERS));

/** Detect grouped format: carat → "D-F" → "IF-VVS" → price */
export function isGroupedTable(table) {
    if (!table || typeof table !== 'object') return false;
    const firstCarat = Object.values(table)[0];
    if (!firstCarat || typeof firstCarat !== 'object') return false;
    return Object.keys(firstCarat).some((k) => GROUPED_COLOR_KEYS.has(k));
}

/** Detect detailed format: carat → "IF" → "D" → price */
export function isDetailedTable(table) {
    if (!table || typeof table !== 'object') return false;
    const firstCarat = Object.values(table)[0];
    if (!firstCarat || typeof firstCarat !== 'object') return false;
    const firstKey = Object.keys(firstCarat)[0];
    if (!CLARITY_COLUMNS.includes(firstKey)) return false;
    const firstClarity = firstCarat[firstKey];
    return firstClarity && typeof firstClarity === 'object' && COLOR_LETTERS.some((c) => c in firstClarity);
}

/**
 * One sheet row = one color letter; values across the row = IF, VVS1, VVS2, …
 * Example: D row [96,62,62,…] → IF.D=96, VVS1.D=62, VVS2.D=62
 */
export function assignColorLetterRow(section, colorLetter, clarityPrices) {
    if (!colorLetter || !clarityPrices?.length) return section;

    const clarities = CLARITY_COLUMNS.slice(0, clarityPrices.length);
    clarities.forEach((clarity, i) => {
        const price = clarityPrices[i];
        if (price === undefined || price === null) return;
        section[clarity] = section[clarity] || {};
        section[clarity][colorLetter] = price;
    });

    return section;
}

/**
 * One Rapaport row = one color group (D-F, G-H, …).
 * Values across the row = sheet clarities (IF-VVS, VS, SI1, …).
 * D-F → same price for D, E, F; G-H → G and H; etc.
 */
export function expandGroupRowIntoDetailed(section, colorGroup, clarityPrices) {
    const letters = GROUP_TO_LETTERS[colorGroup];
    if (!letters?.length || !clarityPrices?.length) return section;

    const sheetCols = SHEET_CLARITY_COLUMNS.slice(0, clarityPrices.length);

    sheetCols.forEach((sheetCol, i) => {
        const price = clarityPrices[i];
        if (price === undefined || price === null) return;

        const storedClarities = SHEET_TO_STORED_CLARITIES[sheetCol] || [sheetCol];
        storedClarities.forEach((clarity) => {
            section[clarity] = section[clarity] || {};
            letters.forEach((letter) => {
                section[clarity][letter] = price;
            });
        });
    });

    return section;
}

/** Convert full grouped table to detailed clarity → color structure */
export function toDetailedTable(table) {
    if (!table || typeof table !== 'object') return {};
    if (isDetailedTable(table)) return table;
    if (!isGroupedTable(table)) return table;

    const detailed = {};

    for (const [caratKey, colorGroups] of Object.entries(table)) {
        if (!colorGroups || typeof colorGroups !== 'object') continue;
        detailed[caratKey] = {};

        for (const [group, clarities] of Object.entries(colorGroups)) {
            if (!GROUP_TO_LETTERS[group]) continue;

            const prices = [];
            const groupedClarityOrder = ['IF-VVS', 'IF', 'VVS1', 'VVS2', 'VS', 'VS1', 'VS2', 'SI1', 'SI2', 'SI3', 'I1', 'I2', 'I3'];

            if (typeof clarities === 'object' && !Array.isArray(clarities)) {
                if (clarities['IF-VVS'] !== undefined) {
                    prices.push(clarities['IF-VVS']);
                    const vs = clarities.VS ?? clarities.VS2 ?? clarities.VS1;
                    prices.push(vs);
                    ['SI1', 'SI2', 'SI3', 'I1', 'I2', 'I3'].forEach((k) => {
                        if (clarities[k] !== undefined) prices.push(clarities[k]);
                    });
                } else {
                    groupedClarityOrder.forEach((k) => {
                        if (clarities[k] !== undefined) prices.push(clarities[k]);
                    });
                }
            }

            expandGroupRowIntoDetailed(detailed[caratKey], group, prices);
        }
    }

    return detailed;
}

/** Normalize parser output to detailed table */
export function normalizeTableFormat(table) {
    if (!table) return {};
    if (isDetailedTable(table)) return table;
    return toDetailedTable(table);
}
