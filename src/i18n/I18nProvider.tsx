'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { localizeHref, type Locale } from './config';
import type { Messages } from './messages';

type I18n = {
  locale: Locale;
  /** Current page, as a route in the default language. */
  route: string;
  t: Messages;
  /** Localizes an internal link, such as `/privacy`. */
  href: (target: string) => string;
};

const I18nContext = createContext<I18n | null>(null);

export function I18nProvider({ locale, route, messages, children }: { locale: Locale; route: string; messages: Messages; children: ReactNode }) {
  const value = useMemo<I18n>(() => ({ locale, route, t: messages, href: target => localizeHref(locale, target) }), [locale, route, messages]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18n {
  const context = useContext(I18nContext);
  if (!context) throw new Error('useI18n must be used inside I18nProvider.');
  return context;
}
