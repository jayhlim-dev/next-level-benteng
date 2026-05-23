import Image from 'next/image';
import { HERO_LOGO } from '../lib/hero-assets';

/**
 * @param {'light' | 'dark' | 'inverted'} variant
 * - light: white logo (dark backgrounds)
 * - dark: black logo via brightness-0 (white backgrounds)
 * - inverted: CSS invert (white asset → dark on mixed/cover backgrounds)
 */
export function BrandLogo({ variant = 'light', className = 'h-8 w-auto md:h-9' }) {
    const tone =
        variant === 'inverted' ? 'invert' : variant === 'dark' ? 'brightness-0' : '';

    return (
        <>
            <Image
                src={HERO_LOGO.mobile}
                alt="Benteng Jewelry"
                width={329}
                height={83}
                priority
                unoptimized
                className={`md:hidden ${tone} ${className}`.trim()}
            />
            <Image
                src={HERO_LOGO.desktop}
                alt="Benteng Jewelry"
                width={1047}
                height={219}
                priority
                unoptimized
                className={`hidden md:block ${tone} ${className}`.trim()}
            />
        </>
    );
}
