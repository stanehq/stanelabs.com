'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useI18n } from '../i18n/I18nProvider';
import { CONTACT_HASH, CONTACT_TOPIC_EVENT } from '../lib/events';
import { Brand } from './Brand';
import ContactSection from './ContactSection';
import { Icon } from './Icon';
import { LanguageSwitch } from './LanguageSwitch';
import { Button } from './ui/button';

/** Anchors of the homepage sections linked from the navigation. */
const SECTION_IDS = ['servicios', 'enfoque', 'contacto'] as const;
// Matches the contact fragment on the homepage of any language: #contacto, /#contacto, /es#contacto.
const contactLinkSelector = `a[href$="${CONTACT_HASH}"]`;

function isPlainLeftClick(event: MouseEvent) {
  return event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
}

export function Header({ home }: { home: boolean }) {
  const { t, href } = useI18n();
  const [menuOpen, setMenuOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const contactButtonRef = useRef<HTMLButtonElement>(null);
  // Section links point at the homepage; from other pages they need its path.
  const sectionHref = (id: string) => `${home ? '' : href('/')}#${id}`;

  const openContact = useCallback(() => {
    setContactOpen(true);
    setMenuOpen(false);
  }, []);
  const closeContact = useCallback(() => {
    setContactOpen(false);
    contactButtonRef.current?.focus({ preventScroll: true });
  }, []);

  // Any link to the contact fragment opens the panel instead of scrolling.
  useEffect(() => {
    const followContactLink = (event: MouseEvent) => {
      if (event.defaultPrevented || !isPlainLeftClick(event)) return;
      if (event.target instanceof Element && event.target.closest(contactLinkSelector)) {
        event.preventDefault();
        openContact();
      }
    };
    const followHash = () => {
      if (window.location.hash === CONTACT_HASH) openContact();
    };
    // Deferred so the panel opens after hydration, not during the first render.
    const initialHash = window.setTimeout(followHash, 0);
    document.addEventListener('click', followContactLink);
    window.addEventListener('hashchange', followHash);
    window.addEventListener(CONTACT_TOPIC_EVENT, openContact);
    return () => {
      window.clearTimeout(initialHash);
      document.removeEventListener('click', followContactLink);
      window.removeEventListener('hashchange', followHash);
      window.removeEventListener(CONTACT_TOPIC_EVENT, openContact);
    };
  }, [openContact]);

  // While open, the panel closes on Escape or on a press outside the header.
  useEffect(() => {
    if (!contactOpen) return;
    const closeOnOutsidePress = (event: PointerEvent) => {
      if (event.target instanceof Node && !headerRef.current?.contains(event.target)) setContactOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeContact();
    };
    document.addEventListener('pointerdown', closeOnOutsidePress);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePress);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [contactOpen, closeContact]);

  const toggleContact = () => {
    setContactOpen(open => !open);
    setMenuOpen(false);
  };
  const toggleMenu = () => {
    setMenuOpen(open => !open);
    setContactOpen(false);
  };
  const closeMenu = () => setMenuOpen(false);

  return (
    <header ref={headerRef} className="site-header">
      <div className="header-inner" data-build="frame">
        <Brand build="image" />
        <nav className="desktop-nav" aria-label={t.header.mainNav} data-build="text">
          {SECTION_IDS.map(id => (
            <a key={id} href={sectionHref(id)} className="nav-link">{t.header.sections[id]}</a>
          ))}
        </nav>
        <div className="header-end">
          <LanguageSwitch className="header-language" />
          <Button ref={contactButtonRef} type="button" size="sm" className="header-contact" data-build="button" aria-expanded={contactOpen} aria-controls="contacto" onClick={toggleContact}>
            {t.header.contactButton}
            <Icon name={contactOpen ? 'x' : 'plus'} size={16} />
          </Button>
          <Button type="button" size="icon" className="menu-button" data-build="button" aria-expanded={menuOpen} aria-controls="mobile-menu" aria-label={menuOpen ? t.header.closeMenu : t.header.openMenu} onClick={toggleMenu}>
            <Icon name={menuOpen ? 'x' : 'menu'} />
          </Button>
        </div>
      </div>
      {menuOpen && (
        <nav id="mobile-menu" className="mobile-menu" aria-label={t.header.mobileNav}>
          {SECTION_IDS.map(id => (
            <a key={id} className="mobile-nav-link" href={sectionHref(id)} onClick={closeMenu}>
              {t.header.sections[id]}
              <Icon name="arrow-up-right" />
            </a>
          ))}
          <a className="mobile-nav-link" href={href('/security')} onClick={closeMenu}>
            {t.header.security}
            <Icon name="arrow-up-right" />
          </a>
          <LanguageSwitch className="mobile-language" />
        </nav>
      )}
      <ContactSection expanded={contactOpen} onClose={closeContact} />
    </header>
  );
}
