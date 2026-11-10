import type { Metadata } from 'next';
import config from '../../project-config.json';
import { DEFAULT_LOCALE, LOCALES, OPEN_GRAPH_LOCALES, localePath, type Locale } from '../i18n/config';
import { MESSAGES } from '../i18n/messages';

const socialImage = '/brand/social-card.png';

/** Next.js metadata for a page: texts in its language, plus links to the other languages. */
export function pageMetadata(locale: Locale, route: string): Metadata {
  const messages = MESSAGES[locale];
  const { title, description } = messages.meta.pages[route as keyof typeof messages.meta.pages];
  const url = localePath(locale, route);
  return {
    title,
    description,
    metadataBase: new URL(config.siteUrl),
    alternates: {
      canonical: url,
      languages: { ...Object.fromEntries(LOCALES.map(code => [code, localePath(code, route)])), 'x-default': localePath(DEFAULT_LOCALE, route) },
    },
    robots: { index: !config.sitePrivate, follow: true },
    openGraph: {
      type: 'website',
      siteName: config.name,
      locale: OPEN_GRAPH_LOCALES[locale],
      alternateLocale: LOCALES.filter(code => code !== locale).map(code => OPEN_GRAPH_LOCALES[code]),
      title,
      description,
      url,
      images: [{ url: socialImage, width: 1200, height: 630, alt: messages.meta.socialImageAlt }],
    },
    twitter: { card: 'summary_large_image', title, description, images: [socialImage] },
  };
}
