'use client';

import { useEffect, useRef, type CSSProperties } from 'react';

/**
 * Entry experience for the homepage: the page is "built" in front of the visitor,
 * as if a team were designing it live in a multiplayer editor. Every block marked
 * with `data-build` starts hidden; when it scrolls into view a collaborator's
 * cursor drags out a frame around it, types or drops its content in and then
 * adjusts it, with alignment guides and layer tags along the way.
 *
 * Everything is drawn on an overlay layer; the page's content and layout are never
 * changed. State lives in data attributes and is driven imperatively, so the
 * component never re-renders. `data-mode="build"` on the flag element hides the
 * blocks until a cursor builds them; without it (reduced motion, no JavaScript)
 * the page is simply visible.
 */

const FLAG_ID = 'build-flag';
const FAILSAFE_MS = 8000;

const MIN_TRAVEL_MS = 700;
const MAX_TRAVEL_MS = 1300;
const SWEEP_MS = 1500;
const REVEAL_MS = 950;
const ADJUST_MS = 1000;
const HOLD_MS = 250;
const STAGGER_MS = 380;
const WANDER_MS = 1700;
const WANDER_STEPS = 2;
/** A block still waiting for a free cursor after this long is shown without ceremony. */
const QUEUE_LIMIT_MS = 18000;
/** With a long queue the cursors speed up, but never below this share of their normal pace. */
const MIN_PACE = .6;
/** Room kept to the right of a cursor so it stays on screen. */
const CURSOR_ROOM_PX = 36;

const PEERS = 6;
const TEXT_KINDS = new Set(['heading', 'text']);
/** Text is typed in and left alone; frames, images and buttons get nudged into place. */
const ADJUSTABLE_KINDS = new Set(['frame', 'image', 'button']);
const KIND_LABELS: Record<string, string> = { heading: 'Heading', text: 'Text', button: 'Button', image: 'Image', frame: 'Frame' };

// Runs while the HTML is parsed, before the first paint, so the blocks never flash.
// The timeout releases the page if the application script never takes over.
const bootScript = `(function(){var e=document.getElementById('${FLAG_ID}');if(!e)return;e.dataset.boot='1';if(!matchMedia('(prefers-reduced-motion: reduce)').matches)e.dataset.mode='build';setTimeout(function(){if(!e.dataset.ready)delete e.dataset.mode},${FAILSAFE_MS})})();`;

/** Same decision as the boot script, for renders without prerendered HTML (the Vite preview). */
function prepare(flag: HTMLElement) {
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) flag.dataset.mode = 'build';
}

const between = (min: number, max: number) => min + Math.random() * (max - min);

/** Builds each target the first time it scrolls into view. Returns a function that stops it. */
function startBuilder(stage: HTMLElement) {
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
    return [{ peer, cursorX, cursorY, outline, size, tag, guideH, guideV, caret, busy: false, visible: false, x: 0, y: 0, idle: 0 }];
  });
  type Worker = typeof workers[number];
  const pending: { target: Element; since: number }[] = [];
  let nextWorker = 0, lastStart = 0;

  const px = (value: number) => `${Math.round(value)}px`;
  // X and Y travel on separate elements with different easings, which bends
  // the path into a natural arc instead of a straight line.
  const moveCursor = (worker: Worker, x: number, y: number, duration: number) => {
    worker.cursorX.style.transitionDuration = worker.cursorY.style.transitionDuration = `${duration}ms`;
    worker.cursorX.style.transform = `translate3d(${px(Math.max(4, Math.min(stage.clientWidth - CURSOR_ROOM_PX, x)))}, 0, 0)`;
    worker.cursorY.style.transform = `translate3d(0, ${px(Math.max(4, y))}, 0)`;
    worker.x = x;
    worker.y = y;
  };
  // Alignment guides that snap from a block's top-left to its bottom-right while it is drawn.
  const placeGuides = (worker: Worker, x: number, y: number) => {
    worker.guideH.style.transform = `translate3d(0, ${px(y)}, 0)`;
    worker.guideV.style.transform = `translate3d(${px(x)}, 0, 0)`;
  };
  const showTarget = (target: Element, text: boolean, duration: number) => {
    target.setAttribute('data-built', '');
    if (!target.animate || duration <= 0) return;
    const frames = text
      ? [{ clipPath: 'inset(-6px 100% -6px -6px)', opacity: 1 }, { clipPath: 'inset(-6px -6px -6px -6px)', opacity: 1 }]
      : [{ opacity: 0, transform: 'translateY(16px) scale(.985)' }, { opacity: 1, transform: 'translateY(0) scale(1)' }];
    target.animate(frames, { duration, easing: text ? 'cubic-bezier(.45, 0, .25, 1)' : 'cubic-bezier(.22, 1, .36, 1)', fill: 'backwards' });
  };

  // An idle collaborator keeps looking around the page before leaving.
  const wander = (worker: Worker, step: number) => {
    if (worker.busy) return;
    if (step >= WANDER_STEPS) { worker.peer.removeAttribute('data-active'); worker.visible = false; return; }
    // Stage coordinates: the stage spans the page, so its top edge is the page top.
    const viewportTop = -stage.getBoundingClientRect().top;
    moveCursor(worker, between(.08, .9) * stage.clientWidth, viewportTop + between(.15, .85) * window.innerHeight, WANDER_MS);
    worker.idle = later(WANDER_MS + 300, () => wander(worker, step + 1));
  };

  const run = (worker: Worker, target: Element) => {
    // The stage scrolls with the page, so positions are relative to it.
    const frame = stage.getBoundingClientRect(), rect = target.getBoundingClientRect();
    const left = rect.left - frame.left, top = rect.top - frame.top;
    const right = left + rect.width, bottom = top + rect.height;
    const kind = target.getAttribute('data-build') || 'frame';
    const text = TEXT_KINDS.has(kind);
    const pace = Math.max(MIN_PACE, 1 - Math.max(0, pending.length - workers.length) * .04);
    const scaled = (ms: number) => Math.round(ms * pace);
    const drawMs = scaled(Math.max(750, Math.min(1400, 500 + Math.hypot(rect.width, rect.height) * .9)));
    const sweepMs = scaled(SWEEP_MS), revealMs = scaled(REVEAL_MS);
    const { outline, caret } = worker;
    window.clearTimeout(worker.idle);
    if (!worker.visible || Math.abs(worker.y - top) > window.innerHeight) {
      // Enter from just outside the block instead of crossing the whole page.
      moveCursor(worker, right + 90, top + Math.min(rect.height, 200) + 100, 0);
      void worker.cursorX.offsetWidth;
      worker.peer.setAttribute('data-active', '');
      worker.visible = true;
    }
    // Longer trips take longer, so neighbouring blocks follow each other quickly.
    const travelMs = scaled(Math.max(MIN_TRAVEL_MS, Math.min(MAX_TRAVEL_MS, 600 + Math.hypot(worker.x - left, worker.y - top) * .45)));
    const adjustMs = ADJUSTABLE_KINDS.has(kind) ? scaled(ADJUST_MS) : 0;
    const settleMs = Math.round(adjustMs * .45);
    moveCursor(worker, left, top, travelMs);

    const sizedAt = travelMs + drawMs, shownAt = sizedAt + (text ? sweepMs : revealMs), adjustedAt = shownAt + adjustMs;
    later(travelMs, () => {
      outline.style.setProperty('--build-draw', `${drawMs}ms`);
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
      moveCursor(worker, right, bottom, drawMs);
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
        caret.style.transitionDuration = `${sweepMs}ms`;
        caret.setAttribute('data-on', '');
        caret.style.transform = `translate3d(${px(right)}, ${px(top)}, 0)`;
        moveCursor(worker, right + 24, top + Math.min(rect.height, 44) + 14, sweepMs);
      }
      showTarget(target, text, text ? sweepMs : revealMs);
    });
    later(shownAt, () => {
      inProgress.delete(target);
      caret.removeAttribute('data-on');
      worker.guideH.removeAttribute('data-on'); worker.guideV.removeAttribute('data-on');
      if (!adjustMs) return;
      // Select the finished block and nudge it into place, then drop it back.
      const dx = Math.round(between(10, 22)) * (Math.random() < .5 ? -1 : 1), dy = Math.round(between(6, 14)) * (Math.random() < .5 ? -1 : 1);
      moveCursor(worker, right - 6, bottom - 6, settleMs);
      later(settleMs, () => {
        outline.style.transform = `translate3d(${px(left + dx)}, ${px(top + dy)}, 0)`;
        moveCursor(worker, right - 6 + dx, bottom - 6 + dy, settleMs);
      });
      later(adjustMs - settleMs, () => {
        outline.style.transform = `translate3d(${px(left)}, ${px(top)}, 0)`;
        moveCursor(worker, right - 6, bottom - 6, settleMs);
      });
    });
    later(adjustedAt, () => {
      outline.removeAttribute('data-visible');
      later(HOLD_MS, () => {
        worker.busy = false;
        worker.idle = later(0, () => { wander(worker, 0); });
        pump();
      });
    });
  };

  const offscreen = (target: Element) => {
    const rect = target.getBoundingClientRect();
    return rect.bottom < 0 || rect.top > window.innerHeight;
  };
  // Hands waiting blocks to free cursors, in the order they appeared.
  function pump() {
    while (pending.length) {
      let worker: Worker | undefined;
      for (let offset = 0; offset < workers.length && !worker; offset++) {
        const candidate = workers[(nextWorker + offset) % workers.length];
        if (!candidate.busy) { worker = candidate; nextWorker = (nextWorker + offset + 1) % workers.length; }
      }
      if (!worker) return;
      const { target, since } = pending.shift()!;
      // A block the visitor already scrolled past, or that waited too long, is just shown.
      if (offscreen(target) || performance.now() - since > QUEUE_LIMIT_MS) { showTarget(target, false, 0); continue; }
      const assigned = worker;
      assigned.busy = true;
      inProgress.add(target);
      const delay = Math.max(0, lastStart + STAGGER_MS - performance.now());
      lastStart = performance.now() + delay;
      later(delay, () => run(assigned, target));
    }
  }

  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      observer.unobserve(entry.target);
      pending.push({ target: entry.target, since: performance.now() });
    }
    pump();
  }, { threshold: .1, rootMargin: '0px 0px -4% 0px' });
  document.querySelectorAll('[data-build]').forEach(target => observer.observe(target));

  return () => {
    observer.disconnect();
    timers.forEach(timer => window.clearTimeout(timer));
    pending.forEach(({ target }) => target.setAttribute('data-built', ''));
    inProgress.forEach(target => target.setAttribute('data-built', ''));
    stage.querySelectorAll('[data-active], [data-visible], [data-on]').forEach(node => {
      node.removeAttribute('data-active'); node.removeAttribute('data-visible'); node.removeAttribute('data-on');
    });
  };
}

export function IntroExperience() {
  const flagRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const flag = flagRef.current, stage = stageRef.current;
    if (!flag || !stage) return;
    if (!flag.dataset.boot) { flag.dataset.boot = '1'; prepare(flag); }
    flag.dataset.ready = '1';
    if (!flag.dataset.mode) return;
    const stop = startBuilder(stage);
    return () => {
      stop();
      // Leaving the page must never leave blocks hidden.
      delete flag.dataset.mode;
    };
  }, []);

  return (
    <>
      <div ref={flagRef} id={FLAG_ID} className="build-flag" hidden suppressHydrationWarning />
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
      </div>
    </>
  );
}
