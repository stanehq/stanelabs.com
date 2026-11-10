import React from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import App from './App';
import { parsePath } from './i18n/config';
import { MESSAGES } from './i18n/messages';
import './styles.css';
import './fonts/visual.css';

const element = document.getElementById('root')!;
const { locale, route } = parsePath(window.location.pathname);
const app = <React.StrictMode><App locale={locale} messages={MESSAGES[locale]} path={route} /></React.StrictMode>;

if (element.childNodes.length > 0) hydrateRoot(element, app); else createRoot(element).render(app);
