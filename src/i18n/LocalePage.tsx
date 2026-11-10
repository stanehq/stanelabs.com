import App from '../App';
import type { Locale } from './config';
import { MESSAGES } from './messages';

/** A page of the site in one language; only that language's texts reach the browser. */
export function LocalePage({ locale, route }: { locale: Locale; route: string }) {
  return <App locale={locale} messages={MESSAGES[locale]} path={route} />;
}
