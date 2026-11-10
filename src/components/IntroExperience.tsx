'use client';

import { useEffect, useRef, type CSSProperties } from 'react';

/**
 * Entry experience for the homepage.
 *
 * 1. Loader: a full-screen cover shown once per session for at least four seconds.
 * 2. Scroll build: as each `[data-build]` block scrolls into view, a collaborator's
 *    cursor drags out a frame around it and the block fades in, as if the page
 *    were being assembled in a design tool.
 *
 * Everything is drawn on overlay layers; the page's content and layout are never
 * changed. State lives in data attributes and is driven imperatively, so the
 * component never re-renders.
 *
 * Root attributes: `data-phase` (loading → leaving → done) controls the loader;
 * `data-mode` enables the build ("full" also builds the hero, "scroll" leaves it
 * visible on repeat visits so the first paint is not delayed).
 */

const ROOT_ID = 'intro';
const SEEN_KEY = 'stane:intro-seen';
const LOADER_MIN_MS = 4000;
const LOADER_EXIT_MS = 700;
const FAILSAFE_MS = 10000;
const SCROLL_EVENTS = ['wheel', 'touchmove'] as const;

const TRAVEL_MS = 380;
const DRAW_MS = 520;
const HOLD_MS = 600;
const STAGGER_MS = 140;
const IDLE_MS = 1400;
const REVEAL_MS = 450;
/** Room kept to the right of a cursor so its name label stays on screen. */
const CURSOR_ROOM_PX = 88;

const engineers = ['Alex', 'Sarah', 'Daniel', 'Olivia', 'Marcus'];

// Runs while the HTML is parsed, before the first paint, so neither the loader
// nor the hidden blocks flash. The timeout releases the page if the application
// script never takes over. Keep in sync with `prepare` below.
const bootScript = `(function(){var e=document.getElementById('${ROOT_ID}');if(!e)return;e.dataset.boot='1';try{var s=sessionStorage.getItem('${SEEN_KEY}');if(!s)e.dataset.phase='loading';if(!matchMedia('(prefers-reduced-motion: reduce)').matches)e.dataset.mode=s?'scroll':'full';setTimeout(function(){if(e.dataset.ready)return;delete e.dataset.mode;if(e.dataset.phase==='loading')e.dataset.phase='done'},${FAILSAFE_MS})}catch(_){}})();`;

/** Same decision as the boot script, for renders without prerendered HTML (the Vite preview). */
function prepare(root: HTMLElement) {
  try {
    const seen = sessionStorage.getItem(SEEN_KEY);
    if (!seen) root.dataset.phase = 'loading';
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) root.dataset.mode = seen ? 'scroll' : 'full';
  } catch { /* Storage unavailable: skip the experience. */ }
}
function rememberSeen() {
  try { sessionStorage.setItem(SEEN_KEY, '1'); } catch { /* The loader simply plays again. */ }
}

/** Builds each target the first time it scrolls into view. Returns a function that stops it. */
function startBuilder(stage: HTMLElement, includeHero: boolean) {
  const timers = new Set<number>();
  const later = (delay: number, task: () => void) => {
    const id = window.setTimeout(() => { timers.delete(id); task(); }, delay);
    timers.add(id);
    return id;
  };
  const inProgress = new Set<Element>();
  const workers = Array.from(stage.children).flatMap(peer => {
    const cursorX = peer.querySelector<HTMLElement>('.build-cursor-x');
    const cursorY = peer.querySelector<HTMLElement>('.build-cursor-y');
    const outline = peer.querySelector<HTMLElement>('.build-outline');
    const size = peer.querySelector<HTMLElement>('.build-size');
    return cursorX && cursorY && outline && size ? [{ peer, cursorX, cursorY, outline, size, busy: false, visible: false, y: 0, idle: 0 }] : [];
  });
  type Worker = typeof workers[number];
  let nextWorker = 0, lastStart = 0;

  const reveal = (target: Element) => {
    target.setAttribute('data-built', '');
    // A script animation also takes precedence over the hero's own CSS entrance.
    target.animate?.([{ opacity: 0 }, { opacity: 1 }], { duration: REVEAL_MS, easing: 'ease-out' });
  };
  // X and Y travel on separate elements with different easings, which bends
  // the path into a natural arc instead of a straight line.
  const moveCursor = (worker: Worker, x: number, y: number, duration: number) => {
    worker.cursorX.style.transitionDuration = worker.cursorY.style.transitionDuration = `${duration}ms`;
    worker.cursorX.style.transform = `translate3d(${Math.round(Math.max(4, Math.min(stage.clientWidth - CURSOR_ROOM_PX, x)))}px, 0, 0)`;
    worker.cursorY.style.transform = `translate3d(0, ${Math.round(Math.max(4, y))}px, 0)`;
    worker.y = y;
  };

  const run = (worker: Worker, target: Element) => {
    // The stage scrolls with the page, so positions are relative to it.
    const frame = stage.getBoundingClientRect(), rect = target.getBoundingClientRect();
    const left = rect.left - frame.left, top = rect.top - frame.top;
    window.clearTimeout(worker.idle);
    if (!worker.visible || Math.abs(worker.y - top) > window.innerHeight) {
      // Enter from just outside the block instead of crossing the whole page.
      moveCursor(worker, left + rect.width + 60, top + Math.min(rect.height, 180) + 70, 0);
      void worker.cursorX.offsetWidth;
      worker.peer.setAttribute('data-active', '');
      worker.visible = true;
    }
    moveCursor(worker, left, top, TRAVEL_MS);
    later(TRAVEL_MS, () => {
      const { outline } = worker;
      outline.style.transitionDuration = '0s';
      outline.style.transform = `translate3d(${Math.round(left)}px, ${Math.round(top)}px, 0)`;
      outline.style.width = outline.style.height = '12px';
      outline.removeAttribute('data-sized');
      void outline.offsetWidth; // Commit the starting box before it grows.
      outline.style.transitionDuration = '';
      outline.setAttribute('data-visible', '');
      outline.style.width = `${Math.round(rect.width)}px`;
      outline.style.height = `${Math.round(rect.height)}px`;
      moveCursor(worker, left + rect.width, top + rect.height, DRAW_MS);
    });
    later(TRAVEL_MS + DRAW_MS, () => {
      worker.size.textContent = `${Math.round(rect.width)} × ${Math.round(rect.height)}`;
      worker.outline.setAttribute('data-sized', '');
      inProgress.delete(target);
      reveal(target);
    });
    later(TRAVEL_MS + DRAW_MS + HOLD_MS, () => {
      worker.outline.removeAttribute('data-visible');
      worker.busy = false;
      worker.idle = later(IDLE_MS, () => { worker.peer.removeAttribute('data-active'); worker.visible = false; });
    });
  };

  const build = (target: Element) => {
    let worker: Worker | undefined;
    for (let offset = 0; offset < workers.length && !worker; offset++) {
      const candidate = workers[(nextWorker + offset) % workers.length];
      if (!candidate.busy) { worker = candidate; nextWorker = (nextWorker + offset + 1) % workers.length; }
    }
    // Everyone is busy (a fast scroll): show the block without waiting.
    if (!worker) { reveal(target); return; }
    const assigned = worker;
    assigned.busy = true;
    inProgress.add(target);
    const delay = Math.max(0, lastStart + STAGGER_MS - performance.now());
    lastStart = performance.now() + delay;
    later(delay, () => run(assigned, target));
  };

  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      observer.unobserve(entry.target);
      build(entry.target);
    }
  }, { threshold: .15, rootMargin: '0px 0px -6% 0px' });
  const selector = includeHero ? '[data-build]:not([data-built])' : '[data-build]:not([data-build="hero"]):not([data-built])';
  document.querySelectorAll(selector).forEach(target => observer.observe(target));

  return () => {
    observer.disconnect();
    timers.forEach(timer => window.clearTimeout(timer));
    inProgress.forEach(target => target.setAttribute('data-built', ''));
    for (const worker of workers) {
      worker.peer.removeAttribute('data-active');
      worker.outline.removeAttribute('data-visible');
    }
  };
}

export function IntroExperience() {
  const rootRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current, stage = stageRef.current;
    if (!root || !stage) return;
    if (!root.dataset.boot) { root.dataset.boot = '1'; prepare(root); }
    root.dataset.ready = '1';

    const timers: number[] = [];
    const later = (delay: number, task: () => void) => { timers.push(window.setTimeout(task, delay)); };
    let stopBuilder = () => {};
    const build = () => {
      if (root.dataset.mode) stopBuilder = startBuilder(stage, root.dataset.mode === 'full');
    };
    const blockScroll = (event: Event) => event.preventDefault();
    const releaseScroll = () => {
      for (const type of SCROLL_EVENTS) window.removeEventListener(type, blockScroll);
    };
    const leave = () => {
      root.dataset.phase = 'leaving';
      rememberSeen();
      releaseScroll();
      later(LOADER_EXIT_MS / 2, build);
      later(LOADER_EXIT_MS, () => { root.dataset.phase = 'done'; });
    };
    // The minimum counts from navigation start, so a slow page load adds no extra wait.
    const reveal = () => later(Math.max(0, LOADER_MIN_MS - performance.now()), leave);

    if (root.dataset.phase === 'loading') {
      // iOS Safari can still pan a page whose root has overflow hidden.
      for (const type of SCROLL_EVENTS) window.addEventListener(type, blockScroll, { passive: false });
      if (document.readyState === 'complete') reveal();
      else window.addEventListener('load', reveal, { once: true });
    } else {
      build();
    }

    return () => {
      timers.forEach(timer => window.clearTimeout(timer));
      window.removeEventListener('load', reveal);
      releaseScroll();
      stopBuilder();
      if (root.dataset.phase === 'leaving') root.dataset.phase = 'done';
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
      </div>
      <script dangerouslySetInnerHTML={{ __html: bootScript }} />
      <div ref={stageRef} className="build-stage" aria-hidden="true">
        {engineers.map((name, index) => (
          <div key={name} className="build-peer" style={{ '--peer': `var(--build-peer-${index + 1})` } as CSSProperties}>
            <div className="build-outline">
              <span className="build-handle" /><span className="build-handle" /><span className="build-handle" /><span className="build-handle" />
              <span className="build-size" />
            </div>
            <div className="build-cursor-x">
              <div className="build-cursor-y">
                <div className="build-cursor">
                  <svg width="18" height="20" viewBox="0 0 18 20" fill="none">
                    <path d="M2 1.5 15.5 9.6 9.1 11.3 6 17.6 2 1.5Z" fill="currentColor" stroke="white" strokeWidth="1.2" strokeLinejoin="round" />
                  </svg>
                  <span className="build-cursor-name">{name}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
