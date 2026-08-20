'use client';

import { useEffect } from 'react';
import { useReducedMotion } from 'framer-motion';

/**
 * ANIMATED FAVICON
 * -----------------------------------------------------------------------
 * The mark from Logo.tsx, redrawn in the browser tab with the accent dot
 * orbiting continuously.
 *
 * It has to be a canvas. Browsers render an SVG favicon as a single static
 * snapshot — SMIL and CSS animation inside it are ignored — so the only way to
 * move a favicon is to repaint a canvas and rewrite the icon <link> href each
 * frame. `app/icon.svg` stays as the static icon and is restored on unmount,
 * so anything that reads the icon without running scripts still gets a mark.
 *
 * PERFORMANCE: the frames are rendered ONCE and cached as data URLs, then
 * cycled. The first version called `canvas.toDataURL()` on every tick — that is
 * a synchronous PNG encode on the main thread 25 times a second, for a 16px
 * image, forever. It was a measurable source of jank on a page that is supposed
 * to feel fluid. Now the per-tick cost is assigning a cached string.
 *
 * The cache is built during idle time after first paint, so it never competes
 * with rendering the actual page. Until it is ready the static icon stays up.
 *
 * Two honest limitations:
 *  - Background tabs throttle timers to roughly 1fps, so the orbit only reads
 *    as smooth while the tab is the active one.
 *  - Under `prefers-reduced-motion` this does nothing at all and the static
 *    SVG icon is left exactly where it is.
 */

const SIZE = 64;
const BG = '#0B0B0C';
const FG = '#F2F2F0';
const ACCENT = '#E8B84B';

/** Same geometry as Logo.tsx — keep these in step with it. */
const D_PATH = 'M14 10 H28 A22 22 0 0 1 28 54 H14 Z';
const STROKE = 8;
const DOT_R = 5;
const ORBIT = { rx: 29.5, ry: 24.5, tilt: -12 } as const;

/**
 * Frames in the cached loop. 44 frames over 3.6s is ~12fps, which is plenty for
 * a 16px icon and keeps the cache around 70KB.
 */
const FRAMES = 44;
/** Seconds per revolution. */
const PERIOD = 3.6;

const TILT_COS = Math.cos((ORBIT.tilt * Math.PI) / 180);
const TILT_SIN = Math.sin((ORBIT.tilt * Math.PI) / 180);

export function AnimatedFavicon() {
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (reduceMotion) return;
    if (typeof document === 'undefined') return;

    const canvas = document.createElement('canvas');
    canvas.width = SIZE;
    canvas.height = SIZE;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let timer = 0;
    let idle = 0;
    let usedIdleCallback = false;
    let cancelled = false;

    // Path2D accepts SVG path data, so the bowl is literally the same curve.
    const mark = new Path2D(D_PATH);

    // Take over the icon slot, remembering what was there.
    const originals = [...document.querySelectorAll<HTMLLinkElement>('link[rel~="icon"]')];
    originals.forEach((link) => link.remove());

    const link = document.createElement('link');
    link.rel = 'icon';
    link.type = 'image/png';
    document.head.appendChild(link);

    const draw = (angle: number): string => {
      ctx.clearRect(0, 0, SIZE, SIZE);

      ctx.fillStyle = BG;
      ctx.beginPath();
      ctx.roundRect(0, 0, SIZE, SIZE, 14);
      ctx.fill();

      ctx.save();
      // Same framing as icon.svg: centre the 64-unit mark and pull it in a
      // little so the stroke never touches the rounded corners.
      ctx.translate(SIZE / 2, SIZE / 2);
      ctx.scale(0.76, 0.76);
      ctx.translate(-33, -32);

      ctx.strokeStyle = FG;
      ctx.lineWidth = STROKE;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.stroke(mark);

      // One angle -> an ellipse, tilted. Matches Logo.tsx exactly.
      const lx = ORBIT.rx * Math.cos(angle);
      const ly = ORBIT.ry * Math.sin(angle);
      ctx.fillStyle = ACCENT;
      ctx.beginPath();
      ctx.arc(
        32 + (lx * TILT_COS - ly * TILT_SIN),
        32 + (lx * TILT_SIN + ly * TILT_COS),
        DOT_R,
        0,
        Math.PI * 2,
      );
      ctx.fill();

      ctx.restore();

      return canvas.toDataURL('image/png');
    };

    // Render the loop once, off the critical path, then just cycle strings.
    const buildCache = () => {
      const frames: string[] = [];
      for (let i = 0; i < FRAMES; i++) {
        frames.push(draw((i / FRAMES) * Math.PI * 2));
      }
      return frames;
    };

    const start = () => {
      if (cancelled) return;
      const frames = buildCache();
      let index = 0;
      link.href = frames[0] as string;
      timer = window.setInterval(() => {
        // A backgrounded tab's favicon isn't being looked at — decoding a new
        // PNG into it 12 times a second while the user is in Telegram or
        // another tab is pure waste.
        if (document.hidden) return;
        index = (index + 1) % FRAMES;
        link.href = frames[index] as string;
      }, (PERIOD * 1000) / FRAMES);
    };

    // Paint one static frame immediately so the tab is never iconless, then
    // build the cache when the browser has nothing better to do.
    link.href = draw(0);

    // `typeof` rather than `in`: the DOM lib declares requestIdleCallback
    // unconditionally, so `'x' in window` narrows the else branch to never.
    if (typeof window.requestIdleCallback === 'function') {
      usedIdleCallback = true;
      idle = window.requestIdleCallback(start, { timeout: 3000 });
    } else {
      idle = window.setTimeout(start, 800);
    }

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      if (usedIdleCallback) window.cancelIdleCallback(idle);
      else window.clearTimeout(idle);
      link.remove();
      originals.forEach((original) => document.head.appendChild(original));
    };
  }, [reduceMotion]);

  return null;
}
