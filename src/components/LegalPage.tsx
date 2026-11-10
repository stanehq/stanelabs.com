import { pageContent } from '../lib/legal-content';
import { Icon } from './Icon';

const lastUpdated = '13 de octubre de 2026';

export function LegalPage({ path }: { path: string }) {
  const page = pageContent[path];
  if (!page) {
    return (
      <div className="container legal-page">
        <h1>Página no encontrada.</h1>
        <a href="/">Volver al inicio</a>
      </div>
    );
  }
  return (
    <article className="container legal-page">
      <a className="back-link" href="/"><Icon name="arrow-left" size={16} />Volver a Stane</a>
      <div className="legal-header">
        <p className="section-label">{page.label}</p>
        <h1>{page.title}</h1>
        <p>{page.lead}</p>
        <span className="legal-meta">{`Última actualización: ${lastUpdated}`}</span>
      </div>
      <div className="legal-content">
        {page.sections.map(section => (
          <section className="legal-section" key={section.title}>
            <h2>{section.title}</h2>
            <div>{section.content}</div>
          </section>
        ))}
      </div>
    </article>
  );
}
