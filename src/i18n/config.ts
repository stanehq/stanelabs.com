/** Languages of the site. English is the default and lives at the root of the domain. */
export const LOCALES = ['en', 'es', 'fr'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'en';
/** Languages served under their own prefix (`/es`, `/fr`). */
export const PREFIXED_LOCALES = LOCALES.filter(locale => locale !== DEFAULT_LOCALE);

/** Pages of the site, as paths in the default language. */
export const ROUTES = ['/', '/security', '/privacy', '/tos', '/purchase'] as const;
export type Route = (typeof ROUTES)[number];

export const LOCALE_NAMES: Record<Locale, string> = { es: 'Español', en: 'English', fr: 'Français' };
export const OPEN_GRAPH_LOCALES: Record<Locale, string> = { es: 'es_ES', en: 'en_US', fr: 'fr_FR' };

export const isLocale = (value: unknown): value is Locale => LOCALES.some(locale => locale === value);

/** Path of a route in a language: `/privacy` stays as is in English and becomes `/es/privacy` in Spanish. */
export function localePath(locale: Locale, route: string): string {
  if (locale === DEFAULT_LOCALE) return route;
  return route === '/' ? `/${locale}` : `/${locale}${route}`;
}

/** Localizes an internal link; external links and well-known files are left alone. */
export function localizeHref(locale: Locale, href: string): string {
  return href.startsWith('/') && !href.startsWith('/.well-known') ? localePath(locale, href) : href;
}

/** Splits a URL path into its language and the route in the default language. */
export function parsePath(pathname: string): { locale: Locale; route: string } {
  const path = pathname.replace(/\/$/, '') || '/';
  const [, first = '', ...rest] = path.split('/');
  if (isLocale(first) && first !== DEFAULT_LOCALE) return { locale: first, route: rest.length ? `/${rest.join('/')}` : '/' };
  return { locale: DEFAULT_LOCALE, route: path };
}
