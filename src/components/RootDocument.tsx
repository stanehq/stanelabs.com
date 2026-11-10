import type { ReactNode } from 'react';
import localFont from 'next/font/local';
import config from '../../project-config.json';
import type { Locale } from '../i18n/config';
import '../styles.css';

const headingFont = localFont({ src: '../fonts/tiktok-sans-latin.woff2', variable: '--font-tiktok', weight: '400 600', display: 'swap' });
const bodyFont = localFont({ src: '../fonts/geist-latin.woff2', variable: '--font-geist', weight: '400 500', display: 'swap' });

function structuredData(locale: Locale) {
  const organizationId = `${config.siteUrl}/#organization`;
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': organizationId,
        name: config.name,
        url: `${config.siteUrl}/`,
        logo: `${config.siteUrl}/brand/icon-512.png`,
        // The security contact answers in Spanish whatever the language of the site.
        contactPoint: { '@type': 'ContactPoint', contactType: 'security', email: config.securityEmail, availableLanguage: ['es'] },
      },
      { '@type': 'WebSite', '@id': `${config.siteUrl}/#website`, name: config.name, url: `${config.siteUrl}/`, inLanguage: locale, publisher: { '@id': organizationId } },
    ],
  };
}

/** The HTML document shared by every page; each language has its own root layout. */
export function RootDocument({ locale, children }: { locale: Locale; children: ReactNode }) {
  // Escaping "<" keeps the serialized JSON from closing the script element.
  const structuredDataJson = JSON.stringify(structuredData(locale)).replace(/</g, '\\u003c');
  return (
    <html lang={locale} className={`${headingFont.variable} ${bodyFont.variable}`}>
      <head>
        <link rel="icon" type="image/svg+xml" href="/brand/favicon.svg" />
        <link rel="apple-touch-icon" href="/brand/icon-192.png" />
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="preload" href="/sculpture/knot.bin?v=2" as="fetch" crossOrigin="anonymous" />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: structuredDataJson }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
