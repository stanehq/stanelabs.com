import { LocalePage } from '@/i18n/LocalePage';
import { pageMetadata } from '@/lib/metadata';

export const metadata = pageMetadata('es', '/');

export default function Page() {
  return <LocalePage locale="es" route="/" />;
}
