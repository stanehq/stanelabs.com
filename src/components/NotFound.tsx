'use client';

import { useSyncExternalStore } from 'react';
import { DEFAULT_LOCALE, localePath, parsePath } from '../i18n/config';
import { MESSAGES } from '../i18n/messages';
import { Button } from './ui/button';

const subscribe = () => () => {};
// The static 404 page is the same for every URL, so the language is read in the browser.
const browserLocale = () => parsePath(window.location.pathname).locale;
const serverLocale = () => DEFAULT_LOCALE;

export function NotFound() {
  const locale = useSyncExternalStore(subscribe, browserLocale, serverLocale);
  const { notFound, common } = MESSAGES[locale];
  return (
    <main className="container legal-page">
      <p className="section-label">{notFound.label}</p>
      <h1>{notFound.title}</h1>
      <p>{notFound.text}</p>
      <Button asChild><a href={localePath(locale, '/')}>{common.backHome}</a></Button>
    </main>
  );
}
