import '../styles/globals.css';

export const metadata = {
    title: {
        template: '%s | Rapaport Reader',
        default: 'Rapaport Reader'
    },
    description: 'Extract and search Rapaport diamond pricing tables'
};

export default function RootLayout({ children }) {
    return (
        <html lang="en">
            <head>
                <link rel="icon" href="/favicon.svg" sizes="any" />
            </head>
            <body className="min-h-screen antialiased bg-black text-neutral-200">
                <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-neutral-900 via-black to-black">
                    <div className="px-6 py-4 sm:px-12">
                        <div className="flex flex-col w-full max-w-6xl mx-auto min-h-screen">
                            <main className="flex-1 pb-16">{children}</main>
                            <footer className="py-8 text-xs text-center border-t border-neutral-900 text-neutral-600">
                                Rapaport Reader · Local JSON storage
                            </footer>
                        </div>
                    </div>
                </div>
            </body>
        </html>
    );
}
