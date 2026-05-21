/** Discount steps shown on calculator (5% through 40%) */
export const DISCOUNT_STEPS = [5, 10, 15, 20, 25, 30, 35, 40];

/** Max digit length for calculator input (~999 trillion Rp) */
export const MAX_INPUT_DIGITS = 15;

/**
 * Extract digits from formatted rupiah text ("1.000", "1.000.000", "1000").
 * Calculator uses whole rupiah only — dots/commas are thousand separators, not decimals.
 */
export function digitsFromRupiahInput(value) {
    if (value === null || value === undefined) return '';
    return String(value).replace(/\D/g, '');
}

/**
 * Parse Indonesian-style rupiah input into a whole-number amount.
 */
export function parseRupiahInput(value) {
    const digits = digitsFromRupiahInput(value);
    if (!digits) return null;

    const n = parseInt(digits, 10);
    if (Number.isNaN(n) || n < 0) return null;
    return n;
}

/** Normalize raw digit string (strip leading zeros, keep single "0") */
export function normalizeDigitInput(digits) {
    if (!digits) return '';
    return digits.replace(/^0+/, '') || '0';
}

/** Append zeros to raw digit string; returns prev unchanged if over limit */
export function appendZerosToDigits(prev, count, maxDigits = MAX_INPUT_DIGITS) {
    const base = prev === '' || prev === '0' ? '' : prev;
    if (!base) return prev;
    const next = base + '0'.repeat(count);
    if (next.length > maxDigits) return prev;
    return normalizeDigitInput(next);
}

/** Whether appending count zeros would exceed max digits */
export function canAppendZeros(prev, count, maxDigits = MAX_INPUT_DIGITS) {
    const base = prev === '' || prev === '0' ? '' : prev;
    if (!base) return false;
    return base.length + count <= maxDigits;
}

/** Parse raw digit string to number for calculations (avoids parseInt on long strings) */
export function rawDigitsToAmount(digits) {
    if (!digits || digits === '0') return null;
    try {
        const n = Number(BigInt(digits));
        if (Number.isNaN(n) || n <= 0) return null;
        return n;
    } catch {
        return null;
    }
}

/** Format raw digit string with Indonesian thousand separators */
export function formatRupiahDigitsFromRaw(digits) {
    if (!digits) return '';
    try {
        return new Intl.NumberFormat('id-ID', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(BigInt(digits));
    } catch {
        return digits;
    }
}

export function formatRupiah(amount) {
    if (amount === null || amount === undefined || Number.isNaN(amount)) return '—';
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
}

/** Display digits with Indonesian thousand separators (no Rp prefix) */
export function formatRupiahDigits(amount) {
    if (amount === null || amount === undefined || Number.isNaN(amount)) return '';
    return new Intl.NumberFormat('id-ID', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
}

/** Total hemat / potongan untuk pelanggan = harga awal − harga akhir */
export function calcTotalHemat(originalPrice, finalPrice) {
    const original = Number(originalPrice);
    const final = Number(finalPrice);
    if (Number.isNaN(original) || Number.isNaN(final)) return null;
    return Math.max(0, Math.round(original - final));
}

export function priceAfterDiscount(baseAmount, discountPercent) {
    const base = Number(baseAmount);
    const pct = Number(discountPercent);
    if (Number.isNaN(base) || Number.isNaN(pct)) return null;
    return Math.round(base * (1 - pct / 100));
}

export function buildRupiahDiscountRows(baseAmountRupiah) {
    if (baseAmountRupiah === null || baseAmountRupiah === undefined || baseAmountRupiah <= 0) {
        return [];
    }

    return DISCOUNT_STEPS.map((pct) => {
        const price = priceAfterDiscount(baseAmountRupiah, pct);
        return {
            percent: pct,
            price,
            savings: baseAmountRupiah - price
        };
    });
}

/** Second discount applied on price after the first discount (compound) */
export function applyAdditionalDiscount(priceAfterFirst, additionalPercent) {
    const intermediate = Number(priceAfterFirst);
    const pct = Number(additionalPercent);
    if (Number.isNaN(intermediate) || Number.isNaN(pct) || intermediate <= 0) return null;

    const finalPrice = priceAfterDiscount(intermediate, pct);
    return {
        additionalPercent: pct,
        intermediate,
        finalPrice,
        additionalSavings: intermediate - finalPrice
    };
}

export function buildStackedDiscountRows(priceAfterFirst) {
    if (priceAfterFirst == null || priceAfterFirst <= 0) return [];

    return DISCOUNT_STEPS.map((pct) => {
        const stacked = applyAdditionalDiscount(priceAfterFirst, pct);
        return {
            percent: pct,
            price: stacked.finalPrice,
            savings: stacked.additionalSavings
        };
    });
}
