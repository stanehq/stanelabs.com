'use client';

import { I18nProvider, useI18n } from './i18n/I18nProvider';
import type { Locale } from './i18n/config';
import type { Messages } from './i18n/messages';
import { Footer } from './components/Footer';
import { Header } from './components/Header';
import { Home } from './components/Home';
import { LegalPage } from './components/LegalPage';
import { LiveBuild } from './components/LiveBuild';

function Site() {
  const { route, t } = useI18n();
  const home = route === '/';
  return (
    <div className="site-frame">
      {home && <LiveBuild />}
      <a href="#main" className="skip-link">{t.common.skipLink}</a>
      <Header home={home} />
      <main id="main">{home ? <Home /> : <LegalPage path={route} />}</main>
      <Footer />
    </div>
  );
}

/** A page of the site: `path` is its route in the default language, e.g. `/privacy`. */
export default function App({ locale, messages, path = '/' }: { locale: Locale; messages: Messages; path?: string }) {
  const route = path.replace(/\/$/, '') || '/';
  return (
    <I18nProvider locale={locale} route={route} messages={messages}>
      <Site />
    </I18nProvider>
  );
}
