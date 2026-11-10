'use client';

import { LOCALES, LOCALE_NAMES, localePath } from '../i18n/config';
import { useI18n } from '../i18n/I18nProvider';

/** Links to the current page in every language. */
export function LanguageSwitch({ className = '' }: { className?: string }) {
  const { locale, route, t } = useI18n();
  return (
    <div className={`language-switch ${className}`} role="group" aria-label={t.header.language}>
      {LOCALES.map(code => (
        <a key={code} href={localePath(code, route)} lang={code} hrefLang={code} aria-label={LOCALE_NAMES[code]} aria-current={code === locale ? 'page' : undefined}>
          {code.toUpperCase()}
        </a>
      ))}
    </div>
  );
}
