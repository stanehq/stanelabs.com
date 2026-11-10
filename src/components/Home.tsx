'use client';

import { lazy, Suspense } from 'react';
import config from '../../project-config.json';
import { useI18n } from '../i18n/I18nProvider';
import { Rich } from '../i18n/Rich';
import { CONTACT_HASH, CONTACT_TOPIC_EVENT } from '../lib/events';
import { Icon, type IconName } from './Icon';

const LiquidField = lazy(() => import('./LiquidField'));

/** Structure of the specialties; their texts live in the messages, under the same id. */
const services = [
  { id: 'cyber', icon: 'shield' },
  { id: 'opsec', icon: 'eye-off' },
  { id: 'data', icon: 'lock' },
] as const satisfies readonly { id: string; icon: IconName }[];
type ServiceId = (typeof services)[number]['id'];

const stepNumber = (index: number) => `0${index + 1}`;

// `data-build` marks the blocks that LiveBuild assembles on scroll; its value
// is the layer type shown in the editor tag (heading, text, button, image or frame).

/** Keeps fragments from earlier versions of the page pointing at the current section. */
function LegacyAnchor({ id }: { id: string }) {
  return <span id={id} className="legacy-anchor" aria-hidden="true" />;
}

function Hero() {
  const { t } = useI18n();
  const [first, second, accent] = t.home.heroTitle;
  const [descriptionStart, descriptionEnd] = t.home.heroDescription;
  return (
    <section className="hero-shell" aria-labelledby="hero-heading">
      <div className="container hero">
        <div className="hero-copy">
          <h1 id="hero-heading" className="hero-title">
            <span data-build="heading">{first}</span>
            <span data-build="heading">{second}</span>
            <span className="hero-title-accent" data-build="heading">{accent}</span>
          </h1>
          <p className="hero-description" data-build="text">{descriptionStart}<br />{descriptionEnd}</p>
          <div className="hero-actions" data-build="button">
            <a className="text-link" href="#servicios">{t.home.heroCta}<Icon name="arrow-down" size={16} /></a>
          </div>
        </div>
        <div className="hero-art" aria-hidden="true" data-build="image">
          <Suspense fallback={null}><LiquidField /></Suspense>
        </div>
      </div>
    </section>
  );
}

function ServiceCard({ id, icon, index }: { id: ServiceId; icon: IconName; index: number }) {
  const { t } = useI18n();
  const service = t.home.services[id];
  const headingId = `heading-${id}`;
  // The contact form listens for this event and preselects the topic.
  const selectTopic = () => window.dispatchEvent(new CustomEvent(CONTACT_TOPIC_EVENT, { detail: id }));
  return (
    <article id={id} className="service-card" aria-labelledby={headingId} data-build="frame">
      <LegacyAnchor id={`service-panel-${id}`} />
      <div className="service-top" data-build="heading">
        <span className="service-icon"><Icon name={icon} size={20} /></span>
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
        {t.home.serviceLink}
        <Icon name="arrow-up-right" size={16} />
      </a>
    </article>
  );
}

function Services() {
  const { t } = useI18n();
  const [titleStart, titleEnd] = t.home.servicesTitle;
  return (
    <section id="servicios" className="services-section container" aria-labelledby="services-heading">
      <LegacyAnchor id="panel-especialidades" />
      <div className="section-heading" data-build="heading">
        <div>
          <p className="section-label">{t.home.servicesLabel}</p>
          <h2 id="services-heading">{titleStart} <span>{titleEnd}</span></h2>
        </div>
      </div>
      <div className="service-grid">
        {services.map(({ id, icon }, index) => <ServiceCard key={id} id={id} icon={icon} index={index} />)}
      </div>
      <div id="enfoque" className="approach-panel" aria-labelledby="approach-heading" data-build="frame">
        <LegacyAnchor id="panel-enfoque" />
        <LegacyAnchor id="entregables" />
        <LegacyAnchor id="panel-entregables" />
        <div className="approach-heading" data-build="heading">
          <p className="section-label">{t.home.approachLabel}</p>
          <h2 id="approach-heading">{t.home.approachTitle}</h2>
        </div>
        <ol className="workflow-list">
          {t.home.workflow.map(({ title, text }, index) => (
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
  const { t, href } = useI18n();
  const [titleStart, titleEnd] = t.home.contactTitle;
  return (
    <section className="contact-section">
      <div className="container contact-layout">
        <div className="contact-intro">
          <p className="section-label" data-build="text">{t.home.contactLabel}</p>
          <h2 data-build="heading">{titleStart} <span>{titleEnd}</span></h2>
          <p className="contact-lead" data-build="text">{t.home.contactLead}</p>
          <a className="contact-email" href={`mailto:${config.contactEmail}`} data-build="button">
            <span className="contact-email-label">{t.home.emailLabel}</span>
            <span>{config.contactEmail}<Icon name="arrow-up-right" size={20} /></span>
          </a>
        </div>
        <div id="preguntas" className="contact-questions" aria-labelledby="questions-heading" data-build="frame">
          <LegacyAnchor id="panel-preguntas" />
          <h3 id="questions-heading" className="questions-title" data-build="text">{t.home.faqTitle}</h3>
          <div className="faq-list">
            {t.home.faq.map(entry => (
              <article key={entry.question} className="faq-entry">
                <h3>{entry.question}</h3>
                <p><Rich text={entry.answer} email={config.securityEmail} /></p>
                {entry.link && <a className="text-link" href={href(entry.link.href)}>{entry.link.label}<Icon name="arrow-up-right" size={16} /></a>}
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
