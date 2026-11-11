import type { Locale } from './config';
import en from './en.json';
import es from './es.json';
import fr from './fr.json';

/** Every text of the site. The default language defines the shape; the others must match it. */
export type Messages = typeof en;
export type LegalPageMessages = Messages['legal']['pages']['/privacy'];

export const MESSAGES: Record<Locale, Messages> = { es, en, fr };
