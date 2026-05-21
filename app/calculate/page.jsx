'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { RapaportShell } from '../../components/rapaport-shell';
import {
    digitsFromRupiahInput,
    normalizeDigitInput,
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

    return (
        <button
            type="button"
            onClick={(e) => e.preventDefault()}
            onPointerDown={onPointerDown}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerUp}
            onPointerCancel={onPointerUp}
            className={`relative flex items-center justify-center w-12 h-12 rounded-full shrink-0 touch-manipulation transition-colors ${
                locked
                    ? 'text-neutral-300 bg-neutral-800/90 border border-neutral-700/90'
                    : 'text-amber-200/90 bg-neutral-900 border border-amber-800/40 hover:bg-amber-950/30'
            }`}
            aria-label={
                locked
                    ? 'Terkunci. Tahan 2 detik untuk buka kunci.'
                    : 'Terbuka. Ketuk cepat untuk kunci lagi.'
            }
            title={locked ? 'Staf: tahan 2 detik untuk buka' : 'Staf: ketuk cepat untuk kunci'}
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
                <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-emerald-400/90 ring-2 ring-neutral-950" />
            )}
        </button>
    );
}

function CustomerModalRow({ label, value, valueClass = 'text-white' }) {
    return (
        <div className="flex items-center justify-between gap-4 px-4 py-3 rounded-xl bg-neutral-900/50 border border-neutral-800/90">
            <span className="text-[11px] uppercase tracking-wider text-neutral-500 shrink-0 leading-snug">{label}</span>
            <span className={`text-base font-medium tabular-nums text-right leading-tight ${valueClass}`}>{value}</span>
        </div>
    );
}

/** Customer-facing — no Tutup; lock prevents accidental dismiss for pelanggan */
function CustomerPriceModal({ row, baseAmount, additionalPercent, onClose }) {
    const [locked, setLocked] = useState(true);
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

    const handleLockPointerDown = () => {
        pointerDownAtRef.current = Date.now();
        if (locked) startUnlockHold();
    };

    const handleLockPointerUp = () => {
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

    if (!row || baseAmount == null) return null;

    const stacked = additionalPercent != null ? applyAdditionalDiscount(row.price, additionalPercent) : null;

    const finalPrice = stacked?.finalPrice ?? row.price;
    const totalHemat = calcTotalHemat(baseAmount, finalPrice);

    return (
        <div
            className="fixed inset-0 z-50 flex bg-black/70 backdrop-blur-sm sm:items-center sm:justify-center sm:p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="customer-modal-title"
            onClick={locked ? undefined : onClose}
        >
            <div
                className="flex flex-col w-full h-[100dvh] max-h-[100dvh] overflow-hidden border-neutral-700 bg-neutral-950 shadow-2xl sm:h-auto sm:max-h-[92dvh] sm:max-w-md sm:rounded-2xl sm:border"
                onClick={(e) => e.stopPropagation()}
            >
                <header className="flex items-start justify-between gap-5 shrink-0 px-5 py-5 border-b border-neutral-800/60 sm:px-6">
                    <div className="min-w-0 pt-0.5">
                        <p className="text-[11px] font-medium tracking-[0.2em] uppercase text-neutral-500">
                            Rincian harga
                        </p>
                        <h2
                            id="customer-modal-title"
                            className="mt-1.5 text-xl font-semibold tracking-tight text-white sm:text-2xl"
                        >
                            Perhitungan
                        </h2>
                        {locked ? (
                            <p className="mt-2 text-xs text-neutral-500">Harga final untuk Anda</p>
                        ) : (
                            <p className="mt-2 text-xs text-amber-200/70">
                                Mode staf · ketuk luar layar untuk tutup · ketuk ikon untuk kunci
                            </p>
                        )}
                    </div>
                    <CustomerLockButton
                        locked={locked}
                        unlockProgress={unlockProgress}
                        onPointerDown={handleLockPointerDown}
                        onPointerUp={handleLockPointerUp}
                    />
                </header>

                <div className="flex flex-col flex-1 min-h-0">
                    <div className="flex flex-col flex-1 min-h-0 justify-center px-5 py-4 sm:px-6">
                        <div className="flex flex-col w-full max-w-sm gap-2.5 mx-auto">
                            <CustomerModalRow label="Harga awal" value={formatRupiah(baseAmount)} />
                            <CustomerModalRow
                                label={`Potongan ${row.percent}%`}
                                value={`− ${formatRupiah(row.savings)}`}
                                valueClass="text-amber-200"
                            />
                            {stacked ? (
                                <>
                                    <CustomerModalRow
                                        label={`Setelah diskon ${row.percent}%`}
                                        value={formatRupiah(row.price)}
                                    />
                                    <CustomerModalRow
                                        label={`Potongan ${additionalPercent}%`}
                                        value={`− ${formatRupiah(stacked.additionalSavings)}`}
                                        valueClass="text-amber-200"
                                    />
                                </>
                            ) : null}
                            <div className="flex items-center justify-between gap-4 px-4 py-3.5 mt-1 rounded-xl border border-emerald-900/50 bg-emerald-950/25">
                                <span className="text-[11px] uppercase tracking-wider text-emerald-200/90">
                                    Harga akhir
                                </span>
                                <span className="text-lg font-semibold tabular-nums text-emerald-300 sm:text-xl">
                                    {formatRupiah(finalPrice)}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="shrink-0 px-5 pb-6 pt-2 space-y-3 sm:px-6 sm:pb-8">
                        <p className="px-4 py-3 text-sm text-center rounded-xl bg-neutral-900/80 text-neutral-400">
                            {formatRupiah(baseAmount)} →{' '}
                            <span className="font-medium text-emerald-300">{formatRupiah(finalPrice)}</span>
                        </p>

                        {totalHemat != null && totalHemat > 0 && (
                            <div className="px-4 py-3.5 rounded-xl border border-sky-900/40 bg-sky-950/20">
                                <div className="flex items-center justify-between gap-4">
                                    <span className="text-[11px] uppercase tracking-wider text-sky-200/90">
                                        Total hemat
                                    </span>
                                    <span className="text-lg font-semibold tabular-nums text-sky-300 sm:text-xl">
                                        {formatRupiah(totalHemat)}
                                    </span>
                                </div>
                                <p className="mt-2 text-xs text-neutral-500">Potongan dari harga awal</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

const KEYPAD = ['7', '8', '9', '4', '5', '6', '1', '2', '3', 'C', '0', '⌫'];

const displayClass =
    'w-full min-w-0 px-3 py-3 text-2xl font-light tracking-wide text-right text-white border rounded-xl border-neutral-700 bg-black font-mono tabular-nums sm:px-5 sm:py-4 sm:text-3xl';

const keyClass =
    'min-h-[48px] py-3 text-lg font-medium text-white transition border rounded-xl border-neutral-700 bg-neutral-900 hover:bg-neutral-800 active:scale-[0.98] touch-manipulation sm:py-4 sm:text-xl';

const quickZeroClass =
    'min-h-[48px] py-3 text-sm font-semibold text-sky-200 transition border rounded-xl border-sky-900/50 bg-sky-950/30 hover:bg-sky-950/50 active:scale-[0.98] touch-manipulation sm:text-base';

export default function CalculatePage() {
    const [rawDigits, setRawDigits] = useState('');
    const [activeRow, setActiveRow] = useState(null);
    const [additionalPercent, setAdditionalPercent] = useState(null);
    const [showCustomerModal, setShowCustomerModal] = useState(false);

    const baseAmount = useMemo(() => rawDigitsToAmount(rawDigits), [rawDigits]);

    const displayValue = rawDigits ? formatRupiahDigitsFromRaw(rawDigits) : '';

    const canAdd000 = canAppendZeros(rawDigits, 3);
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
        if (key === '+000') {
            appendZeros(3);
            return;
        }
        if (key === '+000000') {
            appendZeros(6);
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
        <RapaportShell
            title="Price Calculator"
            subtitle="Atur diskon di panel kanan, lalu tampilkan rincian ke pelanggan lewat modal."
        >
            <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2 lg:gap-10">
                <section className="p-4 border rounded-xl border-neutral-800 bg-neutral-950/50 sm:p-6 sm:rounded-2xl">
                    <p className="mb-4 text-xs font-semibold tracking-widest uppercase text-neutral-500">Harga (Rp)</p>

                    <label className="block mb-2 text-sm text-neutral-400">Masukkan harga</label>
                    <div className="relative mb-3 sm:mb-4">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xl text-neutral-500 pointer-events-none sm:left-5 sm:text-2xl">
                            Rp
                        </span>
                        <input
                            type="text"
                            inputMode="numeric"
                            value={displayValue}
                            onChange={handleDisplayChange}
                            placeholder="0"
                            className={`${displayClass} pl-11 sm:pl-14`}
                            aria-label="Harga dalam Rupiah"
                        />
                    </div>

                    <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                        {KEYPAD.map((key) => (
                            <button
                                key={key}
                                type="button"
                                onClick={() => handleKey(key)}
                                className={`${keyClass} ${
                                    key === 'C'
                                        ? 'text-amber-300 border-amber-900/50 bg-amber-950/30 hover:bg-amber-950/50'
                                        : key === '⌫'
                                          ? 'text-neutral-400'
                                          : ''
                                }`}
                            >
                                {key}
                            </button>
                        ))}
                    </div>
                    <div className="grid grid-cols-2 gap-1.5 mt-1.5 sm:gap-2 sm:mt-2">
                        <button
                            type="button"
                            onClick={() => handleKey('+000')}
                            disabled={!canAdd000}
                            className={`${quickZeroClass} disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-sky-950/30`}
                            title={canAdd000 ? 'Tambah 3 nol (×1.000)' : `Maksimal ${MAX_INPUT_DIGITS} digit`}
                        >
                            +000
                        </button>
                        <button
                            type="button"
                            onClick={() => handleKey('+000000')}
                            disabled={!canAdd000000}
                            className={`${quickZeroClass} disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-sky-950/30`}
                            title={canAdd000000 ? 'Tambah 6 nol (×1.000.000)' : `Maksimal ${MAX_INPUT_DIGITS} digit`}
                        >
                            +000000
                        </button>
                    </div>
                    <p className="mt-4 text-xs text-neutral-400">
                        +000 / +000000 menambah nol di belakang angka. Panel kanan untuk diskon (internal).
                    </p>
                </section>

                <section className="p-4 border rounded-xl border-neutral-800 bg-gradient-to-br from-neutral-900 to-black sm:p-6 sm:rounded-2xl min-w-0">
                    <p className="mb-2 text-xs font-semibold tracking-widest uppercase text-neutral-500">Diskon</p>
                    <p className="mb-4 text-sm text-neutral-400 sm:mb-6">
                        Pilih diskon utama, tambah diskon kedua jika perlu, lalu tampilkan ke pelanggan
                    </p>

                    {baseAmount != null ? (
                        <>
                            <div className="p-4 mb-4 border rounded-xl border-neutral-700 bg-black/50 sm:p-5 sm:mb-6">
                                <p className="text-xs uppercase tracking-wide text-neutral-500">Harga awal</p>
                                <p className="mt-1 text-2xl font-light break-words text-white sm:text-3xl lg:text-4xl">
                                    {formatRupiah(baseAmount)}
                                </p>
                            </div>

                            <div className="overflow-x-auto -mx-1 rounded-xl border border-neutral-800 sm:mx-0">
                                <table className="w-full min-w-[280px] text-xs sm:text-sm">
                                    <thead>
                                        <tr className="text-left border-b border-neutral-800 bg-neutral-950/80">
                                            <th className="px-2 py-2.5 font-medium text-neutral-400 sm:px-4 sm:py-3">
                                                Diskon
                                            </th>
                                            <th className="px-2 py-2.5 font-medium text-neutral-400 sm:px-4 sm:py-3">
                                                Harga
                                            </th>
                                            <th className="px-2 py-2.5 font-medium text-neutral-400 sm:px-4 sm:py-3">
                                                Hemat
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {discountRows.map((row) => {
                                            const selected = activeRow?.percent === row.percent;
                                            return (
                                                <tr
                                                    key={row.percent}
                                                    onClick={() => selectRow(row)}
                                                    className={`border-b border-neutral-900 last:border-0 cursor-pointer transition-colors touch-manipulation ${
                                                        selected
                                                            ? 'bg-white/10 ring-1 ring-inset ring-white/20'
                                                            : 'hover:bg-neutral-900/60 active:bg-neutral-900/80'
                                                    }`}
                                                >
                                                    <td className="px-2 py-3 font-medium whitespace-nowrap text-white sm:px-4">
                                                        −{row.percent}%
                                                    </td>
                                                    <td className="px-2 py-3 whitespace-nowrap text-emerald-300 sm:px-4">
                                                        {formatRupiah(row.price)}
                                                    </td>
                                                    <td className="px-2 py-3 whitespace-nowrap text-neutral-400 sm:px-4">
                                                        {formatRupiah(row.savings)}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {activeRow && (
                                <div className="p-3 mt-4 border rounded-xl border-amber-900/30 bg-amber-950/10 sm:p-4 sm:mt-6">
                                    <p className="text-xs font-semibold tracking-widest uppercase text-amber-200/80">
                                        Internal — diskon tambahan
                                    </p>
                                    <p className="mt-1 mb-3 text-xs leading-relaxed break-words text-amber-200/50">
                                        Tidak ditampilkan ke pelanggan. Dari harga setelah −{activeRow.percent}% (
                                        {formatRupiah(activeRow.price)})
                                    </p>
                                    <div className="grid grid-cols-4 gap-1.5 sm:flex sm:flex-wrap sm:gap-2">
                                        {DISCOUNT_STEPS.map((pct) => {
                                            const active = additionalPercent === pct;
                                            return (
                                                <button
                                                    key={pct}
                                                    type="button"
                                                    onClick={() => setAdditionalPercent(active ? null : pct)}
                                                    className={`min-h-[44px] px-2 py-2 text-xs font-medium rounded-lg border transition-colors touch-manipulation sm:px-3 sm:py-2 sm:text-sm ${
                                                        active
                                                            ? 'bg-amber-200 text-black border-amber-200'
                                                            : 'text-neutral-300 border-neutral-700 hover:border-amber-800/50 hover:bg-amber-950/30'
                                                    }`}
                                                >
                                                    −{pct}%
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {previewFinalPrice != null && (
                                        <p className="mt-3 text-xs leading-relaxed text-neutral-300 sm:mt-4 sm:text-sm">
                                            Preview harga akhir:{' '}
                                            <span className="font-medium break-words text-emerald-300">
                                                {formatRupiah(previewFinalPrice)}
                                            </span>
                                            {additionalPercent != null && (
                                                <span className="block mt-1 text-neutral-500 sm:inline sm:mt-0">
                                                    (−{activeRow.percent}% lalu −{additionalPercent}%)
                                                </span>
                                            )}
                                        </p>
                                    )}

                                    <button
                                        type="button"
                                        onClick={() => setShowCustomerModal(true)}
                                        className="w-full min-h-[48px] px-6 py-3.5 mt-4 text-sm font-semibold text-black bg-white rounded-full hover:bg-neutral-200 touch-manipulation sm:py-3"
                                    >
                                        Tampilkan ke pelanggan
                                    </button>
                                    <p className="mt-2 text-[10px] text-center text-neutral-400">
                                        Modal terkunci untuk pelanggan — tanpa tombol Tutup
                                    </p>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-10 text-center text-neutral-500 sm:py-16">
                            <p className="px-2 text-sm">Masukkan harga di atas untuk melihat perhitungan</p>
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
    );
}
