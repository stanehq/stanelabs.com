'use client';
import { useState, lazy, Suspense } from 'react';
import { Icon } from './components/Icon';
import ContactSection from './components/ContactSection';
import { Button } from './components/ui/button';
import { pageContent } from './lib/legal-content';
const LiquidField = lazy(() => import('./components/LiquidField'));

const services = [
  { id: 'cyber', title: 'Ciberseguridad', context: 'Sistemas y accesos', icon: 'shield' as const,
    headline: 'Entiende dónde estás expuesto.',
    summary: 'Pon orden en tus activos, accesos y configuraciones. Identifica qué necesita atención y qué medidas tienen sentido en tu entorno.',
    items: ['Superficie de ataque y configuraciones', 'Controles y privilegios adecuados', 'Preparación ante incidentes'],
    deliverable: 'Un mapa de exposición y prioridades.' },
  { id: 'opsec', title: 'Seguridad operativa', context: 'Identidad y comunicaciones', icon: 'eye-off' as const,
    headline: 'Reduce lo que revelas sin querer.',
    summary: 'Comprende tu huella digital y los vínculos entre tus contextos. Separa identidades, accesos y comunicaciones con prácticas que puedas mantener.',
    items: ['Huella digital y exposición personal', 'Separación de contextos e identidades', 'Hábitos y canales de trabajo'],
    deliverable: 'Un modelo de exposición y prácticas claras.' },
  { id: 'data', title: 'Datos sensibles', context: 'Información y permisos', icon: 'lock' as const,
    headline: 'Da a tu información los límites correctos.',
    summary: 'Identifica qué datos requieren protección, quién necesita acceder y cómo cuidarlos desde su creación hasta su eliminación.',
    items: ['Clasificación de la información', 'Accesos y permisos proporcionados', 'Cifrado, conservación y eliminación'],
    deliverable: 'Un plan de protección por ciclo de vida.' },
];
const workflow = [
  ['Entender', 'Partimos de tu contexto: qué quieres proteger, qué te preocupa y qué límites debemos respetar.'],
  ['Priorizar', 'Ordenamos la exposición y las necesidades. El alcance y las autorizaciones se acuerdan antes de analizar.'],
  ['Decidir', 'Conectamos cada hallazgo con una medida y un siguiente paso que puedas entender y valorar.'],
];
const questions = [
  ['¿Necesito saber exactamente qué falla?', 'No. Puedes empezar por una preocupación o una descripción general de tu situación. Esa conversación ayuda a definir qué conviene revisar.'],
  ['¿Qué información puedo compartir?', 'En el primer contacto basta con tu contexto y tu objetivo. Reserva contraseñas, claves, documentos privados y datos de terceros; el canal para detalles sensibles se acuerda antes.'],
  ['¿Cómo comunico una vulnerabilidad del sitio?', 'Escribe a security@stanelabs.com con la URL afectada, una descripción y pasos mínimos para reproducirla. Consulta la política de seguridad antes de realizar pruebas.'],
];

function Brand() {
  return <a className="brand" href="/" aria-label="Stane, inicio"><img src="/brand/stane-mark.svg" className="brand-logo" width="40" height="40" alt="" /><span className="brand-wordmark">Stane<span className="brand-period">.</span></span></a>;
}
function Header({ home }: { home: boolean }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const links = [['servicios', 'Especialidades'], ['enfoque', 'Cómo trabajamos'], ['contacto', 'Contacto']];
  return <header className="site-header"><div className="header-inner"><Brand /><nav className="desktop-nav" aria-label="Navegación principal">{links.map(([id, label]) => <a key={id} href={`${home ? '' : '/'}#${id}`} className="nav-link">{label}</a>)}</nav><div className="header-end"><Button asChild size="sm" className="header-contact"><a href={`${home ? '' : '/'}#contacto`}>Hablemos<Icon name="arrow-up-right" size={16} /></a></Button><Button className="menu-button" size="icon" aria-expanded={menuOpen} aria-controls="mobile-menu" aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'} onClick={() => setMenuOpen(!menuOpen)}><Icon name={menuOpen ? 'x' : 'menu'} /></Button></div></div>{menuOpen && <nav id="mobile-menu" className="mobile-menu" aria-label="Navegación móvil">{links.map(([id, label]) => <a key={id} className="mobile-nav-link" href={`${home ? '' : '/'}#${id}`} onClick={() => setMenuOpen(false)}>{label}<Icon name="arrow-up-right" /></a>)}<a className="mobile-nav-link" href="/security" onClick={() => setMenuOpen(false)}>Seguridad<Icon name="arrow-up-right" /></a></nav>}</header>;
}
function Hero() {
  return <section className="hero-shell" aria-labelledby="hero-heading"><div className="container hero"><div className="hero-copy"><p className="eyebrow"><span className="eyebrow-dot" />ESTUDIO DE CIBERSEGURIDAD Y OPSEC</p><h1 id="hero-heading" className="hero-title"><span>Tus datos.</span><span>Tu identidad.</span><span className="hero-title-accent">Tu control.</span></h1><p className="hero-description">Ciberseguridad, seguridad operativa y datos sensibles. Entiende tu exposición y decide cómo proteger lo que importa.</p><div className="hero-actions"><Button asChild><a href="#contacto">Cuéntanos tu contexto<Icon name="arrow-up-right" /></a></Button><a className="text-link" href="#servicios">Descubre cómo podemos ayudarte<Icon name="arrow-down" size={16} /></a></div></div><div className="hero-art" aria-hidden="true"><Suspense fallback={<div className="sculpture-fallback is-loading"><span /><span /><span /></div>}><LiquidField /></Suspense></div></div></section>;
}
function Home() {
  return <><Hero />
    <section id="servicios" className="services-section container" aria-labelledby="services-heading">
      <span id="panel-especialidades" className="legacy-anchor" aria-hidden="true" />
      <div className="section-heading"><div><p className="section-label">QUÉ PODEMOS REVISAR</p><h2 id="services-heading">Tres perspectivas.<br /><span>Una misma defensa.</span></h2></div><p>El punto de partida es lo que necesitas proteger.<br />Cada área conecta tu contexto con un resultado útil.</p></div>
      <div className="service-grid">{services.map((service, index) => <article key={service.id} id={service.id} className="service-card" aria-labelledby={'heading-' + service.id}>
        <span id={'service-panel-' + service.id} className="legacy-anchor" aria-hidden="true" />
        <div className="service-top"><span className="service-icon"><Icon name={service.icon} size={24} /></span><span className="service-number">0{index + 1}</span></div>
        <p className="service-context">{service.context}</p><h3 id={'heading-' + service.id}>{service.title}</h3><p className="service-headline">{service.headline}</p><p className="service-summary">{service.summary}</p>
        <ul className="service-points">{service.items.map(item => <li key={item}><Icon name="check" size={16} />{item}</li>)}</ul>
        <div className="service-result"><span>Qué te llevas</span><p>{service.deliverable}</p></div>
        <a className="text-link service-link" href="#contacto" onClick={() => window.dispatchEvent(new CustomEvent('stane:contact-topic', { detail: service.title }))}>Consultar sobre esta área<Icon name="arrow-up-right" size={16} /></a>
      </article>)}</div>
    </section>
    <section id="enfoque" className="approach-section" aria-labelledby="approach-heading"><div className="container approach-layout"><div className="section-intro"><span id="panel-enfoque" className="legacy-anchor" aria-hidden="true" /><p className="section-label">CÓMO TRABAJAMOS</p><h2 id="approach-heading">Primero entender.<br /><span>Después actuar.</span></h2><p>No empezamos por una lista de herramientas. Empezamos por tu realidad, el alcance y las decisiones que necesitas tomar.</p><a className="text-link" href="#contacto">Hablar de mi situación<Icon name="arrow-up-right" size={16} /></a></div><ol className="workflow-list">{workflow.map(([title, text], index) => <li key={title}><span className="step-number">0{index + 1}</span><div><h3>{title}</h3><p>{text}</p></div></li>)}</ol></div></section>
    <section id="entregables" className="outcomes-section container" aria-labelledby="outcomes-heading"><span id="panel-entregables" className="legacy-anchor" aria-hidden="true" /><div className="section-intro"><p className="section-label">QUÉ RECIBES</p><h2 id="outcomes-heading">Claridad para decidir.<br /><span>Un plan para avanzar.</span></h2><p>Un resultado útil debe explicar qué necesita atención, por qué importa y qué puedes hacer después. El contenido se acuerda según el alcance.</p><ul className="outcome-points"><li><Icon name="file-text" size={20} /><div><h3>Un diagnóstico comprensible</h3><p>Hallazgos conectados con tu contexto.</p></div></li><li><Icon name="sliders" size={20} /><div><h3>Prioridades con criterio</h3><p>Medidas ordenadas por impacto y necesidad.</p></div></li><li><Icon name="compass" size={20} /><div><h3>Próximos pasos concretos</h3><p>Un camino que puedas valorar y poner en marcha.</p></div></li></ul></div><div className="result-preview" aria-label="Ejemplo ilustrativo de un entregable"><div className="result-preview-header"><img src="/brand/stane-mark.svg" width="28" height="28" alt="" /><span>Ejemplo de estructura</span><Icon name="file-text" size={20} /></div><div className="result-preview-body"><p className="section-label">DEL ANÁLISIS A LA ACCIÓN</p><h3>Tu mapa de decisiones.</h3><div className="result-preview-row"><span>01</span><div><h4>Lo que observamos</h4><p>La exposición, su contexto y sus límites.</p></div></div><div className="result-preview-row"><span>02</span><div><h4>Lo que priorizamos</h4><p>Qué merece atención primero y por qué.</p></div></div><div className="result-preview-row"><span>03</span><div><h4>Lo que proponemos</h4><p>Medidas proporcionadas y siguientes pasos.</p></div></div></div><p className="preview-note">Ejemplo ilustrativo. No representa un trabajo de un cliente.</p></div></section>
    <section id="preguntas" className="questions-section container" aria-labelledby="questions-heading"><span id="panel-preguntas" className="legacy-anchor" aria-hidden="true" /><div className="section-intro"><p className="section-label">ANTES DE ESCRIBIRNOS</p><h2 id="questions-heading">Empezar puede<br /><span>ser sencillo.</span></h2><p>Una consulta general es suficiente para empezar. Estas respuestas te ayudan a preparar el primer mensaje.</p></div><div className="faq-list">{questions.map(([question, answer]) => <article key={question} className="faq-entry"><h3>{question}</h3><p>{answer}</p>{question.includes('vulnerabilidad') && <a className="text-link" href="/security">Leer la política de seguridad<Icon name="arrow-up-right" size={16} /></a>}</article>)}</div></section>
    <ContactSection />
  </>;
}
function LegalPage({ path }: {path: string}) {
  const data = pageContent[path];
  if (!data) return <div className="container legal-page"><h1>Página no encontrada.</h1><a href="/">Volver al inicio</a></div>;
  return <article className="container legal-page"><a className="back-link" href="/"><Icon name="arrow-left" size={16} />Volver a Stane</a><div className="legal-header"><p className="section-label">{data.label}</p><h1>{data.title}</h1><p>{data.lead}</p><span className="legal-meta">Última actualización: 13 de octubre de 2026</span></div><div className="legal-content">{data.sections.map(section => <section className="legal-section" key={section.title}><h2>{section.title}</h2><div>{section.content}</div></section>)}</div></article>;
}
function Footer() {
  return <footer className="footer"><div className="container footer-inner"><Brand /><div className="footer-links"><a href="/security">Seguridad</a><a href="/privacy">Privacidad</a><a href="/tos">Términos</a><a href="/purchase">Contratación</a><a href="/.well-known/security.txt">security.txt<Icon name="arrow-up-right" size={16} /></a></div><span className="copyright">© 2026 Stane</span></div></footer>;
}
export default function App({ path = '/' }: { path?: string }) {
  const normalized = path.replace(/\/$/, '') || '/';
  return <div className="site-frame"><a href="#main" className="skip-link">Saltar al contenido</a><Header home={normalized === '/'} /><main id="main">{normalized === '/' ? <Home /> : <LegalPage path={normalized} />}</main><Footer /></div>;
}
