import { DEFAULT_LOCALE } from '@/i18n/config';
import { LocalePage } from '@/i18n/LocalePage';
import { pageMetadata } from '@/lib/metadata';

export const metadata = pageMetadata(DEFAULT_LOCALE, '/');

export default function Page() {
  return <LocalePage locale={DEFAULT_LOCALE} route="/" />;
}
