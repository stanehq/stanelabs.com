'use client';

import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type FormEvent, type ReactNode } from 'react';
import config from '../../project-config.json';
import { Icon } from './Icon';
import { Button } from './ui/button';
import { Input, Textarea } from './ui/input';

const contactApiUrl = (process.env.NEXT_PUBLIC_CONTACT_API_URL || '').replace(/\/$/, '');
const topics = ['Consulta inicial', 'Ciberseguridad', 'Seguridad operativa', 'Datos sensibles'] as const;
type Topic = typeof topics[number];
type DeliveryMode = 'waiting' | 'checking' | 'direct' | 'draft';

const subscribeHydration = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;

function prepareDraft(values: FormData, topic: string) {
  const body = `Nombre: ${values.get('name')}\nCorreo de contacto: ${values.get('email')}\nÁrea: ${topic}\n\n${values.get('message')}`;
  return `mailto:${config.contactEmail}?subject=${encodeURIComponent(`Stane — ${topic}`)}&body=${encodeURIComponent(body)}`;
}

export default function ContactSection({ children }: { children?: ReactNode }) {
  const sectionRef = useRef<HTMLElement>(null);
  const panelHeadingRef = useRef<HTMLHeadingElement>(null);
  const [expanded, setExpanded] = useState(false);
  const hydrated = useSyncExternalStore(subscribeHydration, clientSnapshot, serverSnapshot);
  const [topic, setTopic] = useState<Topic>('Consulta inicial');
  const [mode, setMode] = useState<DeliveryMode>(contactApiUrl ? 'waiting' : 'draft');
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState('');
  const [draft, setDraft] = useState('');

  const openForm = useCallback(() => {
    setExpanded(true);
    window.requestAnimationFrame(() => {
      panelHeadingRef.current?.focus({ preventScroll: true });
      panelHeadingRef.current?.scrollIntoView({ block: 'start', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
    });
  }, []);

  useEffect(() => {
    const open = openForm;
    const selectTopic = (event: Event) => {
      const detail: unknown = (event as CustomEvent).detail;
      if (typeof detail === 'string' && topics.includes(detail as Topic)) {
        setTopic(detail as Topic);
        open();
      }
    };
    const followContactLink = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      if (event.target instanceof Element && event.target.closest('a[href="#contacto"]')) open();
    };
    const followHash = () => { if (window.location.hash === '#contacto') open(); };
    window.addEventListener('stane:contact-open', open);
    window.addEventListener('stane:contact-topic', selectTopic);
    window.addEventListener('hashchange', followHash);
    document.addEventListener('click', followContactLink);
    const initialHash = window.setTimeout(followHash, 0);
    return () => {
      window.clearTimeout(initialHash);
      window.removeEventListener('stane:contact-open', open);
      window.removeEventListener('stane:contact-topic', selectTopic);
      window.removeEventListener('hashchange', followHash);
      document.removeEventListener('click', followContactLink);
    };
  }, [openForm]);

  useEffect(() => {
    if (!contactApiUrl) return;
    const controller = new AbortController();
    let active = true;
    let started = false;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const checkStatus = () => {
      if (!active || started) return;
      started = true;
      setMode('checking');
      timeout = setTimeout(() => controller.abort(), 5000);
      fetch(`${contactApiUrl}/contact/status`, { signal: controller.signal })
        .then(response => response.ok ? response.json() : null)
        .then(data => { if (active) setMode(data?.configured === true ? 'direct' : 'draft'); })
        .catch(() => { if (active) setMode('draft'); })
        .finally(() => clearTimeout(timeout));
    };
    const observer = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        observer?.disconnect();
        checkStatus();
      }
    }, { rootMargin: '400px' });
    if (observer && sectionRef.current) observer.observe(sectionRef.current);
    else queueMicrotask(checkStatus);
    return () => {
      active = false;
      observer?.disconnect();
      clearTimeout(timeout);
      controller.abort();
    };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!hydrated || pending || mode === 'waiting' || mode === 'checking') return;
    const values = new FormData(event.currentTarget);
    const selectedTopic = String(values.get('topic') || 'Consulta inicial');
    setNotice('');
    setDraft('');
    if (mode !== 'direct') {
      setDraft(prepareDraft(values, selectedTopic));
      return;
    }
    setPending(true);
    try {
      const response = await fetch(`${contactApiUrl}/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: values.get('name'), email: values.get('email'), topic: selectedTopic,
          message: values.get('message'), website: values.get('website') || '',
        }),
        signal: AbortSignal.timeout(15000),
      });
      const result = await response.json();
      if (!response.ok || result.status !== 'sent') throw new Error('send-failed');
      setNotice('El servidor de correo ha aceptado tu consulta. Esto no confirma su llegada al buzón; conserva una copia si necesitas hacer seguimiento.');
    } catch {
      setNotice('No se pudo confirmar el envío. Hemos preparado una copia para que puedas enviarla desde tu aplicación de correo.');
      setDraft(prepareDraft(values, selectedTopic));
    } finally {
      setPending(false);
    }
  }

  const checking = mode === 'waiting' || mode === 'checking';
  return <section ref={sectionRef} id="contacto" className="contact-section" aria-labelledby="contact-heading">
    <div className={`container contact-layout${expanded ? ' is-expanded' : ''}`}>
      <div className="contact-intro">
        <p className="section-label">CONTACTO</p>
        <h2 id="contact-heading">Tu consulta, <span>el primer paso.</span></h2>
        <p className="contact-lead">Cuéntanos qué quieres proteger o aclarar. Una descripción general es suficiente para empezar.</p>
        <Button type="button" className="contact-toggle" aria-expanded={expanded} aria-controls="contact-form-panel" onClick={() => expanded ? setExpanded(false) : openForm()}>{expanded ? 'Cerrar formulario' : 'Hacer una consulta'}<Icon name={expanded ? 'x' : 'plus'} size={20} /></Button>
        <a className="contact-email" href={`mailto:${config.contactEmail}`}>
          <span className="contact-email-label">O escríbenos directamente</span>
          <span>{config.contactEmail}<Icon name="arrow-up-right" size={20} /></span>
        </a>
      </div>
      <div id="contact-form-panel" className="contact-panel" hidden={!expanded}>
        <div className="contact-panel-heading"><h3 ref={panelHeadingRef} tabIndex={-1}>Tu consulta</h3></div>
        <form className="contact-form" onSubmit={submit} method="post" aria-describedby="contact-delivery-note">
          <fieldset className="contact-fieldset" disabled={!hydrated || pending}>
            <input name="website" type="text" tabIndex={-1} autoComplete="off" aria-hidden="true" className="honeypot" />
            <div className="form-grid">
              <label className="field"><span className="field-label">Tu nombre</span><Input name="name" placeholder="Cómo te llamas" autoComplete="name" required maxLength={100} /></label>
              <label className="field"><span className="field-label">Correo de contacto</span><Input name="email" type="email" placeholder="tu@correo.com" autoComplete="email" required maxLength={180} /></label>
            </div>
            <label className="field"><span className="field-label">¿Sobre qué quieres consultar?</span><select name="topic" value={topic} onChange={event => setTopic(event.target.value as Topic)} className="native-select">{topics.map(value => <option key={value}>{value}</option>)}</select></label>
            <label className="field"><span className="field-label">Un poco de contexto</span><Textarea name="message" placeholder="Qué te preocupa y qué te gustaría aclarar. No incluyas contraseñas, claves ni datos de terceros." required maxLength={2000} rows={4} /></label>
            <p id="contact-delivery-note" className="form-note"><Icon name="lock" size={16} />{mode === 'direct' ? 'La consulta se enviará a Stane por correo. Comparte solo información general.' : checking ? 'Comprobando el canal de contacto. Puedes ir preparando tu consulta.' : 'El formulario prepara un borrador en tu aplicación de correo. Revísalo y envíalo allí; no se envía automáticamente.'}</p>
            <div className="contact-submit-row"><Button type="submit" className="form-action" disabled={checking || pending}>{pending ? 'Enviando…' : checking ? 'Comprobando canal…' : mode === 'direct' ? 'Enviar consulta' : 'Preparar consulta'}<Icon name="arrow-up-right" size={20} /></Button></div>
          </fieldset>
          {notice && <p className="form-result" role="status">{notice}</p>}
          {draft && <div className="form-result" role="status"><p>Tu borrador está preparado. Ábrelo para revisarlo y enviarlo desde tu aplicación de correo.</p><a className="contact-draft-link" href={draft}>Abrir borrador<Icon name="external-link" size={16} /></a></div>}
          <p className="form-note">Consulta cómo se trata la información en la <a href="/privacy">nota de privacidad</a>.</p>
          <noscript><p className="contact-noscript">Para contactar sin JavaScript, escribe a <a href={`mailto:${config.contactEmail}`}>{config.contactEmail}</a> desde tu aplicación de correo. Comparte solo información general.</p></noscript>
        </form>
      </div>
      {children}
    </div>
  </section>;
}
