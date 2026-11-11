'use client';

import { I18nProvider, useI18n } from './i18n/I18nProvider';
import type { Locale } from './i18n/config';
import type { Messages } from './i18n/messages';
import { Home } from './components/Home';
import { LegalPage } from './components/LegalPage';
import { SiteFrame } from './components/SiteFrame';

function Page() {
  const { route } = useI18n();
  const home = route === '/';
  return <SiteFrame home={home}>{home ? <Home /> : <LegalPage path={route} />}</SiteFrame>;
}

/** A page of the site: `path` is its route in the default language, e.g. `/privacy`. */
export default function App({ locale, messages, path = '/' }: { locale: Locale; messages: Messages; path?: string }) {
  const route = path.replace(/\/$/, '') || '/';
  return (
    <I18nProvider locale={locale} route={route} messages={messages}>
      <Page />
    </I18nProvider>
  );
}
