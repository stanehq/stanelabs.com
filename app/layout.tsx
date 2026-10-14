import type { ReactNode } from 'react';
import type { Viewport } from 'next';
import localFont from 'next/font/local';
import config from '../project-config.json';
import '../src/styles.css';
const headingFont = localFont({ src: '../src/fonts/tiktok-sans-latin.woff2', variable: '--font-tiktok', weight: '400 600', display: 'swap' });
const bodyFont = localFont({ src: '../src/fonts/geist-latin.woff2', variable: '--font-geist', weight: '400 500', display: 'swap' });
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#2597D0' };
const structuredData = {
  '@context': 'https://schema.org', '@graph': [
    { '@type': 'Organization', '@id': `${config.siteUrl}/#organization`, name: config.name, url: `${config.siteUrl}/`, logo: `${config.siteUrl}/brand/icon-512.png`, contactPoint: { '@type': 'ContactPoint', contactType: 'security', email: config.securityEmail, availableLanguage: ['es'] } },
    { '@type': 'WebSite', '@id': `${config.siteUrl}/#website`, name: config.name, url: `${config.siteUrl}/`, inLanguage: 'es', publisher: {'@id': `${config.siteUrl}/#organization`} },
  ],
};
export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="es" className={`${headingFont.variable} ${bodyFont.variable}`}><head>
    <link rel="icon" type="image/svg+xml" href="/brand/favicon.svg" />
    <link rel="apple-touch-icon" href="/brand/icon-192.png" />
    <link rel="manifest" href="/manifest.webmanifest" />
    <script type="application/ld+json" dangerouslySetInnerHTML={{__html: JSON.stringify(structuredData).replace(/</g, '\\u003c')}} />
  </head><body>{children}</body></html>;
}
