import { NotFound } from '@/components/NotFound';
import { RootDocument } from '@/components/RootDocument';
import { DEFAULT_LOCALE } from '@/i18n/config';

export const metadata = { title: 'Stane: 404', robots: { index: false } };

export default function GlobalNotFound() {
  return <RootDocument locale={DEFAULT_LOCALE}><NotFound /></RootDocument>;
}
