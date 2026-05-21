import fs from 'fs';
import path from 'path';
import os from 'os';
import { PDFParse } from 'pdf-parse';
import Tesseract from 'tesseract.js';
import {
    CARAT_RANGES,
    COLOR_GROUPS,
    CLARITY_GROUPS,
    normalizeCaratKey,
    normalizeColorGroup,
    normalizeClarityGroup
} from './rapaport.js';
import {
    assignColorLetterRow,
    expandGroupRowIntoDetailed,
    normalizeTableFormat,
    SHEET_CLARITY_COLUMNS,
    COLOR_LETTERS
} from './table-format.js';
import { fixConsecutiveDuplicatePrices } from './dedupe-colors.js';
import {
    isGarbageDataLine,
    isLabelOnlyGroupLine,
    stripInvalidCaratSections
} from './validate-prices.js';

const MIN_PDF_TEXT_LENGTH = 80;

/** Fix common OCR mistakes in Rapaport text (preserves line breaks) */
export function normalizeOcrText(text) {
    return String(text || '')
        .replace(/\r/g, '\n')
        .replace(/[|]/g, 'I')
        .replace(/[O](?=\d)/g, '0')
        .replace(/(?<=\d)[O]/g, '0')
        .replace(/[l](?=\d)/g, '1')
        .replace(/S[I1]1/gi, 'SI1')
        .replace(/S[I1]2/gi, 'SI2')
        .replace(/S[I1]3/gi, 'SI3')
        .replace(/VV5/gi, 'VVS')
        .replace(/1F/gi, 'IF')
        .replace(/[ \t]+/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

/** Detect carat section headers in text */
export function detectCaratSections(lines) {
    const sections = [];
    const caratPattern = /^\.?\d+\.?\d*\s*-\s*\.?\d+\.?\d*$|^\.?\d+\s*-\s*\.?\d+$/i;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        const cleaned = line.replace(/\s/g, '');
        if (caratPattern.test(cleaned) || /^\.?\d{2}-\.?\d{2}$/.test(cleaned)) {
            const key = normalizeCaratKey(line) || normalizeCaratKey(cleaned);
            if (key) {
                sections.push({ index: i, key, line });
            }
        }
    }
    return sections;
}

/** Detect clarity column headers from a header line */
export function detectClarityColumns(headerLine) {
    const tokens = headerLine.split(/\s+/).filter(Boolean);
    const columns = [];

    for (const token of tokens) {
        const group = normalizeClarityGroup(token);
        if (group && !columns.includes(group)) {
            columns.push(group);
        }
    }

    if (columns.length === 0) {
        for (const group of CLARITY_GROUPS) {
            if (headerLine.toUpperCase().includes(group.replace('-', '')) || headerLine.toUpperCase().includes(group)) {
                columns.push(group);
            }
        }
    }

    return columns.length ? columns : [...CLARITY_GROUPS];
}

/** Detect color row label */
export function detectColorRow(line) {
    const trimmed = line.trim();
    const firstToken = trimmed.split(/\s+/)[0];
    return normalizeColorGroup(firstToken) || normalizeColorGroup(trimmed.slice(0, 3));
}

/** Max plausible Rapaport price (hundreds $/ct) by carat range */
function getMaxPriceForCarat(caratKey) {
    const maxCarat = parseFloat(String(caratKey).split('-')[1]);
    if (Number.isNaN(maxCarat)) return 350;
    if (maxCarat <= 0.99) return 180;
    if (maxCarat <= 1.99) return 350;
    if (maxCarat <= 4.99) return 700;
    return 1400;
}

/** Parse numeric prices from remainder of a row */
export function parsePriceValues(line, expectedCount, maxPrice = 350) {
    const numbers = [];
    const matches = line.match(/\d+\.?\d*/g) || [];

    for (const m of matches) {
        const n = parseFloat(m);
        if (!Number.isNaN(n) && n >= 5 && n <= maxPrice) {
            numbers.push(n);
        }
    }

    return numbers.slice(0, expectedCount);
}

/** OCR markers where the right-hand table starts on dual-layout lines */
const RIGHT_TABLE_SPLIT =
    /\[\s*(?:LW|CW|IW|KM|RM|RK)|\b(?:LW|CW|EW|MW|OW|QW|WH|JON|KM|RM|RK|BWM|RWM|BW|WW|WM|HK)\s+\d/i;

/** Rapaport sheet row order: D-F (DEF), G-H, I-J, K-L, M-N */
const OCR_COLOR_GROUPS = ['D-F', 'G-H', 'I-J', 'K-L', 'M-N'];

/** Extract carat keys from Rapaport header lines like "(.01 - .03 CT.)" */
function extractCaratKeysFromHeader(line) {
    const keys = [];
    const re = /\(\s*(\d+\.\d+|\.\d+)\s*-\s*(\d+\.\d+|\.\d+)\s*CT\.?\s*\)/gi;
    let match;
    while ((match = re.exec(line)) !== null) {
        const key = normalizeCaratKey(`${match[1]}-${match[2]}`);
        if (key) keys.push(key);
    }
    return keys;
}

function isRapaportFooterLine(line) {
    return (
        /©\s*20\d{2}|reproduction|prices are made|WWW\.|Tel\.|Volume\s+\d+/i.test(line) ||
        /=\s*[\d.]+|SEd|HEED|5332|may trade|rade at|premium/i.test(line) ||
        /\d{4,}-\d{3,}/.test(line)
    );
}

/** Small-carat tables use 5 group rows (D-F, G-H…); larger tables use one row per letter (D, E, F…) */
function detectBlockLayout(peekLines) {
    let groupLabels = 0;
    for (const line of peekLines) {
        if (/\bD-F\b|\bG-H\b|\bI-J\b|\bK-L\b|\bM-N\b/i.test(line)) {
            groupLabels++;
        }
    }
    return groupLabels >= 1 ? 'group' : 'letter';
}

function peekDataLines(lines, startIdx) {
    const peek = [];
    for (let j = startIdx; j < lines.length && peek.length < 8; j++) {
        if (/RAPAPORT\s*:/i.test(lines[j])) break;
        if (isRapaportFooterLine(lines[j])) continue;
        peek.push(lines[j]);
    }
    return peek;
}

/** Scale OCR prices for melee sizes (7.6 read as 76) */
function adjustPricesForCarat(caratKey, prices) {
    const maxCarat = parseFloat(String(caratKey).split('-')[1]);
    if (Number.isNaN(maxCarat) || maxCarat > 0.2) return prices;
    if (prices.length && prices[0] > 15) {
        return prices.map((p) => Math.round((p / 10) * 10) / 10);
    }
    return prices;
}

/** Detect color-group row from OCR text or fixed row order on the sheet */
function detectOcrColorGroup(line, rowIndex) {
    const upper = line.toUpperCase();
    if (/\bD-F\b|D\s*-\s*F/.test(upper)) return 'D-F';
    if (/\bG-H\b|G\s*-\s*H/.test(upper)) return 'G-H';
    if (/\bI-J\b|I\s*-\s*J/.test(upper)) return 'I-J';
    if (/\bK-L\b|K\s*-\s*L/.test(upper)) return 'K-L';
    if (/\bM-N\b|M\s*-\s*N/.test(upper)) return 'M-N';

    if (rowIndex < OCR_COLOR_GROUPS.length) {
        return OCR_COLOR_GROUPS[rowIndex];
    }
    return null;
}

/** Split a dual-table OCR line into left/right table text */
function splitDualTableLine(line) {
    const match = line.match(RIGHT_TABLE_SPLIT);
    if (match && match.index > 10) {
        return [line.slice(0, match.index), line.slice(match.index)];
    }
    return [line];
}

/** Prices from one color-group row → aligns with sheet columns IF-VVS, VS, SI1, … */
function pricesToClarityArray(prices) {
    const count = Math.min(prices.length, SHEET_CLARITY_COLUMNS.length);
    return prices.slice(0, count);
}

function takeEightPrices(numbers) {
    if (numbers.length === 8) return numbers;
    if (numbers.length > 8) return numbers.slice(0, 8);
    return numbers;
}

/** Parse official Rapaport sheet OCR layout (side-by-side tables) */
export function parseRapaportOcrText(rawText) {
    const text = normalizeOcrText(rawText);
    const lines = text
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.length > 0);

    const result = {};
    let i = 0;

    while (i < lines.length) {
        if (!/RAPAPORT\s*:/i.test(lines[i])) {
            i++;
            continue;
        }

        const caratKeys = extractCaratKeysFromHeader(lines[i]);
        i++;

        if (!caratKeys.length) continue;

        const layout = detectBlockLayout(peekDataLines(lines, i));
        let rowIndex = 0;

        while (i < lines.length) {
            const line = lines[i];
            if (/RAPAPORT\s*:/i.test(line)) break;
            if (isRapaportFooterLine(line) || isGarbageDataLine(line)) {
                i++;
                continue;
            }

            if (layout === 'group' && isLabelOnlyGroupLine(line)) {
                i++;
                continue;
            }

            if (layout === 'letter' && rowIndex >= COLOR_LETTERS.length) {
                i++;
                continue;
            }

            if (layout === 'group') {
                const colorGroup = detectOcrColorGroup(line, rowIndex);
                if (!colorGroup) {
                    i++;
                    continue;
                }
            }

            const tableTexts = splitDualTableLine(line);
            const tableParts =
                tableTexts.length >= caratKeys.length
                    ? tableTexts.slice(0, caratKeys.length)
                    : tableTexts.length === 1 && caratKeys.length === 2
                      ? [tableTexts[0], tableTexts[0]]
                      : tableTexts;

            caratKeys.forEach((caratKey, tableIdx) => {
                const segment = tableParts[tableIdx] || tableParts[0];
                if (!segment) return;

                const maxPrice = getMaxPriceForCarat(caratKey);
                let numbers = takeEightPrices(parsePriceValues(segment, 12, maxPrice));
                if (numbers.length < 4) return;

                numbers = adjustPricesForCarat(caratKey, numbers);
                result[caratKey] = result[caratKey] || {};

                if (layout === 'letter') {
                    const colorLetter = COLOR_LETTERS[rowIndex];
                    assignColorLetterRow(result[caratKey], colorLetter, pricesToClarityArray(numbers));
                } else {
                    const colorGroup = detectOcrColorGroup(line, rowIndex);
                    expandGroupRowIntoDetailed(
                        result[caratKey],
                        colorGroup,
                        pricesToClarityArray(numbers)
                    );
                }
            });

            rowIndex++;
            i++;
        }
    }

    return result;
}

/** Build structured JSON from extracted plain text */
export function parseRapaportText(rawText) {
    const text = normalizeOcrText(rawText);

    if (/RAPAPORT\s*:/i.test(text)) {
        const ocrResult = parseRapaportOcrText(text);
        if (Object.keys(ocrResult).length > 0) return normalizeTableFormat(ocrResult);
    }

    const lines = text
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.length > 0);

    const result = {};
    const sections = detectCaratSections(lines);

    if (sections.length === 0) {
        return parseRapaportTextFallback(lines);
    }

    for (let s = 0; s < sections.length; s++) {
        const { key, index } = sections[s];
        const endIndex = s + 1 < sections.length ? sections[s + 1].index : lines.length;
        const block = lines.slice(index + 1, endIndex);

        result[key] = parseBlock(block);
    }

    const parsed = Object.keys(result).length ? result : parseRapaportTextFallback(lines);
    return normalizeTableFormat(parsed);
}

function parseBlock(block) {
    const section = {};
    let clarityColumns = [];

    for (const line of block) {
        const upper = line.toUpperCase();

        if (
            CLARITY_GROUPS.some((c) => upper.includes(c)) ||
            /IF|VVS|VS|SI|I1|I2|I3/.test(upper)
        ) {
            const cols = detectClarityColumns(line);
            if (cols.length > 1) {
                clarityColumns = cols;
                continue;
            }
        }

        const colorKey = detectColorRow(line);
        if (!colorKey) continue;

        const prices = parsePriceValues(line, clarityColumns.length || CLARITY_GROUPS.length);
        if (prices.length === 0) continue;

        expandGroupRowIntoDetailed(section, colorKey, pricesToClarityArray(prices));
    }

    return section;
}

/** Fallback: scan line-by-line for carat + color + prices */
function parseRapaportTextFallback(lines) {
    const result = {};
    let currentCarat = null;
    let clarityColumns = CLARITY_GROUPS;

    for (const line of lines) {
        const caratKey = normalizeCaratKey(line);
        if (caratKey && line.length < 20) {
            currentCarat = caratKey;
            result[currentCarat] = result[currentCarat] || {};
            continue;
        }

        if (!currentCarat) continue;

        const upper = line.toUpperCase();
        if (/IF|VVS|VS|SI/.test(upper) && !detectColorRow(line)) {
            const cols = detectClarityColumns(line);
            if (cols.length) clarityColumns = cols;
            continue;
        }

        const colorKey = detectColorRow(line);
        if (!colorKey) continue;

        const prices = parsePriceValues(line, clarityColumns.length);
        if (!prices.length) continue;

        const clarityPrices = pricesToClarityArray(prices);
        expandGroupRowIntoDetailed(result[currentCarat], colorKey, clarityPrices);
    }

    return normalizeTableFormat(result);
}

/** Extract text from PDF buffer (pdf-parse v2 API) */
export async function extractTextFromPdf(buffer) {
    const parser = new PDFParse({ data: buffer });
    try {
        const result = await parser.getText();
        let text = (result.text || '').trim();

        if (text.length < MIN_PDF_TEXT_LENGTH) {
            const ocrText = await extractTextFromPdfViaOcr(parser);
            if (ocrText.length > text.length) {
                text = ocrText;
            }
        }

        return text;
    } finally {
        await parser.destroy();
    }
}

/** Render PDF pages to images and OCR when there is no text layer */
async function extractTextFromPdfViaOcr(parser) {
    const screenshots = await parser.getScreenshot({ scale: 2 });
    const tmpDir = path.join(os.tmpdir(), 'rapaport-reader');
    fs.mkdirSync(tmpDir, { recursive: true });

    const worker = await Tesseract.createWorker('eng');
    const parts = [];

    try {
        for (const page of screenshots.pages || []) {
            const imgPath = path.join(tmpDir, `page-${page.num}-${Date.now()}.png`);
            const imgData = page.data ?? page.buffer;
            if (!imgData) continue;

            fs.writeFileSync(imgPath, imgData);
            const { data } = await worker.recognize(imgPath);
            parts.push(data.text || '');
            try {
                fs.unlinkSync(imgPath);
            } catch {
                /* ignore cleanup errors */
            }
        }
    } finally {
        await worker.terminate();
    }

    return parts.join('\n\n');
}

/** OCR image file path */
export async function extractTextFromImage(filePath) {
    const worker = await Tesseract.createWorker('eng');
    try {
        const { data } = await worker.recognize(filePath);
        return data.text || '';
    } finally {
        await worker.terminate();
    }
}

/** Full pipeline: file → structured Rapaport JSON */
export async function parseRapaportFile(filePath, mimeType) {
    const ext = path.extname(filePath).toLowerCase();
    let text = '';

    if (mimeType === 'application/pdf' || ext === '.pdf') {
        const buffer = fs.readFileSync(filePath);
        text = await extractTextFromPdf(buffer);
    } else if (['.png', '.jpg', '.jpeg', '.webp'].includes(ext)) {
        text = await extractTextFromImage(filePath);
    } else {
        throw new Error('Unsupported file type. Use PDF, PNG, JPG, or JPEG.');
    }

    let parsed = normalizeTableFormat(parseRapaportText(text));

    if (!parsed || Object.keys(parsed).length === 0) {
        throw new Error(
            'Could not extract Rapaport table data. Try a clearer scan or ensure the file contains a pricing table.'
        );
    }

    let { table, fixes } = fixConsecutiveDuplicatePrices(parsed);
    const { table: validated, warnings: validationWarnings } = stripInvalidCaratSections(table);
    table = validated;
    parsed = table;

    return {
        data: parsed,
        rawText: text,
        dedupeFixes: fixes,
        validationWarnings
    };
}

/** Merge partial parse with empty carat scaffold for missing ranges */
export function enrichParsedData(data) {
    const enriched = { ...data };
    for (const range of CARAT_RANGES) {
        if (!enriched[range.key]) {
            enriched[range.key] = enriched[range.key] || {};
        }
    }
    return enriched;
}
