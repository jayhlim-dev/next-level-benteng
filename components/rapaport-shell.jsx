import { RapaportNav } from './rapaport-nav';

export function RapaportShell({ title, subtitle, children }) {
    return (
        <div className="py-4 sm:py-8">
            <RapaportNav />
            <header className="mb-6 sm:mb-10">
                <p className="mb-2 text-xs font-semibold tracking-[0.25em] uppercase text-neutral-500">
                    Rapaport Reader
                </p>
                <h1 className="text-2xl font-light tracking-tight text-white sm:text-4xl">
                    {title}
                </h1>
                {subtitle && (
                    <p className="mt-2 max-w-2xl text-sm text-neutral-400 sm:mt-3 sm:text-base">
                        {subtitle}
                    </p>
                )}
            </header>
            {children}
        </div>
    );
}
