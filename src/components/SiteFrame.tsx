'use client';

import type { ReactNode } from 'react';
import { useI18n } from '../i18n/I18nProvider';
import { Footer } from './Footer';
import { Header } from './Header';
import { LiveBuild } from './LiveBuild';

/** Header, content and footer shared by every page; `home` also enables the live build. */
export function SiteFrame({ home = false, children }: { home?: boolean; children: ReactNode }) {
  const { t } = useI18n();
  return (
    <div className="site-frame">
      {home && <LiveBuild />}
      <a href="#main" className="skip-link">{t.common.skipLink}</a>
      <Header home={home} />
      <main id="main">{children}</main>
      <Footer />
    </div>
  );
}
