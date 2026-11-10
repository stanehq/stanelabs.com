import type { Metadata } from 'next';
import config from '../../project-config.json';
import site from './page-metadata.json';

export type PageRoute = keyof typeof site.pages;

const socialImage = '/brand/social-card.png';

/** Next.js metadata for a route; titles and descriptions live in page-metadata.json. */
export function pageMetadata(route: PageRoute): Metadata {
  const { title, description } = site.pages[route];
  return {
    title,
    description,
    metadataBase: new URL(config.siteUrl),
    alternates: { canonical: route },
    robots: { index: !config.sitePrivate, follow: true },
    openGraph: {
      type: 'website',
      siteName: config.name,
      locale: 'es_ES',
      title,
      description,
      url: route,
      images: [{ url: socialImage, width: 1200, height: 630, alt: site.socialImageAlt }],
    },
    twitter: { card: 'summary_large_image', title, description, images: [socialImage] },
  };
}
