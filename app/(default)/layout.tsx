import type { ReactNode } from 'react';
import type { Viewport } from 'next';
import { RootDocument } from '@/components/RootDocument';
import { DEFAULT_LOCALE } from '@/i18n/config';

export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#3b7bdd' };

/** Root layout of the default language, served at the root of the domain. */
export default function DefaultLayout({ children }: { children: ReactNode }) {
  return <RootDocument locale={DEFAULT_LOCALE}>{children}</RootDocument>;
}
