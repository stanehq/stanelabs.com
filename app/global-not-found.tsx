import { NotFound } from '@/components/NotFound';
import { RootDocument } from '@/components/RootDocument';

export const metadata = { title: 'Stane: 404', robots: { index: false } };

export default function GlobalNotFound() {
  return <RootDocument locale="es"><NotFound /></RootDocument>;
}
