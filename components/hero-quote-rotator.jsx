'use client';

import { useEffect, useState } from 'react';

const ROTATE_MS = 6000;

export function HeroQuoteRotator({ quotes, initialIndex = 0 }) {
    const [index, setIndex] = useState(initialIndex);
    const hasMultiple = quotes.length > 1;
    const quote = quotes[index] ?? quotes[0];

    useEffect(() => {
        if (!hasMultiple) return;

        const id = window.setInterval(() => {
            setIndex((i) => (i + 1) % quotes.length);
        }, ROTATE_MS);

        return () => window.clearInterval(id);
    }, [hasMultiple, quotes.length]);

    if (!quote) return null;

    return (
        <div className="mx-auto mt-8 w-full max-w-[18rem] sm:max-w-xs md:mx-0 md:mt-8 md:max-w-none lg:mt-10">
            <p
                key={index}
                className="font-display text-lg font-light leading-snug text-white/95 animate-[hero-quote-fade_0.6s_ease-out] sm:text-xl md:text-xl md:leading-relaxed lg:text-2xl xl:text-[1.65rem] 2xl:text-[1.75rem]"
            >
                &ldquo;{quote.text}&rdquo;
            </p>
        </div>
    );
}
