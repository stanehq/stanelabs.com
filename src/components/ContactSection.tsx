'use client';

import { useEffect, useRef, useState, useSyncExternalStore, type FormEvent } from 'react';
import config from '../../project-config.json';
import { useI18n } from '../i18n/I18nProvider';
import { Rich } from '../i18n/Rich';
import type { Messages } from '../i18n/messages';
import { CONTACT_TOPIC_EVENT } from '../lib/events';
import { Icon } from './Icon';
import { Button } from './ui/button';
import { Input, Textarea } from './ui/input';

const contactApiUrl = (process.env.NEXT_PUBLIC_CONTACT_API_URL || '').replace(/\/$/, '');
const TOPIC_KEYS = ['general', 'cyber', 'opsec', 'data'] as const;
type Topic = (typeof TOPIC_KEYS)[number];
const defaultTopic: Topic = 'general';
const isTopic = (value: unknown): value is Topic => TOPIC_KEYS.some(topic => topic === value);
/** Topic names the API accepts; they stay in Spanish whatever the language of the site. */
const API_TOPICS: Record<Topic, string> = { general: 'Consulta inicial', cyber: 'Ciberseguridad', opsec: 'Seguridad operativa', data: 'Datos sensibles' };
type DeliveryMode = 'waiting' | 'checking' | 'direct' | 'draft';

// useSyncExternalStore reports false on the server and true once hydrated,
// so the form stays disabled until JavaScript can handle its submission.
const subscribeHydration = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;

function prepareDraft(values: FormData, topic: Topic, t: Messages['contact']) {
  const label = t.topics[topic];
  const body = `${t.draft.name}: ${values.get('name')}\n${t.draft.email}: ${values.get('email')}\n${t.draft.area}: ${label}\n\n${values.get('message')}`;
  return `mailto:${config.contactEmail}?subject=${encodeURIComponent(`Stane: ${label}`)}&body=${encodeURIComponent(body)}`;
}

export default function ContactSection({ expanded, onClose }: { expanded: boolean; onClose: () => void }) {
  const { t: messages } = useI18n();
  const t = messages.contact;
  const sectionRef = useRef<HTMLDivElement>(null);
  const panelHeadingRef = useRef<HTMLHeadingElement>(null);
  const hydrated = useSyncExternalStore(subscribeHydration, clientSnapshot, serverSnapshot);
  const [topic, setTopic] = useState<Topic>(defaultTopic);
  const [mode, setMode] = useState<DeliveryMode>(contactApiUrl ? 'waiting' : 'draft');
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState('');
  const [draft, setDraft] = useState('');

  useEffect(() => {
    const selectTopic = (event: Event) => {
      const detail: unknown = (event as CustomEvent).detail;
      if (isTopic(detail)) setTopic(detail);
    };
    window.addEventListener(CONTACT_TOPIC_EVENT, selectTopic);
    return () => window.removeEventListener(CONTACT_TOPIC_EVENT, selectTopic);
  }, []);

  useEffect(() => {
    if (!expanded) return;
    const frame = window.requestAnimationFrame(() => panelHeadingRef.current?.focus({ preventScroll: true }));
    return () => window.cancelAnimationFrame(frame);
  }, [expanded]);

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
    const topicValue = values.get('topic');
    const selectedTopic = isTopic(topicValue) ? topicValue : defaultTopic;
    setNotice('');
    setDraft('');
    if (mode !== 'direct') {
      setDraft(prepareDraft(values, selectedTopic, t));
      return;
    }
    setPending(true);
    try {
      const response = await fetch(`${contactApiUrl}/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: values.get('name'), email: values.get('email'), topic: API_TOPICS[selectedTopic],
          message: values.get('message'), website: values.get('website') || '',
        }),
        signal: AbortSignal.timeout(15000),
      });
      const result = await response.json();
      if (!response.ok || result.status !== 'sent') throw new Error('send-failed');
      setNotice(t.results.accepted);
    } catch {
      setNotice(t.results.failed);
      setDraft(prepareDraft(values, selectedTopic, t));
    } finally {
      setPending(false);
    }
  }

  const checking = mode === 'waiting' || mode === 'checking';
  const deliveryNote = mode === 'direct' ? t.notes.direct : checking ? t.notes.checking : t.notes.draft;
  const submitLabel = pending ? t.submit.pending : checking ? t.submit.checking : mode === 'direct' ? t.submit.direct : t.submit.draft;

  return (
    <div ref={sectionRef} id="contacto" className="contact-dropdown" data-open={expanded} inert={!expanded} aria-hidden={!expanded} aria-labelledby="consultation-heading" role="region">
      <div className="contact-dropdown-clip">
        <div className="contact-panel">
          <div className="contact-panel-heading">
            <h3 id="consultation-heading" ref={panelHeadingRef} tabIndex={-1}>{t.title}</h3>
            <button type="button" className="contact-close" onClick={onClose} aria-label={t.close}><Icon name="x" size={20} /></button>
          </div>
          <form className="contact-form" onSubmit={submit} method="post" aria-describedby="contact-delivery-note">
            <fieldset className="contact-fieldset" disabled={!hydrated || pending}>
              <input name="website" type="text" tabIndex={-1} autoComplete="off" aria-hidden="true" className="honeypot" />
              <div className="form-grid">
                <label className="field">
                  <span className="field-label">{t.nameLabel}</span>
                  <Input name="name" placeholder={t.namePlaceholder} autoComplete="name" required maxLength={100} />
                </label>
                <label className="field">
                  <span className="field-label">{t.emailLabel}</span>
                  <Input name="email" type="email" placeholder={t.emailPlaceholder} autoComplete="email" required maxLength={180} />
                </label>
              </div>
              <label className="field">
                <span className="field-label">{t.topicLabel}</span>
                <select name="topic" value={topic} onChange={event => { if (isTopic(event.target.value)) setTopic(event.target.value); }}>
                  {TOPIC_KEYS.map(key => <option key={key} value={key}>{t.topics[key]}</option>)}
                </select>
              </label>
              <label className="field">
                <span className="field-label">{t.messageLabel}</span>
                <Textarea name="message" placeholder={t.messagePlaceholder} required maxLength={2000} rows={4} />
              </label>
              <p id="contact-delivery-note" className="form-note"><Icon name="lock" size={16} />{deliveryNote}</p>
              <Button type="submit" className="form-action" disabled={checking || pending}>
                {submitLabel}
                <Icon name="arrow-up-right" size={20} />
              </Button>
            </fieldset>
            {notice && <p className="form-result" role="status">{notice}</p>}
            {draft && (
              <div className="form-result" role="status">
                <p>{t.results.draftReady}</p>
                <a className="contact-draft-link" href={draft}>{t.results.openDraft}<Icon name="external-link" size={16} /></a>
              </div>
            )}
            <p className="form-note"><Rich text={t.privacyNote} email={config.contactEmail} /></p>
            <noscript>
              <p className="contact-noscript"><Rich text={t.noscript} email={config.contactEmail} /></p>
            </noscript>
          </form>
        </div>
      </div>
    </div>
  );
}
