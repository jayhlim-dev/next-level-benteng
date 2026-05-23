/** Bump when hero background files change (cache-bust) */
export const HERO_BG_VERSION = 2;

export const HERO_BG = {
    mobile: `/images/asset/mobile-bg.png?v=${HERO_BG_VERSION}`,
    desktop: `/images/asset/desktop-bg.png?v=${HERO_BG_VERSION}`
};

export const HERO_LOGO = {
    mobile: `/images/asset/mobile-logo.png?v=${HERO_BG_VERSION}`,
    desktop: `/images/asset/logo.png?v=${HERO_BG_VERSION}`
};

export const CALC_COVER_BG = `/images/asset/bg-cover.png?v=${HERO_BG_VERSION}`;
