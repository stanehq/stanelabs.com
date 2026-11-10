import config from '../../project-config.json';
import { useI18n } from '../i18n/I18nProvider';
import { Rich } from '../i18n/Rich';
import type { LegalPageMessages } from '../i18n/messages';
import { Icon } from './Icon';

export function LegalPage({ path }: { path: string }) {
  const { t, href } = useI18n();
  const page = (t.legal.pages as Record<string, LegalPageMessages | undefined>)[path];
  if (!page) {
    return (
      <div className="container legal-page">
        <h1>{t.notFound.title}</h1>
        <a href={href('/')}>{t.common.backHome}</a>
      </div>
    );
  }
  return (
    <article className="container legal-page">
      <a className="back-link" href={href('/')}><Icon name="arrow-left" size={16} />{t.common.back}</a>
      <div className="legal-header">
        <p className="section-label">{page.label}</p>
        <h1>{page.title}</h1>
        <p>{page.lead}</p>
        <span className="legal-meta">{t.legal.updated}</span>
      </div>
      <div className="legal-content">
        {page.sections.map(section => (
          <section className="legal-section" key={section.title}>
            <h2>{section.title}</h2>
            <div>{section.paragraphs.map(paragraph => <p key={paragraph}><Rich text={paragraph} email={config.securityEmail} /></p>)}</div>
          </section>
        ))}
      </div>
    </article>
  );
}
