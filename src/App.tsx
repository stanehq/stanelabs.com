'use client';
import { useEffect, useRef, useState, lazy, Suspense } from 'react';
import { Icon } from './components/Icon';
import ContactSection from './components/ContactSection';
import { Button } from './components/ui/button';
import config from '../project-config.json';
import { pageContent } from './lib/legal-content';
const LiquidField = lazy(() => import('./components/LiquidField'));

const services = [
  { id: 'cyber', title: 'Ciberseguridad', context: 'Sistemas y accesos', icon: 'shield' as const,
    summary: 'Identifica tu exposición y decide qué proteger primero.',
    items: ['Activos y configuraciones', 'Accesos y privilegios', 'Preparación ante incidentes'],
    deliverable: 'Mapa de exposición y prioridades.' },
  { id: 'opsec', title: 'Seguridad operativa', context: 'Identidad y comunicaciones', icon: 'eye-off' as const,
    summary: 'Reduce tu huella y separa los contextos que necesitan límites.',
    items: ['Huella digital', 'Separación de identidades', 'Canales y hábitos de trabajo'],
    deliverable: 'Prácticas para reducir la exposición.' },
  { id: 'data', title: 'Datos sensibles', context: 'Información y permisos', icon: 'lock' as const,
    summary: 'Controla quién accede a tu información y cómo se conserva.',
    items: ['Clasificación y permisos', 'Cifrado y conservación', 'Eliminación de información'],
    deliverable: 'Plan de protección de la información.' },
];
const workflow = [
  ['Tu contexto', 'Acordamos qué proteger, el alcance y las autorizaciones.'],
  ['Tus prioridades', 'Un diagnóstico claro de la exposición y su impacto.'],
  ['Tu siguiente paso', 'Medidas concretas, ordenadas en un plan de acción.'],
];
const questions = [
  ['¿Por dónde empiezo?', 'Una preocupación o una descripción general basta. A partir de ahí, definimos qué conviene revisar.'],
  ['¿Qué puedo compartir?', 'Solo contexto general. El canal para contraseñas, documentos y otros detalles sensibles se acuerda antes.'],
  ['¿Has encontrado una vulnerabilidad?', 'Escribe a security@stanelabs.com con la URL y pasos mínimos para reproducirla. Consulta primero la política de seguridad.'],
];

function Brand() {
  return <a className="brand" href="/" aria-label="Stane, inicio"><img src="/brand/stane-mark.svg" className="brand-logo" width="40" height="40" alt="" /><span className="brand-wordmark">Stane<span className="brand-period">.</span></span></a>;
}
function Header({ home }: { home: boolean }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const contactButtonRef = useRef<HTMLButtonElement>(null);
  const closeContact = () => {
    setContactOpen(false);
    contactButtonRef.current?.focus({ preventScroll: true });
  };
  useEffect(() => {
    const open = () => { setContactOpen(true); setMenuOpen(false); };
    const followContactLink = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      if (event.target instanceof Element && event.target.closest('a[href="#contacto"], a[href="/#contacto"]')) {
        event.preventDefault();
        open();
      }
    };
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !headerRef.current?.contains(event.target)) setContactOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && contactOpen) {
        setContactOpen(false);
        contactButtonRef.current?.focus({ preventScroll: true });
      }
    };
    document.addEventListener('click', followContactLink);
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    window.addEventListener('stane:contact-topic', open);
    return () => {
      document.removeEventListener('click', followContactLink);
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', escape);
      window.removeEventListener('stane:contact-topic', open);
    };
  }, [contactOpen]);
  useEffect(() => {
    const followHash = () => { if (window.location.hash === '#contacto') setContactOpen(true); };
    const initial = window.setTimeout(followHash, 0);
    window.addEventListener('hashchange', followHash);
    return () => { window.clearTimeout(initial); window.removeEventListener('hashchange', followHash); };
  }, []);
  const links = [['servicios', 'Especialidades'], ['enfoque', 'Cómo trabajamos'], ['contacto', 'Contacto']];
  return <header ref={headerRef} className="site-header"><div className="header-inner"><Brand /><nav className="desktop-nav" aria-label="Navegación principal">{links.map(([id, label]) => <a key={id} href={`${home ? '' : '/'}#${id}`} className="nav-link">{label}</a>)}</nav><div className="header-end"><Button ref={contactButtonRef} type="button" size="sm" className="header-contact" aria-expanded={contactOpen} aria-controls="contacto" onClick={() => { setContactOpen(value => !value); setMenuOpen(false); }}>Contactarnos<Icon name={contactOpen ? 'x' : 'plus'} size={16} /></Button><Button className="menu-button" size="icon" aria-expanded={menuOpen} aria-controls="mobile-menu" aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'} onClick={() => { setMenuOpen(!menuOpen); setContactOpen(false); }}><Icon name={menuOpen ? 'x' : 'menu'} /></Button></div></div>{menuOpen && <nav id="mobile-menu" className="mobile-menu" aria-label="Navegación móvil">{links.map(([id, label]) => <a key={id} className="mobile-nav-link" href={`${home ? '' : '/'}#${id}`} onClick={() => setMenuOpen(false)}>{label}<Icon name="arrow-up-right" /></a>)}<a className="mobile-nav-link" href="/security" onClick={() => setMenuOpen(false)}>Seguridad<Icon name="arrow-up-right" /></a></nav>}<ContactSection expanded={contactOpen} onClose={closeContact} /></header>;
}
function Hero() {
  return <section className="hero-shell" aria-labelledby="hero-heading"><div className="container hero"><div className="hero-copy"><p className="eyebrow"><span className="eyebrow-dot" />ESTUDIO DE CIBERSEGURIDAD Y OPSEC</p><h1 id="hero-heading" className="hero-title"><span>Tus datos.</span><span>Tu identidad.</span><span className="hero-title-accent">Tu control.</span></h1><p className="hero-description">Entiende tu exposición.<br />Protege lo que importa, con criterio.</p><div className="hero-actions"><a className="text-link" href="#servicios">Explorar especialidades<Icon name="arrow-down" size={16} /></a></div></div><div className="hero-art" aria-hidden="true"><Suspense fallback={<div className="sculpture-fallback is-loading"><span /><span /><span /></div>}><LiquidField /></Suspense></div></div></section>;
}
function Home() {
  return <><Hero />
    <section id="servicios" className="services-section container" aria-labelledby="services-heading">
      <span id="panel-especialidades" className="legacy-anchor" aria-hidden="true" />
      <div className="section-heading"><div><p className="section-label">ESPECIALIDADES</p><h2 id="services-heading">Tres perspectivas. <span>Una misma defensa.</span></h2></div></div>
      <div className="service-grid">{services.map((service, index) => <article key={service.id} id={service.id} className="service-card" aria-labelledby={'heading-' + service.id}>
        <span id={'service-panel-' + service.id} className="legacy-anchor" aria-hidden="true" />
        <div className="service-top"><span className="service-icon"><Icon name={service.icon} size={20} /></span><div><p className="service-context">{service.context}</p><h3 id={'heading-' + service.id}>{service.title}</h3></div><span className="service-number">0{index + 1}</span></div>
        <p className="service-summary">{service.summary}</p>
        <ul className="service-points">{service.items.map(item => <li key={item}><Icon name="check" size={16} />{item}</li>)}</ul>
        <div className="service-result"><Icon name="file-text" size={16} /><p>{service.deliverable}</p></div>
        <a className="text-link service-link" href="#contacto" onClick={() => window.dispatchEvent(new CustomEvent('stane:contact-topic', { detail: service.title }))}>Hablemos de esta área<Icon name="arrow-up-right" size={16} /></a>
      </article>)}</div>
      <div id="enfoque" className="approach-panel" aria-labelledby="approach-heading"><span id="panel-enfoque" className="legacy-anchor" aria-hidden="true" /><span id="entregables" className="legacy-anchor" aria-hidden="true" /><span id="panel-entregables" className="legacy-anchor" aria-hidden="true" /><div className="approach-heading"><p className="section-label">CÓMO TRABAJAMOS · QUÉ RECIBES</p><h2 id="approach-heading">De tu contexto a un plan.</h2></div><ol className="workflow-list">{workflow.map(([title, text], index) => <li key={title}><span className="step-number">0{index + 1}</span><div><h3>{title}</h3><p>{text}</p></div></li>)}</ol></div>
    </section>
    <section className="contact-section"><div className="container contact-layout"><div className="contact-intro"><p className="section-label">CONTACTO</p><h2>Tu consulta, <span>el primer paso.</span></h2><p className="contact-lead">Cuéntanos qué quieres proteger o aclarar. Una descripción general es suficiente para empezar.</p><a className="contact-email" href={`mailto:${config.contactEmail}`}><span className="contact-email-label">Escríbenos directamente</span><span>{config.contactEmail}<Icon name="arrow-up-right" size={20} /></span></a></div><div id="preguntas" className="contact-questions" aria-labelledby="questions-heading"><span id="panel-preguntas" className="legacy-anchor" aria-hidden="true" /><h3 id="questions-heading" className="questions-title">Antes de escribirnos</h3><div className="faq-list">{questions.map(([question, answer]) => <article key={question} className="faq-entry"><h3>{question}</h3><p>{answer}</p>{question.includes('vulnerabilidad') && <a className="text-link" href="/security">Política de seguridad<Icon name="arrow-up-right" size={16} /></a>}</article>)}</div></div></div></section>
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
