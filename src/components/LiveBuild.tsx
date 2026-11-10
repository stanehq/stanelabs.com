'use client';

import { useEffect, useRef, type CSSProperties } from 'react';
import { startLiveBuild } from '../lib/live-build';

const FLAG_ID = 'build-flag';
const PEERS = 6;
const SAFETY_TIMEOUT_MS = 8000;

// Runs while the HTML is parsed, before the first paint, so blocks never flash.
// The timeout releases the page if the application script never takes over.
const bootScript = `(function(){var e=document.getElementById('${FLAG_ID}');if(!e)return;e.dataset.boot='1';if(!matchMedia('(prefers-reduced-motion: reduce)').matches)e.dataset.mode='build';setTimeout(function(){if(!e.dataset.ready)delete e.dataset.mode},${SAFETY_TIMEOUT_MS})})();`;

const peerIndexes = Array.from({ length: PEERS }, (_, index) => index);

/**
 * Overlay for the homepage's live build (see `lib/live-build.ts`). While
 * `data-mode="build"` is set on the flag element, every `[data-build]` block is
 * hidden by CSS until a cursor builds it. Reduced motion and no-JavaScript
 * visitors never get the mode, so the page is simply visible.
 */
export function LiveBuild() {
  const flagRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const flag = flagRef.current, stage = stageRef.current;
    if (!flag || !stage) return;
    // Without prerendered HTML (the Vite preview) the boot script has not run.
    if (!flag.dataset.boot && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) flag.dataset.mode = 'build';
    flag.dataset.ready = '1';
    if (!flag.dataset.mode) return;
    const stop = startLiveBuild(stage);
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
        {peerIndexes.map(index => (
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
