'use client';

import { useEffect, useRef, type CSSProperties } from 'react';

/**
 * Entry experience for the homepage: a full-screen loader followed by a short
 * simulation of engineers editing the interface together. It is purely visual:
 * the overlay draws cursors and outlines above the page and never changes the
 * page's own content or layout.
 *
 * Phases live in `data-phase` on the root and are driven imperatively, so the
 * component never re-renders: (none) → loading → collab → closing → done.
 */

const ROOT_ID = 'intro';
const SEEN_KEY = 'stane:intro-seen';
const LOADER_MIN_MS = 4000;
const LOADER_EXIT_MS = 800;
const STEP_MS = 2500;
const CLOSING_MS = 600;
const FAILSAFE_MS = 15000;
/** Room kept to the right of a cursor so its name label stays on screen. */
const CURSOR_ROOM_PX = 88;
const SKIP_EVENTS = ['pointerdown', 'keydown', 'wheel', 'touchstart'] as const;
const SCROLL_EVENTS = ['wheel', 'touchmove'] as const;

type Action = 'select' | 'nudge' | 'text';
/** The first candidate selector that is visible in the viewport is used. */
type Step = { targets: string[]; action: Action };
type Engineer = { name: string; delay: number; start: [number, number]; steps: Step[] };

// `start` is the cursor's entry point as a fraction of the viewport.
const engineers: Engineer[] = [
  { name: 'Alex', delay: 0, start: [.12, .82], steps: [
    { targets: ['.hero-title'], action: 'text' },
    { targets: ['.hero-description'], action: 'select' },
  ] },
  { name: 'Sarah', delay: 250, start: [.9, .34], steps: [
    { targets: ['.header-contact'], action: 'nudge' },
    { targets: ['.site-header .brand'], action: 'select' },
  ] },
  { name: 'Daniel', delay: 500, start: [.62, .94], steps: [
    { targets: ['.hero-art'], action: 'select' },
    { targets: ['.service-card:nth-child(2)', '.eyebrow'], action: 'nudge' },
  ] },
  { name: 'Olivia', delay: 700, start: [.04, .42], steps: [
    { targets: ['.service-card:nth-child(1)', '.hero-actions .text-link'], action: 'select' },
    { targets: ['.eyebrow', '.hero-actions .text-link'], action: 'text' },
  ] },
  { name: 'Marcus', delay: 900, start: [.74, .06], steps: [
    { targets: ['.desktop-nav', '.menu-button'], action: 'select' },
    { targets: ['.service-card:nth-child(3)', '.hero-actions .text-link'], action: 'nudge' },
  ] },
];
const COLLAB_MS = Math.max(...engineers.map(engineer => engineer.delay + engineer.steps.length * STEP_MS)) + 200;

// Runs while the HTML is parsed, before the first paint: shows the loader only
// when scripting works and the visitor has not seen it in this session. The
// timeout releases the page if the application script never takes over.
const bootScript = `(function(){var e=document.getElementById('${ROOT_ID}');try{if(!e||sessionStorage.getItem('${SEEN_KEY}'))return;e.dataset.phase='loading';setTimeout(function(){if(e.dataset.phase==='loading')e.dataset.phase='done'},${FAILSAFE_MS})}catch(_){}})();`;

function seenThisSession() {
  try { return sessionStorage.getItem(SEEN_KEY) !== null; } catch { return true; }
}
function rememberSeen() {
  try { sessionStorage.setItem(SEEN_KEY, '1'); } catch { /* Storage unavailable: the intro simply plays again. */ }
}

function visibleRect(selectors: string[]): DOMRect | null {
  for (const selector of selectors) {
    const rect = document.querySelector(selector)?.getBoundingClientRect();
    if (!rect || rect.width < 8 || rect.height < 8) continue;
    const visibleHeight = Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0);
    if (visibleHeight >= Math.min(rect.height * .6, 120) && rect.left < window.innerWidth && rect.right > 0) return rect;
  }
  return null;
}

/** Plays every engineer's steps over the page. Returns a function that cancels pending work. */
function playCollaboration(stage: HTMLElement) {
  const timers: number[] = [];
  const at = (delay: number, task: () => void) => { timers.push(window.setTimeout(task, delay)); };
  // Small screens get four cursors so they do not crowd the content.
  const count = window.innerWidth < 600 ? 4 : engineers.length;

  engineers.slice(0, count).forEach((engineer, index) => {
    const peer = stage.children[index];
    const cursorX = peer.querySelector<HTMLElement>('.intro-cursor-x');
    const cursorY = peer.querySelector<HTMLElement>('.intro-cursor-y');
    const outline = peer.querySelector<HTMLElement>('.intro-outline');
    const size = peer.querySelector<HTMLElement>('.intro-size');
    if (!cursorX || !cursorY || !outline || !size) return;

    // X and Y travel on separate elements with different easings, which bends
    // the path into a natural arc instead of a straight line.
    const moveCursor = (x: number, y: number) => {
      cursorX.style.transform = `translate3d(${Math.round(Math.max(4, Math.min(window.innerWidth - CURSOR_ROOM_PX, x)))}px, 0, 0)`;
      cursorY.style.transform = `translate3d(0, ${Math.round(Math.max(4, Math.min(window.innerHeight - 28, y)))}px, 0)`;
    };
    const shiftOutline = (rect: DOMRect, dx: number, dy: number) => {
      outline.style.transform = `translate3d(${Math.round(rect.left + dx)}px, ${Math.round(rect.top + dy)}px, 0)`;
    };

    cursorX.style.transitionDuration = cursorY.style.transitionDuration = '0s';
    moveCursor(engineer.start[0] * window.innerWidth, engineer.start[1] * window.innerHeight);
    at(engineer.delay, () => {
      cursorX.style.transitionDuration = cursorY.style.transitionDuration = '';
      peer.setAttribute('data-active', '');
    });

    engineer.steps.forEach((step, stepIndex) => {
      const begin = engineer.delay + 80 + stepIndex * STEP_MS;
      at(begin, () => {
        const rect = visibleRect(step.targets);
        if (!rect) return;
        const right = Math.min(rect.right, window.innerWidth - 8), bottom = Math.min(rect.bottom, window.innerHeight - 8);
        const textRow = rect.top + Math.min(rect.height * .5, 28);
        // Approach the element: its start for a text selection, a corner otherwise.
        if (step.action === 'text') moveCursor(rect.left - 2, textRow);
        else moveCursor(right - 4, bottom - 4);

        at(850, () => {
          outline.style.transitionDuration = '0s';
          outline.style.width = `${Math.round(rect.width)}px`;
          outline.style.height = `${Math.round(rect.height)}px`;
          shiftOutline(rect, 0, 0);
          size.textContent = `${Math.round(rect.width)} × ${Math.round(rect.height)}`;
          outline.setAttribute('data-action', step.action);
          void outline.offsetWidth; // Commit the new box before it fades in.
          outline.style.transitionDuration = '';
          outline.setAttribute('data-visible', '');
        });
        if (step.action === 'text') at(1000, () => { outline.setAttribute('data-selected', ''); moveCursor(right - 6, textRow + 6); });
        if (step.action === 'nudge') {
          at(1150, () => { shiftOutline(rect, 6, -4); moveCursor(right + 2, bottom - 8); });
          at(1650, () => { shiftOutline(rect, 0, 0); moveCursor(right - 4, bottom - 4); });
        }
        at(2150, () => { outline.removeAttribute('data-visible'); outline.removeAttribute('data-selected'); });
      });
    });
  });

  return () => timers.forEach(timer => window.clearTimeout(timer));
}

function Cursor({ name }: { name: string }) {
  return (
    <div className="intro-cursor-x">
      <div className="intro-cursor-y">
        <div className="intro-cursor">
          <svg width="18" height="20" viewBox="0 0 18 20" fill="none">
            <path d="M2 1.5 15.5 9.6 9.1 11.3 6 17.6 2 1.5Z" fill="currentColor" stroke="white" strokeWidth="1.2" strokeLinejoin="round" />
          </svg>
          <span className="intro-cursor-name">{name}</span>
        </div>
      </div>
    </div>
  );
}

export function IntroExperience() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const stage = root?.querySelector<HTMLElement>('.intro-stage');
    if (!root || !stage) return;
    // Without prerendered HTML (the Vite preview) the boot script has not run.
    if (!root.dataset.phase && !seenThisSession()) root.dataset.phase = 'loading';
    if (root.dataset.phase !== 'loading') return;

    const timers: number[] = [];
    const later = (delay: number, task: () => void) => { timers.push(window.setTimeout(task, delay)); };
    let stopCollaboration = () => {};
    let finished = false;

    const blockScroll = (event: Event) => event.preventDefault();
    const releaseInput = () => {
      window.removeEventListener('load', reveal);
      for (const type of SCROLL_EVENTS) window.removeEventListener(type, blockScroll);
      for (const type of SKIP_EVENTS) window.removeEventListener(type, close);
    };
    const stopWork = () => {
      timers.forEach(timer => window.clearTimeout(timer));
      stopCollaboration();
      releaseInput();
    };
    const finish = () => {
      if (finished) return;
      finished = true;
      stopWork();
      root.dataset.phase = 'done';
      rememberSeen();
    };
    // Cursors and outlines fade out together; any visitor input also ends the simulation.
    function close() {
      if (root?.dataset.phase !== 'collab') return;
      root.dataset.phase = 'closing';
      releaseInput();
      later(CLOSING_MS, finish);
    }
    const collaborate = () => {
      if (root.dataset.phase !== 'loading') { finish(); return; }
      root.dataset.phase = 'collab';
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { later(LOADER_EXIT_MS, finish); return; }
      for (const type of SKIP_EVENTS) window.addEventListener(type, close, { passive: true });
      later(LOADER_EXIT_MS - 250, () => { stopCollaboration = playCollaboration(stage); });
      later(LOADER_EXIT_MS - 250 + COLLAB_MS, close);
    };
    // The minimum counts from navigation start, so a slow page load adds no extra wait.
    function reveal() {
      later(Math.max(0, LOADER_MIN_MS - performance.now()), collaborate);
    }

    // Scrolling stays blocked until the simulation closes. Listeners are needed
    // because iOS Safari can pan a page whose root has overflow hidden.
    for (const type of SCROLL_EVENTS) window.addEventListener(type, blockScroll, { passive: false });
    if (document.readyState === 'complete') reveal();
    else window.addEventListener('load', reveal, { once: true });

    return () => {
      stopWork();
      // Unmounting mid-simulation must not leave the page locked.
      if (root.dataset.phase !== 'loading') finish();
    };
  }, []);

  return (
    <>
      <div ref={rootRef} id={ROOT_ID} className="intro" aria-hidden="true" suppressHydrationWarning>
        <div className="intro-loader">
          <div className="intro-loader-body">
            <div className="intro-brand">
              <img src="/brand/stane-mark.svg" width="36" height="36" alt="" />
              <span>Stane<span className="intro-brand-period">.</span></span>
            </div>
            <div className="intro-progress"><span /></div>
            <p className="intro-status">
              <span>Initializing secure environment…</span>
              <span>Preparing workspace…</span>
              <span>Loading infrastructure…</span>
            </p>
          </div>
        </div>
        <div className="intro-stage">
          {engineers.map((engineer, index) => (
            <div key={engineer.name} className="intro-peer" style={{ '--peer': `var(--intro-peer-${index + 1})` } as CSSProperties}>
              <div className="intro-outline">
                <span className="intro-highlight" />
                <span className="intro-handle" /><span className="intro-handle" /><span className="intro-handle" /><span className="intro-handle" />
                <span className="intro-size" />
              </div>
              <Cursor name={engineer.name} />
            </div>
          ))}
        </div>
      </div>
      <script dangerouslySetInnerHTML={{ __html: bootScript }} />
    </>
  );
}
