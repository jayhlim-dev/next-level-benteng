'use client';

import Image from 'next/image';
import { useState, useMemo, useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { RapaportShell } from '../../components/rapaport-shell';
import { BrandLogo } from '../../components/brand-logo';
import { CALC_COVER_BG } from '../../lib/hero-assets';
import {
    digitsFromRupiahInput,
    normalizeDigitInput,
    countDigitsBefore,
    rupiahInputCursorAfterDigits,
    formatRupiah,
    formatRupiahDigitsFromRaw,
    rawDigitsToAmount,
    appendZerosToDigits,
    canAppendZeros,
    MAX_INPUT_DIGITS,
    buildRupiahDiscountRows,
    applyAdditionalDiscount,
    calcTotalHemat,
    DISCOUNT_STEPS
} from '../../lib/calculator.js';

function LockIcon({ className = 'w-5 h-5' }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
            <rect x="5" y="11" width="14" height="10" rx="2" />
            <path d="M8 11V8a4 4 0 0 1 8 0v3" strokeLinecap="round" />
        </svg>
    );
}

function UnlockIcon({ className = 'w-5 h-5' }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
            <rect x="5" y="11" width="14" height="10" rx="2" />
            <path d="M8 11V8a4 4 0 0 1 7-2" strokeLinecap="round" />
        </svg>
    );
}

const UNLOCK_HOLD_MS = 2000;
/** Ketuk cepat saat terbuka → kunci lagi */
const TAP_TO_LOCK_MS = 450;

function CustomerLockButton({ locked, unlockProgress, onPointerDown, onPointerUp }) {
    const radius = 18;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference * (1 - unlockProgress / 100);

    const stopPress = (e) => {
        e.preventDefault();
    };

    return (
        <button
            type="button"
            onClick={stopPress}
            onContextMenu={stopPress}
            onPointerDown={(e) => {
                stopPress(e);
                onPointerDown(e);
            }}
            onPointerUp={(e) => {
                stopPress(e);
                onPointerUp(e);
            }}
            onPointerLeave={onPointerUp}
            onPointerCancel={onPointerUp}
            className={`relative flex select-none items-center justify-center w-12 h-12 rounded-full shrink-0 touch-none transition-colors [-webkit-touch-callout:none] ${
                locked
                    ? 'text-neutral-600 bg-neutral-100 border border-neutral-200'
                    : 'text-amber-800 bg-amber-50 border border-amber-200 hover:bg-amber-100'
            }`}
            aria-label={locked ? 'Terkunci. Tahan 2 detik untuk buka kunci.' : 'Terbuka. ketuk kunci lagi.'}
            title={locked ? 'Staf: tahan 2 detik untuk buka' : 'Staf: ketuk kunci'}
        >
            <svg
                className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none"
                viewBox="0 0 48 48"
                aria-hidden
            >
                <circle
                    cx="24"
                    cy="24"
                    r={radius}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className={`transition-opacity ${
                        locked && unlockProgress > 0 ? 'text-emerald-400/80 opacity-100' : 'opacity-0'
                    }`}
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                />
            </svg>
            {locked ? <LockIcon /> : <UnlockIcon />}
            {locked && unlockProgress === 0 && (
                <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white" />
            )}
        </button>
    );
}

/** Extra discount from calculated total to staff-entered beautiful number */
function calcBeautifulNumberInfo(calculatedTotal, customAmount) {
    const base = Number(calculatedTotal);
    const custom = Number(customAmount);
    if (Number.isNaN(base) || Number.isNaN(custom) || base <= 0 || custom <= 0) return null;
    if (custom >= base) {
        return { savings: 0, percent: 0, sameOrHigher: true };
    }
    const savings = base - custom;
    const percent = Math.round((savings / base) * 1000) / 10;
    return { savings, percent, sameOrHigher: false };
}

function TotalPriceDisplay({ calculatedTotal, displayTotal, beautifulInfo }) {
    const hasBeautifulDiscount = beautifulInfo && !beautifulInfo.sameOrHigher;

    if (!hasBeautifulDiscount) {
        return (
            <span className="shrink-0 max-w-[55%] tabular-nums text-right text-xl font-semibold leading-snug text-neutral-900 sm:max-w-none sm:text-2xl">
                {formatRupiah(calculatedTotal)}
            </span>
        );
    }

    return (
        <div className="flex shrink-0 max-w-[55%] flex-col items-end gap-1 sm:max-w-none">
            <span className="tabular-nums text-sm leading-snug text-neutral-400 line-through">
                {formatRupiah(calculatedTotal)}
            </span>
            <div className="flex flex-wrap items-center justify-end gap-2">
                <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-semibold tabular-nums text-emerald-800">
                    −{beautifulInfo.percent}%
                </span>
                <span className="tabular-nums text-xl font-semibold leading-snug text-neutral-900 sm:text-2xl">
                    {formatRupiah(displayTotal)}
                </span>
            </div>
        </div>
    );
}

function InvoiceBeautifulTotal({
    calculatedTotal,
    displayTotal,
    expanded,
    onToggle,
    beautifulDigits,
    onBeautifulChange,
    onSubmit,
    beautifulInfo,
}) {
    const beautifulInputRef = useRef(null);
    const pendingCursorRef = useRef(null);

    useLayoutEffect(() => {
        const el = beautifulInputRef.current;
        const pos = pendingCursorRef.current;
        if (el == null || pos == null) return;
        el.setSelectionRange(pos, pos);
        pendingCursorRef.current = null;
    }, [beautifulDigits]);

    const handleBeautifulInputChange = (e) => {
        const input = e.target;
        const digits = normalizeDigitInput(digitsFromRupiahInput(input.value));
        if (digits.length > MAX_INPUT_DIGITS) return;

        const formatted = formatRupiahDigitsFromRaw(digits);
        const digitsBefore = countDigitsBefore(input.value, input.selectionStart ?? input.value.length);
        pendingCursorRef.current = rupiahInputCursorAfterDigits(formatted, digitsBefore);
        onBeautifulChange(digits);
    };

    return (
        <>
            <button
                type="button"
                onClick={onToggle}
                aria-expanded={expanded}
                className="flex w-full items-start justify-between gap-3 bg-neutral-50 px-4 py-4 text-left transition-colors sm:gap-6 sm:px-5 sm:py-4 hover:bg-neutral-100 touch-manipulation"
            >
                <span className="flex min-w-0 flex-1 items-start gap-2 leading-snug">
                    <svg
                        className={`mt-1 h-5 w-5 shrink-0 text-neutral-400 transition-transform ${expanded ? 'rotate-90' : ''}`}
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        aria-hidden
                    >
                        <path
                            fillRule="evenodd"
                            d="M7.21 14.77a.75.75 0 01.02-1.06L10.94 10 7.23 6.29a.75.75 0 111.06-1.06l4.25 4.25a.75.75 0 010 1.06l-4.25 4.25a.75.75 0 01-1.06-.02z"
                            clipRule="evenodd"
                        />
                    </svg>
                    <span className="text-base font-semibold text-neutral-900">Total</span>
                </span>
                <TotalPriceDisplay
                    calculatedTotal={calculatedTotal}
                    displayTotal={displayTotal}
                    beautifulInfo={beautifulInfo}
                />
            </button>
            {expanded ? (
                <div className="space-y-3 border-t border-neutral-100 bg-neutral-50/80 px-4 py-4 sm:px-5">
                    <div>
                        <p className="text-xs font-semibold tracking-wide uppercase text-neutral-500">Potongan Tambahan</p>
                        <p className="mt-1 text-xs text-neutral-500">Potongan dari total di atas</p>
                    </div>
                    <div className="relative">
                        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-neutral-400">
                            Rp
                        </span>
                        <input
                            ref={beautifulInputRef}
                            type="text"
                            inputMode="numeric"
                            value={beautifulDigits ? formatRupiahDigitsFromRaw(beautifulDigits) : ''}
                            onChange={handleBeautifulInputChange}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    onSubmit();
                                }
                            }}
                            onClick={(e) => e.stopPropagation()}
                            placeholder={formatRupiahDigitsFromRaw(String(calculatedTotal))}
                            className="w-full select-text rounded-lg border border-neutral-200 bg-white py-2.5 pl-9 pr-3 text-right font-mono text-base tabular-nums text-neutral-900 shadow-sm focus:border-neutral-400 focus:outline-none"
                            aria-label="Beautiful number"
                        />
                    </div>
                    {/* {beautifulInfo && !beautifulInfo.sameOrHigher ? (
                        <p className="text-xs tabular-nums text-amber-900">
                            Potongan tambahan{' '}
                            <span className="font-semibold">−{beautifulInfo.percent}%</span>
                            {' · '}
                            <span className="font-semibold">− {formatRupiah(beautifulInfo.savings)}</span>
                        </p>
                    ) : null} */}
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            onSubmit();
                        }}
                        className="w-full py-2.5 text-sm font-medium text-white rounded-lg bg-neutral-900 hover:bg-neutral-800 touch-manipulation"
                    >
                        Terapkan
                    </button>
                </div>
            ) : null}
        </>
    );
}

function InvoiceLine({ label, value, variant = 'default' }) {
    const valueClass =
        variant === 'discount'
            ? 'text-base text-neutral-600'
            : variant === 'total'
              ? 'text-xl font-semibold text-neutral-900 sm:text-2xl'
              : 'text-base font-medium text-neutral-900';

    const labelClass = variant === 'total' ? 'text-base font-semibold text-neutral-900' : 'text-base text-neutral-600';

    return (
        <div
            className={`flex items-start justify-between gap-3 px-4 py-4 sm:gap-6 sm:px-5 sm:py-4 ${
                variant === 'total' ? 'bg-neutral-50' : variant === 'discount' ? 'bg-neutral-50/60 pl-7 sm:pl-9' : ''
            }`}
        >
            <span className={`min-w-0 flex-1 leading-snug ${labelClass}`}>{label}</span>
            <span className={`shrink-0 max-w-[55%] tabular-nums text-right leading-snug sm:max-w-none ${valueClass}`}>
                {value}
            </span>
        </div>
    );
}

function InvoiceExpandableSubtotal({ label, value, expanded, onToggle, discountLabel, discountValue }) {
    return (
        <>
            {expanded ? <InvoiceLine label={discountLabel} value={discountValue} variant="discount" /> : null}
            <button
                type="button"
                onClick={onToggle}
                aria-expanded={expanded}
                className="flex w-full items-start justify-between gap-3 px-4 py-4 text-left transition-colors sm:gap-6 sm:px-5 sm:py-4 hover:bg-neutral-50 touch-manipulation"
            >
                <span className="flex min-w-0 flex-1 items-start gap-2 leading-snug">
                    <svg
                        className={`mt-1 h-5 w-5 shrink-0 text-neutral-400 transition-transform ${expanded ? 'rotate-90' : ''}`}
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        aria-hidden
                    >
                        <path
                            fillRule="evenodd"
                            d="M7.21 14.77a.75.75 0 01.02-1.06L10.94 10 7.23 6.29a.75.75 0 111.06-1.06l4.25 4.25a.75.75 0 010 1.06l-4.25 4.25a.75.75 0 01-1.06-.02z"
                            clipRule="evenodd"
                        />
                    </svg>
                    <span className="text-base text-neutral-600">{label}</span>
                </span>

                {/* hidden value */}
                {/* <span className="shrink-0 max-w-[55%] tabular-nums text-right text-base font-medium leading-snug text-neutral-900 sm:max-w-none">
                    {value}
                </span> */}
            </button>
        </>
    );
}

/** Customer-facing — no Tutup; lock prevents accidental dismiss for pelanggan */
function CustomerPriceModal({ row, baseAmount, additionalPercent, onClose }) {
    const [locked, setLocked] = useState(true);
    const [showSummary, setShowSummary] = useState(false);
    const [expandedPrimaryDiscount, setExpandedPrimaryDiscount] = useState(false);
    const [expandedAdditionalDiscount, setExpandedAdditionalDiscount] = useState(false);
    const [expandedBeautifulNumber, setExpandedBeautifulNumber] = useState(false);
    const [beautifulDigits, setBeautifulDigits] = useState('');
    const [unlockProgress, setUnlockProgress] = useState(0);
    const unlockTimerRef = useRef(null);
    const unlockIntervalRef = useRef(null);
    const unlockStartRef = useRef(null);
    const pointerDownAtRef = useRef(0);
    const justUnlockedViaHoldRef = useRef(false);

    const clearUnlockHold = useCallback(() => {
        if (unlockTimerRef.current) {
            clearTimeout(unlockTimerRef.current);
            unlockTimerRef.current = null;
        }
        if (unlockIntervalRef.current) {
            clearInterval(unlockIntervalRef.current);
            unlockIntervalRef.current = null;
        }
        unlockStartRef.current = null;
        setUnlockProgress(0);
    }, []);

    useEffect(() => {
        const onKey = (e) => {
            if (e.key === 'Escape' && !locked) onClose();
        };
        document.addEventListener('keydown', onKey);
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', onKey);
            document.body.style.overflow = '';
            document.body.style.userSelect = '';
            document.body.style.webkitUserSelect = '';
            clearUnlockHold();
        };
    }, [onClose, locked, clearUnlockHold]);

    const startUnlockHold = () => {
        if (!locked) return;
        clearUnlockHold();
        unlockStartRef.current = Date.now();
        unlockIntervalRef.current = setInterval(() => {
            const elapsed = Date.now() - (unlockStartRef.current ?? 0);
            setUnlockProgress(Math.min(100, (elapsed / UNLOCK_HOLD_MS) * 100));
        }, 40);
        unlockTimerRef.current = setTimeout(() => {
            justUnlockedViaHoldRef.current = true;
            setLocked(false);
            clearUnlockHold();
        }, UNLOCK_HOLD_MS);
    };

    const blockPageSelection = useCallback(() => {
        document.body.style.userSelect = 'none';
        document.body.style.webkitUserSelect = 'none';
    }, []);

    const restorePageSelection = useCallback(() => {
        document.body.style.userSelect = '';
        document.body.style.webkitUserSelect = '';
    }, []);

    const handleLockPointerDown = (e) => {
        e.preventDefault();
        blockPageSelection();
        pointerDownAtRef.current = Date.now();
        if (locked) startUnlockHold();
    };

    const handleLockPointerUp = () => {
        restorePageSelection();

        if (justUnlockedViaHoldRef.current) {
            justUnlockedViaHoldRef.current = false;
            clearUnlockHold();
            return;
        }

        const duration = Date.now() - pointerDownAtRef.current;

        if (locked) {
            clearUnlockHold();
            return;
        }

        if (duration < TAP_TO_LOCK_MS) {
            setLocked(true);
        }
    };

    const stacked =
        row && additionalPercent != null ? applyAdditionalDiscount(row.price, additionalPercent) : null;
    const finalPrice = stacked?.finalPrice ?? row?.price ?? null;

    useEffect(() => {
        setBeautifulDigits('');
        setExpandedBeautifulNumber(false);
    }, [finalPrice]);

    if (!row || baseAmount == null || finalPrice == null) return null;

    const beautifulAmount = rawDigitsToAmount(beautifulDigits);
    const displayTotal = beautifulAmount ?? finalPrice;
    const beautifulInfo =
        beautifulDigits !== '' && beautifulAmount != null
            ? calcBeautifulNumberInfo(finalPrice, beautifulAmount)
            : null;
    const totalHemat = calcTotalHemat(baseAmount, displayTotal);

    const handleToggleBeautiful = () => {
        setExpandedBeautifulNumber((open) => {
            if (!open && beautifulDigits === '') {
                setBeautifulDigits(String(finalPrice));
            }
            return !open;
        });
    };

    const handleSubmitBeautiful = () => {
        const amount = rawDigitsToAmount(beautifulDigits);
        if (amount == null || beautifulDigits === '') {
            setBeautifulDigits('');
        } else {
            setBeautifulDigits(String(amount));
        }
        setExpandedBeautifulNumber(false);
    };

    const invoiceBody = (
        <div className="overflow-hidden border rounded-lg border-neutral-200 divide-y divide-neutral-100">
            <InvoiceLine label="Harga awal" value={formatRupiah(baseAmount)} />
            <InvoiceExpandableSubtotal
                label={`Subtotal setelah diskon ${row.percent}%`}
                value={formatRupiah(row.price)}
                expanded={expandedPrimaryDiscount}
                onToggle={() => setExpandedPrimaryDiscount((v) => !v)}
                discountLabel={`Diskon ${row.percent}%`}
                discountValue={`− ${formatRupiah(row.savings)}`}
            />
            {stacked ? (
                <InvoiceExpandableSubtotal
                    label={`Subtotal setelah diskon ${additionalPercent}%`}
                    value={formatRupiah(finalPrice)}
                    expanded={expandedAdditionalDiscount}
                    onToggle={() => setExpandedAdditionalDiscount((v) => !v)}
                    discountLabel={`Diskon ${additionalPercent}% dari ${formatRupiah(row.price)}`}
                    discountValue={`− ${formatRupiah(stacked.additionalSavings)}`}
                />
            ) : null}
            <InvoiceBeautifulTotal
                calculatedTotal={finalPrice}
                displayTotal={displayTotal}
                expanded={expandedBeautifulNumber}
                onToggle={handleToggleBeautiful}
                beautifulDigits={beautifulDigits}
                onBeautifulChange={setBeautifulDigits}
                onSubmit={handleSubmitBeautiful}
                beautifulInfo={beautifulInfo}
            />
        </div>
    );

    const discountSummary =
        stacked && additionalPercent != null
            ? `diskon ${row.percent}% lalu ${additionalPercent}%`
            : `diskon ${row.percent}%`;

    const invoiceSummary = (
        <div className="min-w-0 space-y-3">
            <div className="min-w-0">
                <p className="mb-2 text-sm leading-relaxed text-neutral-500 sm:text-xs">
                    Harga awal dari input staf, lalu harga akhir setelah {discountSummary}.
                </p>
                <div className="w-full min-w-0 rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-4 sm:px-4 sm:py-3">
                    <div className="flex flex-col items-center gap-2 text-center text-neutral-600 sm:flex-row sm:justify-center sm:gap-2">
                        <span className="max-w-full break-all text-lg tabular-nums sm:text-sm">
                            {formatRupiah(baseAmount)}
                        </span>
                        <span className="shrink-0 text-lg text-neutral-400 sm:text-base" aria-hidden="true">
                            →
                        </span>
                        <span className="max-w-full break-all text-xl font-semibold tabular-nums text-neutral-900 sm:text-sm">
                            {formatRupiah(displayTotal)}
                        </span>
                    </div>
                </div>
            </div>

            {totalHemat != null && totalHemat > 0 && (
                <div className="w-full min-w-0 rounded-lg border border-blue-100 bg-blue-50/80 px-4 py-4 sm:px-4 sm:py-4">
                    <div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                        <span className="text-base font-medium text-blue-900 sm:text-sm">Total Potongan</span>
                        <span className="break-all text-2xl font-semibold tabular-nums text-blue-700 sm:text-right sm:text-xl">
                            {formatRupiah(totalHemat)}
                        </span>
                    </div>
                    <p className="mt-1.5 text-sm text-blue-800/70 sm:text-xs">Potongan dari harga awal</p>
                </div>
            )}
        </div>
    );

    const staffHint = locked ? (
        <p className="mt-2 text-sm text-neutral-500 sm:text-xs">
            Harga final untuk pelanggan · ketuk Total untuk harga cantik
            <span className="hidden sm:inline"> · Staf: tahan ikon kunci 2 detik untuk keluar</span>
        </p>
    ) : (
        <p className="mt-2 text-sm text-amber-800/80 sm:text-xs">Mode staf · ketuk Selesai untuk keluar</p>
    );

    return (
        <div
            className="fixed inset-0 z-50 flex max-md:items-stretch md:items-center md:justify-center bg-black/50 backdrop-blur-sm md:p-8"
            role="dialog"
            aria-modal="true"
            aria-label="Rincian perhitungan harga"
            onClick={locked ? undefined : onClose}
        >
            <div
                className="grid w-full min-h-0 grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden bg-white text-neutral-800 shadow-2xl select-none rounded-t-2xl [-webkit-touch-callout:none] max-md:h-svh max-md:max-h-svh md:max-h-[min(42rem,92vh)] md:max-w-4xl md:rounded-xl"
                onClick={(e) => e.stopPropagation()}
                onContextMenu={(e) => e.preventDefault()}
            >
                <header className="flex shrink-0 items-center justify-between gap-5 border-b border-neutral-200 px-5 py-5 sm:px-8 sm:py-6">
                    <div className="flex items-center gap-4 min-w-0 flex-1">
                        <BrandLogo variant="dark" className="h-9 w-auto shrink-0 md:h-10" />
                        <div className="min-w-0 pt-0.5 hidden xl:block">
                            <h2
                                id="customer-modal-title"
                                className="text-xl font-normal tracking-tight text-neutral-900 sm:text-2xl"
                            >
                                Rincian harga
                            </h2>
                            {staffHint}
                        </div>
                    </div>
                    <CustomerLockButton
                        locked={locked}
                        unlockProgress={unlockProgress}
                        onPointerDown={handleLockPointerDown}
                        onPointerUp={handleLockPointerUp}
                    />
                </header>

                <div className="min-h-0 overflow-x-hidden overflow-y-auto overscroll-y-contain touch-pan-y px-5 py-4 [-webkit-overflow-scrolling:touch] sm:px-8 sm:py-6">
                    <div className="mb-4 min-w-0 pt-0.5 xl:hidden">
                        <h2
                            id="customer-modal-title"
                            className="text-xl font-normal tracking-tight text-neutral-900 sm:text-2xl"
                        >
                            Rincian harga
                        </h2>
                        {staffHint}
                    </div>

                    <div className="grid min-w-0 gap-4 md:grid-cols-5 md:items-start md:gap-8">
                        <div className={`min-w-0 space-y-3 ${showSummary ? 'md:col-span-3' : 'md:col-span-5'}`}>
                            {invoiceBody}
                            <button
                                type="button"
                                onClick={() => setShowSummary((v) => !v)}
                                aria-expanded={showSummary}
                                className="w-full touch-manipulation rounded-lg border border-neutral-200 bg-neutral-50 py-2.5 text-base font-medium text-neutral-700 hover:bg-neutral-100"
                            >
                                {showSummary ? 'Sembunyikan Rincian' : 'Tampilkan Rincian'}
                            </button>
                        </div>
                        {showSummary ? (
                            <div className="min-w-0 border-t border-neutral-100 pt-4 md:col-span-2 md:border-t-0 md:pt-0 md:flex md:flex-col md:justify-center">
                                {invoiceSummary}
                            </div>
                        ) : null}
                    </div>
                </div>

                <footer className="relative z-10 shrink-0 border-t border-neutral-200 bg-white px-5 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[0_-4px_12px_rgba(0,0,0,0.06)] sm:px-8">
                    {!locked ? (
                        <button
                            type="button"
                            onClick={onClose}
                            className="w-full touch-manipulation rounded-lg bg-neutral-900 py-3.5 text-base font-medium text-white hover:bg-neutral-800"
                        >
                            Selesai
                        </button>
                    ) : (
                        <p className="text-center text-[11px] text-neutral-400 sm:hidden">
                            Staf: tahan ikon kunci 2 detik untuk keluar
                        </p>
                    )}
                </footer>
            </div>
        </div>
    );
}

const KEYPAD = ['7', '8', '9', '4', '5', '6', '1', '2', '3', 'C', '0', '⌫'];

const displayClass =
    'w-full min-w-0 px-5 py-4 text-3xl font-light tracking-wide text-right text-neutral-900 border rounded-xl border-neutral-200 bg-white font-mono tabular-nums shadow-sm';

const keyClass =
    'py-4 text-xl font-medium text-neutral-800 transition border rounded-xl border-neutral-200 bg-neutral-50 hover:bg-white active:scale-[0.98] touch-manipulation min-h-[52px] shadow-sm';

const quickZeroClass =
    'py-3 text-sm font-semibold text-neutral-700 transition border rounded-xl border-neutral-200 bg-white hover:bg-neutral-50 active:scale-[0.98] touch-manipulation min-h-[48px] shadow-sm';

const panelClass = 'p-6 border rounded-2xl border-white/70 bg-white/95 text-neutral-900 shadow-xl backdrop-blur-sm';

function CalculatePageBackground() {
    return (
        <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none" aria-hidden>
            <Image src={CALC_COVER_BG} alt="" fill priority unoptimized className="object-cover scale-110 blur-lg" />
            <div className="absolute inset-0 bg-black/40" />
        </div>
    );
}

export default function CalculatePage() {
    const [rawDigits, setRawDigits] = useState('');
    const [activeRow, setActiveRow] = useState(null);
    const [additionalPercent, setAdditionalPercent] = useState(null);
    const [showCustomerModal, setShowCustomerModal] = useState(false);

    const baseAmount = useMemo(() => rawDigitsToAmount(rawDigits), [rawDigits]);

    const displayValue = rawDigits ? formatRupiahDigitsFromRaw(rawDigits) : '';

    const canAdd00 = canAppendZeros(rawDigits, 2);
    const canAdd000000 = canAppendZeros(rawDigits, 6);

    const discountRows = useMemo(() => buildRupiahDiscountRows(baseAmount), [baseAmount]);

    const stacked = useMemo(() => {
        if (!activeRow || additionalPercent == null) return null;
        return applyAdditionalDiscount(activeRow.price, additionalPercent);
    }, [activeRow, additionalPercent]);

    const previewFinalPrice = stacked?.finalPrice ?? activeRow?.price ?? null;

    const selectRow = (row) => {
        setActiveRow(row);
        setAdditionalPercent(null);
        setShowCustomerModal(false);
    };

    const appendDigit = useCallback((digit) => {
        setRawDigits((prev) => {
            const next = prev === '' || prev === '0' ? digit : prev + digit;
            if (next.length > MAX_INPUT_DIGITS) return prev;
            return normalizeDigitInput(next);
        });
    }, []);

    const appendZeros = useCallback((count) => {
        setRawDigits((prev) => appendZerosToDigits(prev, count));
    }, []);

    const handleKey = (key) => {
        if (key === 'C') {
            setRawDigits('');
            setActiveRow(null);
            setAdditionalPercent(null);
            setShowCustomerModal(false);
            return;
        }
        if (key === '⌫') {
            setRawDigits((prev) => prev.slice(0, -1));
            return;
        }
        appendDigit(key);
    };

    const handleDisplayChange = (e) => {
        const digits = digitsFromRupiahInput(e.target.value);
        if (!digits) {
            setRawDigits('');
            setActiveRow(null);
            setAdditionalPercent(null);
            return;
        }
        setRawDigits(normalizeDigitInput(digits));
    };

    return (
        <>
            <CalculatePageBackground />
            <RapaportShell
                coverPage
                shellClassName="relative z-10 bg-transparent"
                title="Price Calculator"
                subtitle="Atur diskon di panel kanan, lalu tampilkan rincian ke pelanggan lewat modal."
            >
                <div className="relative z-10 grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-10">
                    <section className={panelClass}>
                        <p className="mb-4 text-xs font-semibold tracking-widest uppercase text-neutral-500">
                            Harga (Rp)
                        </p>

                        <label className="block mb-2 text-sm text-neutral-600">Masukkan harga</label>
                        <div className="relative mb-4">
                            <span className="absolute left-5 top-1/2 -translate-y-1/2 text-2xl text-neutral-400 pointer-events-none">
                                Rp
                            </span>
                            <input
                                type="text"
                                inputMode="numeric"
                                value={displayValue}
                                onChange={handleDisplayChange}
                                placeholder="0"
                                className={`${displayClass} pl-14`}
                                aria-label="Harga dalam Rupiah"
                            />
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                            {KEYPAD.map((key) => (
                                <button
                                    key={key}
                                    type="button"
                                    onClick={() => handleKey(key)}
                                    className={`${keyClass} ${
                                        key === 'C'
                                            ? 'text-amber-800 border-amber-200 bg-amber-50 hover:bg-amber-100'
                                            : key === '⌫'
                                              ? 'text-neutral-500'
                                              : ''
                                    }`}
                                >
                                    {key}
                                </button>
                            ))}
                        </div>
                        <div className="grid grid-cols-2 gap-2 mt-2">
                            <button
                                type="button"
                                onClick={() => appendZeros(2)}
                                disabled={!canAdd00}
                                className={`${quickZeroClass} disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white`}
                                title={canAdd00 ? 'Tambah 2 nol (×100)' : `Maksimal ${MAX_INPUT_DIGITS} digit`}
                            >
                                00
                            </button>
                            <button
                                type="button"
                                onClick={() => appendZeros(6)}
                                disabled={!canAdd000000}
                                className={`${quickZeroClass} disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white`}
                                title={
                                    canAdd000000 ? 'Tambah 6 nol (×1.000.000)' : `Maksimal ${MAX_INPUT_DIGITS} digit`
                                }
                            >
                                000.000
                            </button>
                        </div>
                        <p className="mt-4 text-xs text-neutral-500">
                            00 / 000.000 menambah nol di belakang angka. Panel kanan untuk diskon (internal).
                        </p>
                    </section>

                    <section className={`${panelClass} min-w-0`}>
                        <p className="mb-2 text-xs font-semibold tracking-widest uppercase text-neutral-500">Diskon</p>
                        <p className="mb-6 text-sm text-neutral-600">
                            Pilih diskon utama, tambah diskon kedua jika perlu, lalu tampilkan ke pelanggan
                        </p>

                        {baseAmount != null ? (
                            <>
                                <div className="p-5 mb-6 border rounded-xl border-neutral-200 bg-neutral-50">
                                    <p className="text-xs uppercase tracking-wide text-neutral-500">Harga awal</p>
                                    <p className="mt-1 text-3xl font-light text-neutral-900 break-words sm:text-4xl">
                                        {formatRupiah(baseAmount)}
                                    </p>
                                </div>

                                <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white">
                                    <table className="w-full min-w-[300px] text-sm">
                                        <thead>
                                            <tr className="text-left border-b border-neutral-200 bg-neutral-100">
                                                <th className="px-4 py-3 font-medium text-neutral-600">Diskon</th>
                                                <th className="px-4 py-3 font-medium text-neutral-600">Harga</th>
                                                <th className="px-4 py-3 font-medium text-neutral-600">Hemat</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {discountRows.map((row) => {
                                                const selected = activeRow?.percent === row.percent;
                                                return (
                                                    <tr
                                                        key={row.percent}
                                                        onClick={() => selectRow(row)}
                                                        className={`border-b border-neutral-100 last:border-0 cursor-pointer transition-colors touch-manipulation ${
                                                            selected
                                                                ? 'bg-emerald-900 ring-1 ring-inset ring-neutral-900'
                                                                : 'hover:bg-neutral-50 active:bg-neutral-100'
                                                        }`}
                                                    >
                                                        <td
                                                            className={`px-4 py-3 font-medium whitespace-nowrap ${
                                                                selected ? 'text-white' : 'text-neutral-800'
                                                            }`}
                                                        >
                                                            −{row.percent}%
                                                        </td>
                                                        <td
                                                            className={`px-4 py-3 whitespace-nowrap ${
                                                                selected ? 'text-emerald-200' : 'text-emerald-700'
                                                            }`}
                                                        >
                                                            {formatRupiah(row.price)}
                                                        </td>
                                                        <td
                                                            className={`px-4 py-3 whitespace-nowrap ${
                                                                selected ? 'text-neutral-300' : 'text-neutral-500'
                                                            }`}
                                                        >
                                                            {formatRupiah(row.savings)}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>

                                {activeRow && (
                                    <div className="p-4 mt-6 border rounded-xl border-neutral-200 bg-neutral-50">
                                        <p className="text-xs font-semibold tracking-widest uppercase text-neutral-600">
                                            Diskon Tambahan (Additional)
                                        </p>
                                        {/* <p className="mt-1 mb-3 text-xs leading-relaxed text-amber-200/50">
                                        Tidak ditampilkan ke pelanggan. Dari harga setelah −
                                        {activeRow.percent}% ({formatRupiah(activeRow.price)})
                                    </p> */}
                                        <div className="flex flex-wrap gap-2 mt-4">
                                            {DISCOUNT_STEPS.map((pct) => {
                                                const active = additionalPercent === pct;
                                                return (
                                                    <button
                                                        key={pct}
                                                        type="button"
                                                        onClick={() => setAdditionalPercent(active ? null : pct)}
                                                        className={`px-3 py-2 text-sm font-medium rounded-lg border transition-colors touch-manipulation ${
                                                            active
                                                                ? 'bg-emerald-900 text-white border-neutral-900'
                                                                : 'text-neutral-700 border-neutral-200 bg-white hover:border-neutral-400 hover:bg-neutral-100'
                                                        }`}
                                                    >
                                                        −{pct}%
                                                    </button>
                                                );
                                            })}
                                        </div>

                                        {previewFinalPrice != null && (
                                            <div className="p-3 mt-4 space-y-2 text-sm rounded-lg border border-neutral-200 bg-white">
                                                <p className="text-xs font-semibold tracking-wider uppercase text-neutral-500">
                                                    Preview perhitungan
                                                </p>
                                                <div className="flex justify-between gap-3 tabular-nums">
                                                    <span className="text-neutral-600">Harga awal</span>
                                                    <span className="text-neutral-900">{formatRupiah(baseAmount)}</span>
                                                </div>
                                                <div className="flex justify-between gap-3 tabular-nums text-amber-800">
                                                    <span>−{activeRow.percent}%</span>
                                                    <span>− {formatRupiah(activeRow.savings)}</span>
                                                </div>
                                                <div className="flex justify-between gap-3 tabular-nums">
                                                    <span className="text-neutral-600">
                                                        Setelah −{activeRow.percent}%
                                                    </span>
                                                    <span className="font-medium text-neutral-900">
                                                        {formatRupiah(activeRow.price)}
                                                    </span>
                                                </div>
                                                {stacked && additionalPercent != null ? (
                                                    <>
                                                        <div className="flex justify-between gap-3 tabular-nums text-amber-800">
                                                            <span className="text-left leading-snug">
                                                                −{additionalPercent}% dari{' '}
                                                                {formatRupiah(activeRow.price)}
                                                            </span>
                                                            <span className="shrink-0">
                                                                − {formatRupiah(stacked.additionalSavings)}
                                                            </span>
                                                        </div>
                                                        <div className="flex justify-between gap-3 pt-2 tabular-nums border-t border-neutral-200">
                                                            <span className="font-medium text-neutral-800">
                                                                Harga akhir
                                                            </span>
                                                            <span className="font-semibold text-emerald-700">
                                                                {formatRupiah(previewFinalPrice)}
                                                            </span>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <div className="flex justify-between gap-3 pt-2 tabular-nums border-t border-neutral-200">
                                                        <span className="font-medium text-neutral-800">
                                                            Harga akhir
                                                        </span>
                                                        <span className="font-semibold text-emerald-700">
                                                            {formatRupiah(activeRow.price)}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        <button
                                            type="button"
                                            onClick={() => setShowCustomerModal(true)}
                                            className="w-full px-6 py-3.5 mt-4 text-sm font-semibold text-white bg-neutral-900 rounded-full hover:bg-neutral-800 touch-manipulation"
                                        >
                                            Tampilkan ke pelanggan
                                        </button>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-16 text-center text-neutral-500">
                                <p className="text-sm text-neutral-600">
                                    Masukkan harga di kiri untuk melihat perhitungan
                                </p>
                                <p className="mt-2 text-xs text-neutral-400">Misalnya Rp 1.000.000</p>
                            </div>
                        )}
                    </section>
                </div>

                {showCustomerModal && activeRow && (
                    <CustomerPriceModal
                        row={activeRow}
                        baseAmount={baseAmount}
                        additionalPercent={additionalPercent}
                        onClose={() => setShowCustomerModal(false)}
                    />
                )}
            </RapaportShell>
        </>
    );
}
