import type { Locale } from './config';
import es from './es.json';
import en from './en.json';
import fr from './fr.json';

/** Every text of the site. Spanish defines the shape; the other languages must match it. */
export type Messages = typeof es;
export type LegalPageMessages = Messages['legal']['pages']['/privacy'];

export const MESSAGES: Record<Locale, Messages> = { es, en, fr };
