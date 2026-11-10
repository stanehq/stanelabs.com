'use client';

import { useI18n } from './I18nProvider';

const TOKEN = /(\{email\}|\[[^\]]+\]\([^)]+\))/;
const LINK = /^\[([^\]]+)\]\(([^)]+)\)$/;

/**
 * Renders a message with two kinds of markup: `{email}` becomes a mailto link to
 * the given address, and `[text](/route)` becomes a link localized to the current language.
 */
export function Rich({ text, email }: { text: string; email: string }) {
  const { href } = useI18n();
  return (
    <>
      {text.split(TOKEN).map((part, index) => {
        if (part === '{email}') return <a key={index} href={`mailto:${email}`}>{email}</a>;
        const link = LINK.exec(part);
        return link ? <a key={index} href={href(link[2])}>{link[1]}</a> : part;
      })}
    </>
  );
}
