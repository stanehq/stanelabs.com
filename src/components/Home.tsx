'use client';

import { lazy, Suspense } from 'react';
import config from '../../project-config.json';
import { CONTACT_HASH, CONTACT_TOPIC_EVENT } from '../lib/events';
import { Icon, type IconName } from './Icon';

const LiquidField = lazy(() => import('./LiquidField'));

type Service = { id: string; title: string; context: string; icon: IconName; summary: string; items: string[]; deliverable: string };

const services: Service[] = [
  {
    id: 'cyber', title: 'Ciberseguridad', context: 'Sistemas y accesos', icon: 'shield',
    summary: 'Identifica tu exposición y decide qué proteger primero.',
    items: ['Activos y configuraciones', 'Accesos y privilegios', 'Preparación ante incidentes'],
    deliverable: 'Mapa de exposición y prioridades.',
  },
  {
    id: 'opsec', title: 'Seguridad operativa', context: 'Identidad y comunicaciones', icon: 'eye-off',
    summary: 'Reduce tu huella y separa los contextos que necesitan límites.',
    items: ['Huella digital', 'Separación de identidades', 'Canales y hábitos de trabajo'],
    deliverable: 'Prácticas para reducir la exposición.',
  },
  {
    id: 'data', title: 'Datos sensibles', context: 'Información y permisos', icon: 'lock',
    summary: 'Controla quién accede a tu información y cómo se conserva.',
    items: ['Clasificación y permisos', 'Cifrado y conservación', 'Eliminación de información'],
    deliverable: 'Plan de protección de la información.',
  },
];

const workflow = [
  { title: 'Tu contexto', text: 'Acordamos qué proteger, el alcance y las autorizaciones.' },
  { title: 'Tus prioridades', text: 'Un diagnóstico claro de la exposición y su impacto.' },
  { title: 'Tu siguiente paso', text: 'Medidas concretas, ordenadas en un plan de acción.' },
];

const questions: { question: string; answer: string; link?: { href: string; label: string } }[] = [
  { question: '¿Por dónde empiezo?', answer: 'Una preocupación o una descripción general basta. A partir de ahí, definimos qué conviene revisar.' },
  { question: '¿Qué puedo compartir?', answer: 'Solo contexto general. El canal para contraseñas, documentos y otros detalles sensibles se acuerda antes.' },
  {
    question: '¿Has encontrado una vulnerabilidad?',
    answer: `Escribe a ${config.securityEmail} con la URL y pasos mínimos para reproducirla. Consulta primero la política de seguridad.`,
    link: { href: '/security', label: 'Política de seguridad' },
  },
];

const stepNumber = (index: number) => `0${index + 1}`;

// `data-build` marks the blocks that LiveBuild assembles on scroll; its value
// is the layer type shown in the editor tag (heading, text, button, image or frame).

/** Keeps fragments from earlier versions of the page pointing at the current section. */
function LegacyAnchor({ id }: { id: string }) {
  return <span id={id} className="legacy-anchor" aria-hidden="true" />;
}

function Hero() {
  return (
    <section className="hero-shell" aria-labelledby="hero-heading">
      <div className="container hero">
        <div className="hero-copy">
          <h1 id="hero-heading" className="hero-title">
            <span data-build="heading">Tus datos.</span>
            <span data-build="heading">Tu identidad.</span>
            <span className="hero-title-accent" data-build="heading">Tu control.</span>
          </h1>
          <p className="hero-description" data-build="text">Entiende tu exposición.<br />Protege lo que importa, con criterio.</p>
          <div className="hero-actions" data-build="button">
            <a className="text-link" href="#servicios">Explorar especialidades<Icon name="arrow-down" size={16} /></a>
          </div>
        </div>
        <div className="hero-art" aria-hidden="true" data-build="image">
          <Suspense fallback={null}><LiquidField /></Suspense>
        </div>
      </div>
    </section>
  );
}

function ServiceCard({ service, index }: { service: Service; index: number }) {
  const headingId = `heading-${service.id}`;
  const selectTopic = () => window.dispatchEvent(new CustomEvent(CONTACT_TOPIC_EVENT, { detail: service.title }));
  return (
    <article id={service.id} className="service-card" aria-labelledby={headingId} data-build="frame">
      <LegacyAnchor id={`service-panel-${service.id}`} />
      <div className="service-top" data-build="heading">
        <span className="service-icon"><Icon name={service.icon} size={20} /></span>
        <div>
          <p className="service-context">{service.context}</p>
          <h3 id={headingId}>{service.title}</h3>
        </div>
        <span className="service-number">{stepNumber(index)}</span>
      </div>
      <p className="service-summary" data-build="text">{service.summary}</p>
      <ul className="service-points">
        {service.items.map(item => <li key={item}><Icon name="check" size={16} />{item}</li>)}
      </ul>
      <div className="service-result" data-build="frame"><Icon name="file-text" size={16} /><p>{service.deliverable}</p></div>
      <a className="text-link service-link" href={CONTACT_HASH} onClick={selectTopic}>
        Hablemos de esta área
        <Icon name="arrow-up-right" size={16} />
      </a>
    </article>
  );
}

function Services() {
  return (
    <section id="servicios" className="services-section container" aria-labelledby="services-heading">
      <LegacyAnchor id="panel-especialidades" />
      <div className="section-heading" data-build="heading">
        <div>
          <p className="section-label">ESPECIALIDADES</p>
          <h2 id="services-heading">Tres perspectivas. <span>Una misma defensa.</span></h2>
        </div>
      </div>
      <div className="service-grid">
        {services.map((service, index) => <ServiceCard key={service.id} service={service} index={index} />)}
      </div>
      <div id="enfoque" className="approach-panel" aria-labelledby="approach-heading" data-build="frame">
        <LegacyAnchor id="panel-enfoque" />
        <LegacyAnchor id="entregables" />
        <LegacyAnchor id="panel-entregables" />
        <div className="approach-heading" data-build="heading">
          <p className="section-label">CÓMO TRABAJAMOS · QUÉ RECIBES</p>
          <h2 id="approach-heading">De tu contexto a un plan.</h2>
        </div>
        <ol className="workflow-list">
          {workflow.map(({ title, text }, index) => (
            <li key={title}>
              <span className="step-number">{stepNumber(index)}</span>
              <div><h3>{title}</h3><p>{text}</p></div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function Contact() {
  return (
    <section className="contact-section">
      <div className="container contact-layout">
        <div className="contact-intro">
          <p className="section-label" data-build="text">CONTACTO</p>
          <h2 data-build="heading">Tu consulta, <span>el primer paso.</span></h2>
          <p className="contact-lead" data-build="text">Cuéntanos qué quieres proteger o aclarar. Una descripción general es suficiente para empezar.</p>
          <a className="contact-email" href={`mailto:${config.contactEmail}`} data-build="button">
            <span className="contact-email-label">Escríbenos directamente</span>
            <span>{config.contactEmail}<Icon name="arrow-up-right" size={20} /></span>
          </a>
        </div>
        <div id="preguntas" className="contact-questions" aria-labelledby="questions-heading" data-build="frame">
          <LegacyAnchor id="panel-preguntas" />
          <h3 id="questions-heading" className="questions-title" data-build="text">Antes de escribirnos</h3>
          <div className="faq-list">
            {questions.map(({ question, answer, link }) => (
              <article key={question} className="faq-entry">
                <h3>{question}</h3>
                <p>{answer}</p>
                {link && <a className="text-link" href={link.href}>{link.label}<Icon name="arrow-up-right" size={16} /></a>}
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export function Home() {
  return <><Hero /><Services /><Contact /></>;
}
