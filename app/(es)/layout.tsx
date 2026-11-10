import type { ReactNode } from 'react';
import type { Viewport } from 'next';
import { RootDocument } from '@/components/RootDocument';

export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#3b7bdd' };

/** Root layout of the Spanish site, served at the root of the domain. */
export default function SpanishLayout({ children }: { children: ReactNode }) {
  return <RootDocument locale="es">{children}</RootDocument>;
}
