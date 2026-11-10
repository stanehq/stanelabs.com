import type { ReactNode } from 'react';
import type { Viewport } from 'next';
import { RootDocument } from '@/components/RootDocument';
import { DEFAULT_LOCALE, PREFIXED_LOCALES, isLocale } from '@/i18n/config';

export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#3b7bdd' };
export const dynamicParams = false;

export function generateStaticParams() {
  return PREFIXED_LOCALES.map(lang => ({ lang }));
}

/** Root layout of the languages served under a prefix, such as `/en` and `/fr`. */
export default async function LocaleLayout({ children, params }: { children: ReactNode; params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  return <RootDocument locale={isLocale(lang) ? lang : DEFAULT_LOCALE}>{children}</RootDocument>;
}
