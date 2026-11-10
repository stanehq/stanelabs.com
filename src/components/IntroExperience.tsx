'use client';

import { useEffect, useRef, type CSSProperties } from 'react';

/**
 * Entry experience for the homepage.
 *
 * 1. Loader: a full-screen cover shown on every visit for at least four seconds.
 * 2. Scroll build: as each `[data-build]` block scrolls into view, a collaborator's
 *    cursor drags out a frame around it and the block fades in, as if the page
 *    were being assembled in a design tool.
 *
 * Everything is drawn on overlay layers; the page's content and layout are never
 * changed. State lives in data attributes and is driven imperatively, so the
 * component never re-renders.
 *
 * Root attributes: `data-phase` (loading → leaving → done) controls the loader;
 * `data-mode="build"` hides the blocks until a cursor builds them.
 */

const ROOT_ID = 'intro';
const LOADER_MIN_MS = 4000;
const LOADER_EXIT_MS = 700;
const FAILSAFE_MS = 10000;
const SCROLL_EVENTS = ['wheel', 'touchmove'] as const;

const TRAVEL_MS = 750;
const DRAW_MS = 950;
const SWEEP_MS = 1200;
const REVEAL_MS = 800;
const HOLD_MS = 1100;
const STAGGER_MS = 280;
const IDLE_MS = 2400;
/** Room kept to the right of a cursor so it stays on screen. */
const CURSOR_ROOM_PX = 36;

const PEERS = 5;
const TEXT_KINDS = new Set(['heading', 'text']);
const KIND_LABELS: Record<string, string> = { heading: 'Heading', text: 'Text', button: 'Button', image: 'Image', frame: 'Frame' };

// Runs while the HTML is parsed, before the first paint, so neither the loader
// nor the hidden blocks flash. The timeout releases the page if the application
// script never takes over. Keep in sync with `prepare` below.
const bootScript = `(function(){var e=document.getElementById('${ROOT_ID}');if(!e)return;e.dataset.boot='1';e.dataset.phase='loading';if(!matchMedia('(prefers-reduced-motion: reduce)').matches)e.dataset.mode='build';setTimeout(function(){if(e.dataset.ready)return;delete e.dataset.mode;e.dataset.phase='done'},${FAILSAFE_MS})})();`;

/** Same decision as the boot script, for renders without prerendered HTML (the Vite preview). */
function prepare(root: HTMLElement) {
  root.dataset.phase = 'loading';
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) root.dataset.mode = 'build';
}

/** Builds each target the first time it scrolls into view. Returns a function that stops it. */
function startBuilder(stage: HTMLElement) {
  stage.style.setProperty('--build-draw', `${DRAW_MS}ms`);
  stage.style.setProperty('--build-sweep', `${SWEEP_MS}ms`);
  const dock = stage.querySelector<HTMLElement>('.build-dock');
  const timers = new Set<number>();
  const later = (delay: number, task: () => void) => {
    const id = window.setTimeout(() => { timers.delete(id); task(); }, delay);
    timers.add(id);
    return id;
  };
  const inProgress = new Set<Element>();
  const workers = Array.from(stage.querySelectorAll('.build-peer')).flatMap(peer => {
    const part = (name: string) => peer.querySelector<HTMLElement>(`.build-${name}`);
    const [cursorX, cursorY, outline, size, tag, guideH, guideV, caret] =
      ['cursor-x', 'cursor-y', 'outline', 'size', 'tag', 'guide-h', 'guide-v', 'caret'].map(part);
    if (!cursorX || !cursorY || !outline || !size || !tag || !guideH || !guideV || !caret) return [];
    return [{ peer, cursorX, cursorY, outline, size, tag, guideH, guideV, caret, busy: false, visible: false, y: 0, idle: 0 }];
  });
  type Worker = typeof workers[number];
  let nextWorker = 0, lastStart = 0;

  const setTool = (tool: string) => { if (dock) dock.dataset.tool = tool; };
  const px = (value: number) => `${Math.round(value)}px`;
  // X and Y travel on separate elements with different easings, which bends
  // the path into a natural arc instead of a straight line.
  const moveCursor = (worker: Worker, x: number, y: number, duration: number) => {
    worker.cursorX.style.transitionDuration = worker.cursorY.style.transitionDuration = `${duration}ms`;
    worker.cursorX.style.transform = `translate3d(${px(Math.max(4, Math.min(stage.clientWidth - CURSOR_ROOM_PX, x)))}, 0, 0)`;
    worker.cursorY.style.transform = `translate3d(0, ${px(Math.max(4, y))}, 0)`;
    worker.y = y;
  };
  // Alignment guides that snap from a block's top-left to its bottom-right while it is drawn.
  const placeGuides = (worker: Worker, x: number, y: number) => {
    worker.guideH.style.transform = `translate3d(0, ${px(y)}, 0)`;
    worker.guideV.style.transform = `translate3d(${px(x)}, 0, 0)`;
  };
  const showTarget = (target: Element, text: boolean, duration: number) => {
    target.setAttribute('data-built', '');
    if (!target.animate) return;
    const frames = text
      ? [{ clipPath: 'inset(-6px 100% -6px -6px)', opacity: 1 }, { clipPath: 'inset(-6px -6px -6px -6px)', opacity: 1 }]
      : [{ opacity: 0, transform: 'translateY(14px)' }, { opacity: 1, transform: 'translateY(0)' }];
    target.animate(frames, { duration, easing: text ? 'cubic-bezier(.45, 0, .25, 1)' : 'cubic-bezier(.22, 1, .36, 1)', fill: 'backwards' });
  };

  const run = (worker: Worker, target: Element) => {
    // The stage scrolls with the page, so positions are relative to it.
    const frame = stage.getBoundingClientRect(), rect = target.getBoundingClientRect();
    const left = rect.left - frame.left, top = rect.top - frame.top;
    const right = left + rect.width, bottom = top + rect.height;
    const kind = target.getAttribute('data-build') || 'frame';
    const text = TEXT_KINDS.has(kind);
    const { outline, caret } = worker;
    window.clearTimeout(worker.idle);
    if (!worker.visible || Math.abs(worker.y - top) > window.innerHeight) {
      // Enter from just outside the block instead of crossing the whole page.
      moveCursor(worker, right + 70, top + Math.min(rect.height, 180) + 80, 0);
      void worker.cursorX.offsetWidth;
      worker.peer.setAttribute('data-active', '');
      worker.visible = true;
    }
    setTool('move');
    moveCursor(worker, left, top, TRAVEL_MS);

    const drawAt = TRAVEL_MS, sizedAt = drawAt + DRAW_MS, doneAt = sizedAt + (text ? SWEEP_MS : REVEAL_MS);
    later(drawAt, () => {
      setTool(text ? 'text' : 'frame');
      worker.guideH.style.transitionDuration = worker.guideV.style.transitionDuration = '0s';
      placeGuides(worker, left, top);
      void worker.guideH.offsetWidth;
      worker.guideH.style.transitionDuration = worker.guideV.style.transitionDuration = '';
      worker.guideH.setAttribute('data-on', ''); worker.guideV.setAttribute('data-on', '');
      outline.style.transitionDuration = '0s';
      outline.style.transform = `translate3d(${px(left)}, ${px(top)}, 0)`;
      outline.style.width = outline.style.height = '12px';
      outline.removeAttribute('data-sized');
      worker.tag.textContent = KIND_LABELS[kind] || KIND_LABELS.frame;
      void outline.offsetWidth; // Commit the starting box before it grows.
      outline.style.transitionDuration = '';
      outline.setAttribute('data-visible', '');
      outline.style.width = px(rect.width);
      outline.style.height = px(rect.height);
      moveCursor(worker, right, bottom, DRAW_MS);
      placeGuides(worker, right, bottom);
    });
    later(sizedAt, () => {
      worker.size.textContent = `${Math.round(rect.width)} × ${Math.round(rect.height)}`;
      outline.setAttribute('data-sized', '');
      if (text) {
        // A text cursor types the block in from left to right.
        caret.style.transitionDuration = '0s';
        caret.style.height = px(Math.min(rect.height, 44));
        caret.style.transform = `translate3d(${px(left)}, ${px(top)}, 0)`;
        void caret.offsetWidth;
        caret.style.transitionDuration = '';
        caret.setAttribute('data-on', '');
        caret.style.transform = `translate3d(${px(right)}, ${px(top)}, 0)`;
        moveCursor(worker, right + 20, top + Math.min(rect.height, 44) + 10, SWEEP_MS);
      }
      showTarget(target, text, text ? SWEEP_MS : REVEAL_MS);
    });
    later(doneAt, () => {
      inProgress.delete(target);
      caret.removeAttribute('data-on');
      worker.guideH.removeAttribute('data-on'); worker.guideV.removeAttribute('data-on');
    });
    later(doneAt + HOLD_MS, () => {
      outline.removeAttribute('data-visible');
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
    if (!worker) { showTarget(target, false, REVEAL_MS); return; }
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
  document.querySelectorAll('[data-build]').forEach(target => observer.observe(target));

  return () => {
    observer.disconnect();
    timers.forEach(timer => window.clearTimeout(timer));
    inProgress.forEach(target => target.setAttribute('data-built', ''));
    stage.querySelectorAll('[data-active], [data-visible], [data-on]').forEach(node => {
      node.removeAttribute('data-active'); node.removeAttribute('data-visible'); node.removeAttribute('data-on');
    });
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
      if (root.dataset.mode) stopBuilder = startBuilder(stage);
    };
    const blockScroll = (event: Event) => event.preventDefault();
    const releaseScroll = () => {
      for (const type of SCROLL_EVENTS) window.removeEventListener(type, blockScroll);
    };
    const leave = () => {
      root.dataset.phase = 'leaving';
      releaseScroll();
      later(LOADER_EXIT_MS / 2, build);
      later(LOADER_EXIT_MS, () => { root.dataset.phase = 'done'; });
    };
    // The minimum counts from navigation start, so a slow page load adds no extra wait.
    const reveal = () => later(Math.max(0, LOADER_MIN_MS - performance.now()), leave);

    // iOS Safari can still pan a page whose root has overflow hidden.
    for (const type of SCROLL_EVENTS) window.addEventListener(type, blockScroll, { passive: false });
    if (document.readyState === 'complete') reveal();
    else window.addEventListener('load', reveal, { once: true });

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
        {Array.from({ length: PEERS }, (_, index) => (
          <div key={index} className="build-peer" style={{ '--peer': `var(--build-peer-${index + 1})` } as CSSProperties}>
            <span className="build-guide-h" /><span className="build-guide-v" />
            <div className="build-outline">
              <span className="build-tag" />
              <span className="build-handle" /><span className="build-handle" /><span className="build-handle" /><span className="build-handle" />
              <span className="build-size" />
            </div>
            <span className="build-caret" />
            <div className="build-cursor-x">
              <div className="build-cursor-y">
                <svg className="build-cursor" width="20" height="22" viewBox="0 0 18 20" fill="none">
                  <path d="M2 1.5 15.5 9.6 9.1 11.3 6 17.6 2 1.5Z" fill="currentColor" stroke="white" strokeWidth="1.2" strokeLinejoin="round" />
                </svg>
              </div>
            </div>
          </div>
        ))}
        <div className="build-dock" data-tool="move">
          <span className="build-tool" data-tool="move">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"><path d="M5 3 19 11 12.4 12.8 9.5 19.5 5 3Z" /></svg>
          </span>
          <span className="build-tool" data-tool="frame">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M7 3v18M17 3v18M3 7h18M3 17h18" /></svg>
          </span>
          <span className="build-tool" data-tool="text">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M5 6V4h14v2M12 4v16M9 20h6" /></svg>
          </span>
          <span className="build-dock-divider" />
          <span className="build-presence">
            {Array.from({ length: PEERS }, (_, index) => <span key={index} style={{ background: `var(--build-peer-${index + 1})` }} />)}
          </span>
          <span className="build-live">Live</span>
        </div>
      </div>
    </>
  );
}
