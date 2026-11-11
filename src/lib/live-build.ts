/**
 * Live build: assembles the homepage in front of the visitor, as if a team were
 * designing it in a multiplayer editor. Each `[data-build]` block starts hidden;
 * when it scrolls into view a collaborator's cursor drags out a frame around it,
 * types or drops its content in and nudges it into place. When the work is done
 * the cursors leave.
 *
 * The build follows the visitor's scroll: scrolling fast makes cursors fast, and
 * blocks scrolled past are simply shown. Everything is drawn on an overlay stage;
 * the page's own content and layout are never changed.
 */

type Rect = { left: number; top: number; right: number; bottom: number; width: number; height: number };

type Worker = {
  peer: HTMLElement;
  cursorX: HTMLElement;
  cursorY: HTMLElement;
  outline: HTMLElement;
  size: HTMLElement;
  tag: HTMLElement;
  guideH: HTMLElement;
  guideV: HTMLElement;
  caret: HTMLElement;
  busy: boolean;
  visible: boolean;
  x: number;
  y: number;
};

/** Base durations in milliseconds, at the normal (slow) pace. */
const TIMING = {
  travelMin: 700,
  travelMax: 1300,
  sweep: 1500,
  reveal: 950,
  adjust: 1000,
  hold: 250,
  stagger: 380,
};
/** Lowest pace, reached when the visitor scrolls very fast; 1 is the normal pace. */
const MIN_PACE = .35;
/** Scrolling up to this speed (px per ms) leaves the pace untouched, so steady reading stays smooth. */
const SCROLL_FREE_SPEED = .8;
/** How strongly scroll speed above the free speed quickens the build: pace = 1 / (1 + excess * this). */
const SCROLL_SENSITIVITY = .35;
/** A fling this fast (px per ms) leaves no time for cursors: waiting blocks are just shown. */
const FLING_SPEED = 6;
/** How much a long queue of waiting blocks speeds the cursors up, at most. */
const MIN_QUEUE_PACE = .7;
/** Pause after which a scroll event starts a new gesture. */
const IDLE_GAP_MS = 160;
const FRAME_MS = 16;
/** Half-life of the memory of a fast scroll. */
const SCROLL_MEMORY_MS = 800;
/** A block still waiting for a cursor after this long is shown directly. */
const QUEUE_LIMIT_MS = 18000;
/** Room kept to the right of a cursor so it stays on screen. */
const CURSOR_ROOM_PX = 36;

const TEXT_KINDS = new Set(['heading', 'text']);
/** Text is typed in and left alone; everything else is nudged into place. */
const ADJUSTABLE_KINDS = new Set(['frame', 'image', 'button']);
const KIND_LABELS: Record<string, string> = { heading: 'Heading', text: 'Text', button: 'Button', image: 'Image', frame: 'Frame' };

const between = (min: number, max: number) => min + Math.random() * (max - min);
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const px = (value: number) => `${Math.round(value)}px`;
const randomSign = () => (Math.random() < .5 ? -1 : 1);

/**
 * Scroll speed in px per ms. A burst of fast scrolling keeps counting for a few
 * seconds, fading out, so the build stays quick while the visitor catches up.
 */
function trackScrollSpeed() {
  let lastY = window.scrollY, lastTime = performance.now(), speed = 0;
  let peak = 0, peakTime = lastTime;
  const fade = (now: number) => .5 ** ((now - peakTime) / SCROLL_MEMORY_MS);
  const onScroll = () => {
    const now = performance.now();
    // After a pause, a new scroll gesture is measured over one frame, not over the pause.
    const elapsed = now - lastTime > IDLE_GAP_MS ? FRAME_MS : Math.max(1, now - lastTime);
    speed = speed * .6 + (Math.abs(window.scrollY - lastY) / elapsed) * .4;
    lastY = window.scrollY;
    lastTime = now;
    peak = Math.max(speed, peak * fade(now));
    peakTime = now;
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  return {
    read: () => peak * fade(performance.now()),
    stop: () => window.removeEventListener('scroll', onScroll),
  };
}

function collectWorkers(stage: HTMLElement): Worker[] {
  return Array.from(stage.querySelectorAll<HTMLElement>('.build-peer')).flatMap(peer => {
    const part = (name: string) => peer.querySelector<HTMLElement>(`.build-${name}`);
    const [cursorX, cursorY, outline, size, tag, guideH, guideV, caret] =
      ['cursor-x', 'cursor-y', 'outline', 'size', 'tag', 'guide-h', 'guide-v', 'caret'].map(part);
    if (!cursorX || !cursorY || !outline || !size || !tag || !guideH || !guideV || !caret) return [];
    return [{ peer, cursorX, cursorY, outline, size, tag, guideH, guideV, caret, busy: false, visible: false, x: 0, y: 0 }];
  });
}

/** Shows a block with a short animation: typed in from the left for text, dropped in otherwise. */
function showTarget(target: Element, text: boolean, duration: number) {
  target.setAttribute('data-built', '');
  if (!target.animate || duration <= 0) return;
  const frames = text
    ? [{ clipPath: 'inset(-6px 100% -6px -6px)', opacity: 1 }, { clipPath: 'inset(-6px -6px -6px -6px)', opacity: 1 }]
    : [{ opacity: 0, transform: 'translateY(16px) scale(.985)' }, { opacity: 1, transform: 'translateY(0) scale(1)' }];
  target.animate(frames, {
    duration,
    easing: text ? 'cubic-bezier(.45, 0, .25, 1)' : 'cubic-bezier(.22, 1, .36, 1)',
    fill: 'backwards',
  });
}

const isOffscreen = (target: Element) => {
  const { top, bottom } = target.getBoundingClientRect();
  return bottom < 0 || top > window.innerHeight;
};

/** Starts the build on a stage element. Returns a function that stops it and shows everything. */
export function startLiveBuild(stage: HTMLElement): () => void {
  const timers = new Set<number>();
  const later = (delay: number, task: () => void) => {
    const id = window.setTimeout(() => { timers.delete(id); task(); }, delay);
    timers.add(id);
  };
  const scrollSpeed = trackScrollSpeed();
  const workers = collectWorkers(stage);
  const pending: { target: Element; since: number }[] = [];
  const inProgress = new Set<Element>();
  let nextWorker = 0, lastStart = 0;

  /** 1 at rest; lower (faster cursors) while scrolling fast or while many blocks are waiting. */
  const currentPace = () => {
    const excess = Math.max(0, scrollSpeed.read() - SCROLL_FREE_SPEED);
    const scrollPace = Math.max(MIN_PACE, 1 / (1 + excess * SCROLL_SENSITIVITY));
    const queuePace = Math.max(MIN_QUEUE_PACE, 1 - Math.max(0, pending.length - workers.length) * .04);
    return Math.min(scrollPace, queuePace);
  };

  // X and Y travel on separate elements with different easings, which bends
  // the path into a natural arc instead of a straight line.
  const moveCursor = (worker: Worker, x: number, y: number, duration: number) => {
    worker.cursorX.style.transitionDuration = worker.cursorY.style.transitionDuration = `${duration}ms`;
    worker.cursorX.style.transform = `translate3d(${px(clamp(x, 4, stage.clientWidth - CURSOR_ROOM_PX))}, 0, 0)`;
    worker.cursorY.style.transform = `translate3d(0, ${px(Math.max(4, y))}, 0)`;
    worker.x = x;
    worker.y = y;
  };
  /** Applies a change without animating it. */
  const jump = (elements: HTMLElement[], change: () => void) => {
    elements.forEach(element => { element.style.transitionDuration = '0s'; });
    change();
    void elements[0].offsetWidth; // Commit the new state before transitions come back.
    elements.forEach(element => { element.style.transitionDuration = ''; });
  };
  // Alignment guides snap from a block's top-left to its bottom-right while it is drawn.
  const placeGuides = (worker: Worker, x: number, y: number) => {
    worker.guideH.style.transform = `translate3d(0, ${px(y)}, 0)`;
    worker.guideV.style.transform = `translate3d(${px(x)}, 0, 0)`;
  };
  const setGuides = (worker: Worker, on: boolean) => {
    for (const guide of [worker.guideH, worker.guideV]) guide.toggleAttribute('data-on', on);
  };

  const drawFrame = (worker: Worker, kind: string, box: Rect, duration: number) => {
    const { outline } = worker;
    jump([worker.guideH, worker.guideV], () => placeGuides(worker, box.left, box.top));
    setGuides(worker, true);
    jump([outline], () => {
      outline.style.transform = `translate3d(${px(box.left)}, ${px(box.top)}, 0)`;
      outline.style.width = outline.style.height = '12px';
      outline.removeAttribute('data-sized');
      worker.tag.textContent = KIND_LABELS[kind] ?? KIND_LABELS.frame;
    });
    outline.style.setProperty('--build-draw', `${duration}ms`);
    outline.setAttribute('data-visible', '');
    outline.style.width = px(box.width);
    outline.style.height = px(box.height);
    moveCursor(worker, box.right, box.bottom, duration);
    placeGuides(worker, box.right, box.bottom);
  };

  /** A text cursor sweeps across the block while its text is typed in. */
  const sweepCaret = (worker: Worker, box: Rect, duration: number) => {
    const { caret } = worker;
    const lineHeight = Math.min(box.height, 44);
    jump([caret], () => {
      caret.style.height = px(lineHeight);
      caret.style.transform = `translate3d(${px(box.left)}, ${px(box.top)}, 0)`;
    });
    caret.style.transitionDuration = `${duration}ms`;
    caret.setAttribute('data-on', '');
    caret.style.transform = `translate3d(${px(box.right)}, ${px(box.top)}, 0)`;
    moveCursor(worker, box.right + 24, box.top + lineHeight + 14, duration);
  };

  /** Selects the finished block, nudges it out of place and drops it back. */
  const adjustBlock = (worker: Worker, box: Rect, duration: number) => {
    const settle = Math.round(duration * .45);
    const dx = Math.round(between(10, 22)) * randomSign(), dy = Math.round(between(6, 14)) * randomSign();
    const corner = (shiftX: number, shiftY: number, travel: number) =>
      moveCursor(worker, box.right - 6 + shiftX, box.bottom - 6 + shiftY, travel);
    const place = (shiftX: number, shiftY: number) => {
      worker.outline.style.transform = `translate3d(${px(box.left + shiftX)}, ${px(box.top + shiftY)}, 0)`;
    };
    corner(0, 0, settle);
    later(settle, () => { place(dx, dy); corner(dx, dy, settle); });
    later(duration - settle, () => { place(0, 0); corner(0, 0, settle); });
  };

  const finish = (worker: Worker, target: Element) => {
    worker.outline.removeAttribute('data-visible');
    later(TIMING.hold, () => {
      inProgress.delete(target);
      worker.busy = false;
      pump();
      // With nothing left to build, the cursor leaves.
      if (!worker.busy) { worker.peer.removeAttribute('data-active'); worker.visible = false; }
    });
  };

  const run = (worker: Worker, target: Element) => {
    const pace = currentPace();
    const scaled = (ms: number) => Math.round(ms * pace);
    const stageRect = stage.getBoundingClientRect(), rect = target.getBoundingClientRect();
    const left = rect.left - stageRect.left, top = rect.top - stageRect.top;
    const box: Rect = { left, top, right: left + rect.width, bottom: top + rect.height, width: rect.width, height: rect.height };
    const kind = target.getAttribute('data-build') || 'frame';
    const text = TEXT_KINDS.has(kind);
    let skipped = false;
    // Each step first checks that the visitor has not scrolled past the block.
    const step = (delay: number, task: () => void) => later(delay, () => {
      if (skipped) return;
      if (isOffscreen(target)) {
        skipped = true;
        showTarget(target, false, 0);
        worker.caret.removeAttribute('data-on');
        setGuides(worker, false);
        finish(worker, target);
        return;
      }
      task();
    });

    const travel = scaled(clamp(600 + Math.hypot(worker.x - left, worker.y - top) * .45, TIMING.travelMin, TIMING.travelMax));
    const draw = scaled(clamp(500 + Math.hypot(box.width, box.height) * .9, 750, 1400));
    const show = scaled(text ? TIMING.sweep : TIMING.reveal);
    const adjust = ADJUSTABLE_KINDS.has(kind) ? scaled(TIMING.adjust) : 0;

    if (!worker.visible || Math.abs(worker.y - top) > window.innerHeight) {
      // Enter from just outside the block instead of crossing the whole page.
      jump([worker.cursorX, worker.cursorY], () => moveCursor(worker, box.right + 90, top + Math.min(box.height, 200) + 100, 0));
      worker.peer.setAttribute('data-active', '');
      worker.visible = true;
    }
    moveCursor(worker, box.left, box.top, travel);
    step(travel, () => drawFrame(worker, kind, box, draw));
    step(travel + draw, () => {
      worker.size.textContent = `${Math.round(box.width)} × ${Math.round(box.height)}`;
      worker.outline.setAttribute('data-sized', '');
      if (text) sweepCaret(worker, box, show);
      showTarget(target, text, show);
    });
    step(travel + draw + show, () => {
      worker.caret.removeAttribute('data-on');
      setGuides(worker, false);
      if (adjust) adjustBlock(worker, box, adjust);
    });
    step(travel + draw + show + adjust, () => finish(worker, target));
  };

  /** Hands waiting blocks to free cursors, in the order they appeared. */
  function pump() {
    while (pending.length) {
      const free = workers.map((_, offset) => workers[(nextWorker + offset) % workers.length]).find(worker => !worker.busy);
      const [{ target, since }] = pending;
      const tooLate = isOffscreen(target) || performance.now() - since > QUEUE_LIMIT_MS;
      // Flinging past, or a block already passed: just show it.
      if (tooLate || (!free && scrollSpeed.read() >= FLING_SPEED)) {
        pending.shift();
        showTarget(target, false, tooLate ? 0 : Math.round(TIMING.reveal * MIN_PACE));
        continue;
      }
      if (!free) return;
      pending.shift();
      nextWorker = (workers.indexOf(free) + 1) % workers.length;
      free.busy = true;
      inProgress.add(target);
      const delay = Math.max(0, lastStart + TIMING.stagger * currentPace() - performance.now());
      lastStart = performance.now() + delay;
      later(delay, () => run(free, target));
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
    scrollSpeed.stop();
    timers.forEach(timer => window.clearTimeout(timer));
    [...pending.map(item => item.target), ...inProgress].forEach(target => target.setAttribute('data-built', ''));
    stage.querySelectorAll('[data-active], [data-visible], [data-on]').forEach(node => {
      for (const attribute of ['data-active', 'data-visible', 'data-on']) node.removeAttribute(attribute);
    });
  };
}
