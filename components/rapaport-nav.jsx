'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { BrandLogo } from './brand-logo';

const links = [
    { href: '/', label: 'Home' },
    // { href: '/upload', label: 'Upload' },
    { href: '/view', label: 'View' },
    // { href: '/search', label: 'Search' },
    { href: '/calculate', label: 'Calculate' },
    { href: '/delete', label: 'Delete' }
];

function MenuIcon({ className = 'w-6 h-6' }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
        </svg>
    );
}

function CloseIcon({ className = 'w-6 h-6' }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
        </svg>
    );
}

export function RapaportNav({ light = false }) {
    const pathname = usePathname();
    const [menuOpen, setMenuOpen] = useState(false);

    useEffect(() => {
        setMenuOpen(false);
    }, [pathname]);

    useEffect(() => {
        if (!menuOpen) return;

        const onKey = (e) => {
            if (e.key === 'Escape') setMenuOpen(false);
        };

        document.body.style.overflow = 'hidden';
        document.addEventListener('keydown', onKey);
        return () => {
            document.body.style.overflow = '';
            document.removeEventListener('keydown', onKey);
        };
    }, [menuOpen]);

    const desktopNavClass = `hidden md:flex flex-wrap items-center gap-1 p-1 rounded-full border sm:w-fit ${
        light
            ? 'border-white/50 bg-white/90 shadow-lg backdrop-blur-sm'
            : 'border-neutral-800 bg-neutral-950/80'
    }`;

    const linkClass = (active, mobile = false) => {
        if (mobile) {
            return active
                ? 'bg-neutral-900 text-white'
                : 'text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900';
        }
        return active
            ? 'bg-neutral-900 text-white'
            : light
              ? 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
              : 'text-neutral-400 hover:text-white hover:bg-neutral-900';
    };

    return (
        <>
            <div className="flex items-center justify-between gap-3 mb-6 md:mb-10">
                <Link href="/" className="shrink-0 no-underline" aria-label="Benteng Jewelry — Home">
                    <BrandLogo variant="light" className="h-7 w-auto sm:h-8 md:h-9" />
                </Link>

                <button
                    type="button"
                    className={`md:hidden inline-flex items-center justify-center p-2.5 rounded-xl border touch-manipulation transition-colors ${
                        light
                            ? 'border-white/40 bg-white/10 text-white hover:bg-white/20'
                            : 'border-neutral-700 bg-neutral-900/80 text-white hover:bg-neutral-800'
                    }`}
                    aria-label="Buka menu"
                    aria-expanded={menuOpen}
                    onClick={() => setMenuOpen(true)}
                >
                    <MenuIcon />
                </button>

                <nav className={desktopNavClass}>
                    {links.map(({ href, label }) => {
                        const active = pathname === href;
                        return (
                            <Link
                                key={href}
                                href={href}
                                className={`px-3 py-2 text-xs font-medium rounded-full transition-all no-underline sm:px-4 sm:text-sm ${linkClass(active)}`}
                            >
                                {label}
                            </Link>
                        );
                    })}
                </nav>
            </div>

            {menuOpen && (
                <div className="fixed inset-0 z-50 md:hidden" role="presentation">
                    <button
                        type="button"
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                        aria-label="Tutup menu"
                        onClick={() => setMenuOpen(false)}
                    />
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-label="Menu navigasi"
                        className="absolute inset-x-4 top-4 flex max-h-[calc(100dvh-2rem)] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
                    >
                        <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-neutral-200">
                            <BrandLogo variant="dark" className="h-8 w-auto" />
                            <button
                                type="button"
                                className="inline-flex items-center justify-center p-2 rounded-lg text-neutral-600 hover:bg-neutral-100 touch-manipulation"
                                aria-label="Tutup menu"
                                onClick={() => setMenuOpen(false)}
                            >
                                <CloseIcon />
                            </button>
                        </div>

                        <nav className="flex flex-col gap-1 p-3 overflow-y-auto">
                            {links.map(({ href, label }) => {
                                const active = pathname === href;
                                return (
                                    <Link
                                        key={href}
                                        href={href}
                                        onClick={() => setMenuOpen(false)}
                                        className={`px-4 py-3.5 text-base font-medium rounded-xl transition-colors no-underline ${linkClass(active, true)}`}
                                    >
                                        {label}
                                    </Link>
                                );
                            })}
                        </nav>
                    </div>
                </div>
            )}
        </>
    );
}
