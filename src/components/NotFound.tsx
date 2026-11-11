'use client';

import { useSyncExternalStore } from 'react';
import { DEFAULT_LOCALE, parsePath } from '../i18n/config';
import { I18nProvider, useI18n } from '../i18n/I18nProvider';
import { MESSAGES } from '../i18n/messages';
import { SiteFrame } from './SiteFrame';
import { Button } from './ui/button';

const subscribe = () => () => {};
// The static 404 page is the same for every URL, so the language is read in the browser.
const browserLocale = () => parsePath(window.location.pathname).locale;
const serverLocale = () => DEFAULT_LOCALE;

function Message() {
  const { t, href } = useI18n();
  return (
    <div className="container not-found">
      <p className="section-label">{t.notFound.label}</p>
      <h1>{t.notFound.title}</h1>
      <p>{t.notFound.text}</p>
      <Button asChild><a href={href('/')}>{t.common.backHome}</a></Button>
    </div>
  );
}

/** The 404 page, with the same header and footer as the rest of the site. */
export function NotFound() {
  const locale = useSyncExternalStore(subscribe, browserLocale, serverLocale);
  return (
    // Language switches lead to the homepage: the missing page has no translation.
    <I18nProvider locale={locale} route="/" messages={MESSAGES[locale]}>
      <SiteFrame><Message /></SiteFrame>
    </I18nProvider>
  );
}
