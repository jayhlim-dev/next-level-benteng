import Link from 'next/link';
import { RapaportShell } from '../components/rapaport-shell';
import { listJsonFiles } from '../lib/storage.js';

export const dynamic = 'force-dynamic';

export default function HomePage() {
    const files = listJsonFiles();
    const count = files.length;

    const features = [
        {
            href: '/upload',
            title: 'Upload',
            desc: 'Upload Rapaport PDF or images and auto-generate structured JSON.'
        },
        {
            href: '/view',
            title: 'View',
            desc: 'Browse all generated JSON files with pretty-printed previews.'
        },
        {
            href: '/search',
            title: 'Search',
            desc: 'Look up diamond prices by carat, color, and clarity.'
        },
        {
            href: '/calculate',
            title: 'Calculate',
            desc: 'Enter a Rupiah price and see 5%–40% discount breakdown.'
        },
        {
            href: '/delete',
            title: 'Delete',
            desc: 'Remove stored JSON files from local /data storage.'
        }
    ];

    return (
        <RapaportShell
            title="Diamond Pricing Intelligence"
            subtitle="Extract Rapaport pricing tables from PDFs and images, store them as JSON, and search prices instantly."
        >
            <div className="flex items-center gap-3 mb-10">
                <span className="inline-flex items-center px-3 py-1 text-xs font-medium border rounded-full border-neutral-700 text-neutral-400">
                    {count} JSON {count === 1 ? 'file' : 'files'} in /data
                </span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
                {features.map(({ href, title, desc }) => (
                    <Link
                        key={href}
                        href={href}
                        className="block p-6 no-underline transition border rounded-2xl border-neutral-800 bg-neutral-950/50 hover:border-neutral-600 hover:bg-neutral-900/50 group"
                    >
                        <h2 className="text-xl font-medium text-white group-hover:text-white">{title}</h2>
                        <p className="mt-2 text-sm leading-relaxed text-neutral-500">{desc}</p>
                        <span className="inline-block mt-4 text-xs tracking-wide text-neutral-600 group-hover:text-neutral-400">
                            Open →
                        </span>
                    </Link>
                ))}
            </div>
        </RapaportShell>
    );
}
