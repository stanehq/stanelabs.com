import { notFound } from 'next/navigation';
import { PREFIXED_LOCALES, ROUTES, isLocale } from '@/i18n/config';
import { LocalePage } from '@/i18n/LocalePage';
import { pageMetadata } from '@/lib/metadata';

type Props = { params: Promise<{ lang: string; slug?: string[] }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return PREFIXED_LOCALES.flatMap(lang => ROUTES.map(route => ({ lang, slug: route === '/' ? [] : [route.slice(1)] })));
}

/** Resolves the URL parameters to a language and a known route, or a 404. */
async function resolve({ params }: Props) {
  const { lang, slug } = await params;
  const route = `/${(slug ?? []).join('/')}`;
  const known = ROUTES.find(candidate => candidate === route);
  if (!isLocale(lang) || !known) notFound();
  return { locale: lang, route: known };
}

export async function generateMetadata(props: Props) {
  const { locale, route } = await resolve(props);
  return pageMetadata(locale, route);
}

export default async function Page(props: Props) {
  const { locale, route } = await resolve(props);
  return <LocalePage locale={locale} route={route} />;
}
