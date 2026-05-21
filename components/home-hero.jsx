import Image from 'next/image';
import Link from 'next/link';
import { HeroQuoteRotator } from './hero-quote-rotator';
import { HERO_BG, HERO_LOGO } from '../lib/hero-assets';
import { loadQuotes } from '../lib/quotes';

export function HomeHero() {
    const quotes = loadQuotes();
    const initialIndex =
        quotes.length > 0 ? Math.floor(Date.now() / 86_400_000) % quotes.length : 0;

    return (
        <section className="relative min-h-dvh w-full overflow-hidden">
            <div className="absolute inset-0 md:hidden" aria-hidden>
                <Image
                    src={HERO_BG.mobile}
                    alt=""
                    fill
                    priority
                    unoptimized
                    sizes="100vw"
                    className="object-cover object-center"
                />
            </div>
            <div className="absolute inset-0 hidden md:block" aria-hidden>
                <Image
                    src={HERO_BG.desktop}
                    alt=""
                    fill
                    priority
                    unoptimized
                    sizes="100vw"
                    className="object-cover object-[42%_center] lg:object-[38%_center] xl:object-[34%_center] 2xl:object-[30%_center]"
                />
            </div>
            <div
                className="absolute inset-0 bg-gradient-to-b from-black/35 via-black/15 to-black/40 md:bg-gradient-to-r md:from-black/50 md:via-black/20 md:to-transparent"
                aria-hidden
            />

            <div className="relative z-10 mx-auto flex min-h-dvh w-full max-w-[120rem] flex-col justify-center px-6 py-16 md:px-0 md:py-0">
                <div
                    className={[
                        'flex w-full flex-col items-center text-center',
                        'md:items-start md:text-left',
                        'md:pl-[clamp(2.5rem,6vw,5rem)] md:pr-8',
                        'lg:pl-[clamp(3rem,7vw,6.5rem)]',
                        'xl:pl-[clamp(3.5rem,8vw,8rem)]',
                        '2xl:pl-[clamp(4rem,9vw,10rem)]',
                        'md:max-w-[min(100%,28rem)] lg:max-w-[min(100%,32rem)] xl:max-w-[min(100%,36rem)] 2xl:max-w-[min(100%,40rem)]'
                    ].join(' ')}
                >
                    <Image
                        src={HERO_LOGO.mobile}
                        alt="Benteng — Since 1970"
                        width={329}
                        height={83}
                        priority
                        unoptimized
                        className="h-auto w-[min(240px,72vw)] md:hidden"
                    />
                    <Image
                        src={HERO_LOGO.desktop}
                        alt="Benteng — Since 1970"
                        width={1047}
                        height={219}
                        priority
                        unoptimized
                        className="hidden h-auto w-full max-w-[16rem] md:block lg:max-w-[20rem] xl:max-w-[24rem] 2xl:max-w-[26rem]"
                    />
                    <HeroQuoteRotator quotes={quotes} initialIndex={initialIndex} />
                    <Link
                        href="/calculate"
                        className="mt-10 inline-flex min-w-[11rem] items-center justify-center rounded-sm border border-white px-8 py-3.5 text-[0.7rem] font-medium uppercase tracking-[0.22em] text-white no-underline transition-colors hover:bg-white/10 sm:mt-12 sm:min-w-[12.5rem] sm:px-10 sm:py-4 sm:text-xs md:mt-10 lg:mt-12 bg-[#192222]/80"
                    >
                        Check price
                    </Link>
                </div>
            </div>
        </section>
    );
}
