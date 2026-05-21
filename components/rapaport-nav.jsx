'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const links = [
    { href: '/', label: 'Home' },
    // { href: '/upload', label: 'Upload' },
    { href: '/view', label: 'View' },
    // { href: '/search', label: 'Search' },
    { href: '/calculate', label: 'Calculate' },
    { href: '/delete', label: 'Delete' }
];

export function RapaportNav() {
    const pathname = usePathname();

    return (
        <nav className="flex flex-wrap items-center gap-1 p-1 mb-6 border border-neutral-800 rounded-full bg-neutral-950/80 w-full max-w-full sm:mb-10 sm:w-fit">
            {links.map(({ href, label }) => {
                const active = pathname === href;
                return (
                    <Link
                        key={href}
                        href={href}
                        className={`px-3 py-2 text-xs font-medium rounded-full transition-all no-underline sm:px-4 sm:text-sm ${
                            active
                                ? 'bg-white text-black'
                                : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
                        }`}
                    >
                        {label}
                    </Link>
                );
            })}
        </nav>
    );
}
