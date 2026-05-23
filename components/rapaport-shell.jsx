import { RapaportNav } from './rapaport-nav';

export function RapaportShell({
    title,
    subtitle,
    children,
    compact = false,
    shellClassName,
    coverPage = false
}) {
    const shellBg =
        shellClassName ??
        'bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-neutral-900 via-black to-black';

    return (
        <div className={`relative min-h-screen ${shellBg}`}>
            <div className="px-6 py-4 sm:px-12">
                <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col">
                    <main
                        className={
                            compact
                                ? 'flex min-h-0 flex-1 flex-col py-2 sm:py-3'
                                : 'flex-1 py-4 sm:py-8'
                        }
                    >
                        <RapaportNav light={coverPage} />
                        <header className={compact ? 'mb-3 shrink-0' : 'mb-6 sm:mb-10'}>
                            <h1
                                className={
                                    compact
                                        ? `text-lg font-medium tracking-tight sm:text-xl ${
                                              coverPage ? 'text-white drop-shadow-md' : 'text-white'
                                          }`
                                        : `text-2xl font-light tracking-tight sm:text-4xl ${
                                              coverPage ? 'text-white drop-shadow-md' : 'text-white'
                                          }`
                                }
                            >
                                {title}
                            </h1>
                            {subtitle && (
                                <p
                                    className={
                                        compact
                                            ? `mt-1 max-w-2xl text-xs ${
                                                  coverPage ? 'text-white/80' : 'text-neutral-500'
                                              }`
                                            : `mt-2 max-w-2xl text-sm sm:mt-3 sm:text-base ${
                                                  coverPage
                                                      ? 'text-white/85 drop-shadow-sm'
                                                      : 'text-neutral-400'
                                              }`
                                    }
                                >
                                    {subtitle}
                                </p>
                            )}
                        </header>
                        {children}
                    </main>
                    <footer
                        className={`border-t py-8 text-center text-xs ${
                            coverPage
                                ? 'border-white/25 text-white/70'
                                : 'border-neutral-900 text-neutral-600'
                        }`}
                    >
                        Benteng Jewelry · Local JSON storage
                    </footer>
                </div>
            </div>
        </div>
    );
}
