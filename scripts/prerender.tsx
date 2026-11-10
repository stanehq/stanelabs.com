import React from 'react';
import { renderToString } from 'react-dom/server';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import App from '../src/App';
import { LOCALES, ROUTES, localePath } from '../src/i18n/config';
import { MESSAGES } from '../src/i18n/messages';

// Vite preview only: writes each page's markup into the built shell, in every language.
const shell = readFileSync('dist/index.html', 'utf8');
const pages: string[] = [];
for (const locale of LOCALES) {
  const messages = MESSAGES[locale];
  for (const route of ROUTES) {
    const markup = renderToString(<React.StrictMode><App locale={locale} messages={messages} path={route} /></React.StrictMode>);
    const html = shell
      .replace('<html lang="es">', `<html lang="${locale}">`)
      .replace(/<title>[^<]*<\/title>/, `<title>${messages.meta.pages[route].title}</title>`)
      .replace('<div id="root"></div>', `<div id="root">${markup}</div>`);
    const url = localePath(locale, route);
    const folder = url === '/' ? 'dist' : path.join('dist', url.slice(1));
    mkdirSync(folder, { recursive: true });
    writeFileSync(path.join(folder, 'index.html'), html);
    pages.push(url);
  }
}
console.log(`Prerendered ${pages.join(', ')}.`);
