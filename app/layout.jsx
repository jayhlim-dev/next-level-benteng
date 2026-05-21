import '../styles/globals.css';

export const metadata = {
    title: {
        template: '%s | Benteng Jewelry',
        default: 'Benteng Jewelry'
    },
    description: 'Diamond pricing tools for Benteng Jewelry — Rapaport tables, search, and price calculator'
};

export default function RootLayout({ children }) {
    return (
        <html lang="en">
            <head>
                <link rel="icon" href="/favicon.svg" sizes="any" />
            </head>
            <body className="min-h-screen antialiased bg-black text-neutral-200">{children}</body>
        </html>
    );
}
