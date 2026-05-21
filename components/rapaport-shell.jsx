import { RapaportNav } from './rapaport-nav';

export function RapaportShell({ title, subtitle, children, compact = false }) {
    return (
        <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-neutral-900 via-black to-black">
            <div className="px-6 py-4 sm:px-12">
                <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col">
                    <main
                        className={
                            compact
                                ? 'flex min-h-0 flex-1 flex-col py-2 sm:py-3'
                                : 'flex-1 py-4 sm:py-8'
                        }
                    >
                        <RapaportNav />
                        <header className={compact ? 'mb-3 shrink-0' : 'mb-6 sm:mb-10'}>
                            {!compact && (
                                <p className="mb-2 text-xs font-semibold tracking-[0.25em] uppercase text-neutral-500">
                                    Benteng Jewelry
                                </p>
                            )}
                            <h1
                                className={
                                    compact
                                        ? 'text-lg font-medium tracking-tight text-white sm:text-xl'
                                        : 'text-2xl font-light tracking-tight text-white sm:text-4xl'
                                }
                            >
                                {title}
                            </h1>
                            {subtitle && (
                                <p
                                    className={
                                        compact
                                            ? 'mt-1 max-w-2xl text-xs text-neutral-500'
                                            : 'mt-2 max-w-2xl text-sm text-neutral-400 sm:mt-3 sm:text-base'
                                    }
                                >
                                    {subtitle}
                                </p>
                            )}
                        </header>
                        {children}
                    </main>
                    <footer className="border-t border-neutral-900 py-8 text-center text-xs text-neutral-600">
                        Benteng Jewelry · Local JSON storage
                    </footer>
                </div>
            </div>
        </div>
    );
}
