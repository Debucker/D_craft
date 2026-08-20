'use client';

import type { CSSProperties } from 'react';
import { useEffect, useRef } from 'react';
import {
  motion,
  useInView,
  useMotionValue,
  useReducedMotion,
  useTransform,
  type MotionValue,
} from 'framer-motion';

/**
 * HERO VISUAL — the logo's idea, scaled up.
 * -----------------------------------------------------------------------
 * The mark is a D with one dot on a tilted elliptical orbit. This is that same
 * geometry opened out into a system: six orbits at the identical -12° tilt,
 * carrying nine bodies (one with its own moon) around a lit core, over a
 * starfield, under a slowly turning rim.
 *
 * It reuses Logo.tsx's technique exactly — one angle mapped through cos/sin
 * into translate x/y — so every body moves on transform alone. No animated
 * cx/cy, no layout, no path repaint. The only other animated property is
 * opacity, on the handful of stars that twinkle.
 *
 * The periods are all primes (11/17/23/31/43/59s), so the bodies never settle
 * into a repeating arrangement. `useTime` is a monotonic clock, so there is no
 * restart seam either.
 *
 * The accent glow that used to follow the pointer around the hero is now
 * parked here, behind the core — the light has a source in the picture.
 */

const VIEW = 400;
const CENTRE = VIEW / 2;

/** Same tilt as the mark. Everything on the page shares this angle. */
const TILT = -12;
const TILT_COS = Math.cos((TILT * Math.PI) / 180);
const TILT_SIN = Math.sin((TILT * Math.PI) / 180);

interface Moon {
  readonly distance: number;
  readonly period: number;
  readonly r: number;
}

interface Body {
  readonly rx: number;
  readonly ry: number;
  /** Milliseconds per revolution. */
  readonly period: number;
  /** Starting angle in radians — spreads the bodies out at first paint. */
  readonly phase: number;
  readonly r: number;
  readonly accent?: boolean;
  /** Fill opacity, ignored when accent. */
  readonly opacity: number;
  /** A faint ring around the body, like a planet's. */
  readonly halo?: number;
  readonly moon?: Moon;
}

interface Ring {
  readonly rx: number;
  readonly ry: number;
  readonly opacity: number;
  readonly dashed?: boolean;
}

/** rx/ry holds the mark's 1.2 ratio, so every ring belongs to one family. */
const RINGS: readonly Ring[] = [
  { rx: 52, ry: 43, opacity: 0.22 },
  { rx: 78, ry: 65, opacity: 0.17 },
  { rx: 106, ry: 88, opacity: 0.14, dashed: true },
  { rx: 134, ry: 111, opacity: 0.11 },
  { rx: 162, ry: 135, opacity: 0.08, dashed: true },
  { rx: 190, ry: 158, opacity: 0.06 },
];

/**
 * Nine bodies over six rings — two rings carry a pair, which is what stops the
 * field reading as a tidy diagram of one-dot-per-ring.
 */
const BODIES: readonly Body[] = [
  { rx: 52, ry: 43, period: 11000, phase: 0.4, r: 3, accent: true, opacity: 1 },
  { rx: 78, ry: 65, period: 17000, phase: 2.1, r: 4.5, opacity: 0.6, moon: { distance: 11, period: 4300, r: 1.5 } },
  { rx: 106, ry: 88, period: 23000, phase: 4.2, r: 3, opacity: 0.45 },
  { rx: 106, ry: 88, period: 23000, phase: 0.9, r: 1.8, opacity: 0.3 },
  { rx: 134, ry: 111, period: 31000, phase: 1.2, r: 5.5, opacity: 0.5, halo: 10 },
  { rx: 134, ry: 111, period: 31000, phase: 3.9, r: 2.2, opacity: 0.28 },
  { rx: 162, ry: 135, period: 43000, phase: 5.6, r: 2.5, opacity: 0.3 },
  { rx: 190, ry: 158, period: 59000, phase: 3.3, r: 3.5, accent: true, opacity: 0.55 },
  { rx: 190, ry: 158, period: 59000, phase: 1.7, r: 2, opacity: 0.22 },
];

/**
 * A clock like `useTime()`, but capped to `fps` regardless of the display's
 * real refresh rate, and stoppable.
 *
 * `useTime()` ticks on every `requestAnimationFrame` — on a 60Hz screen that's
 * 60 recomputations a second across all nine bodies' `useTransform` chains;
 * on a 144Hz gaming monitor it's 144, more than double the main-thread work,
 * for orbits with 11-59 SECOND periods that look identical either way. The
 * `requestAnimationFrame` loop itself still runs every frame — that part is
 * unavoidable and cheap — but the expensive part, writing to the MotionValue
 * that fans out to every body, only happens `fps` times a second.
 *
 * `active: false` cancels the loop outright, for when the system is scrolled
 * out of view or `prefers-reduced-motion` applies — no point paying for
 * frames nobody can see. The value itself is preserved across pauses (start
 * is computed as `now - time.get()`, not reset to `now`), so resuming
 * continues the clock exactly where it left off instead of snapping.
 */
function useThrottledClock(active: boolean, fps: number) {
  const time = useMotionValue(0);

  useEffect(() => {
    if (!active) return;

    let frame = 0;
    let last = 0;
    const start = performance.now() - time.get();
    const minDelta = 1000 / fps;

    const tick = (now: number) => {
      if (now - last >= minDelta) {
        time.set(now - start);
        last = now;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(frame);
  }, [active, fps, time]);

  return time;
}

/** Position on a tilted ellipse, relative to the centre. */
function pointAt(rx: number, ry: number, angle: number) {
  const lx = rx * Math.cos(angle);
  const ly = ry * Math.sin(angle);
  return { x: lx * TILT_COS - ly * TILT_SIN, y: lx * TILT_SIN + ly * TILT_COS };
}

/**
 * Seeded PRNG. The starfield must be identical on the server and the client or
 * React reports a hydration mismatch, so this can never be Math.random().
 */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Star {
  readonly cx: number;
  readonly cy: number;
  readonly r: number;
  readonly opacity: number;
  /** Seconds per twinkle cycle. Undefined means it holds steady. */
  readonly twinkle?: number;
}

const STARS: readonly Star[] = (() => {
  const random = mulberry32(0x5eed);
  const out: Star[] = [];
  while (out.length < 40) {
    const cx = 10 + random() * (VIEW - 20);
    const cy = 10 + random() * (VIEW - 20);
    // Keep the middle clear so the core stays the brightest thing here.
    if (Math.hypot(cx - CENTRE, cy - CENTRE) < 34) continue;
    out.push({
      cx,
      cy,
      r: 0.5 + random() * 1.1,
      opacity: 0.05 + random() * 0.16,
      twinkle: random() < 0.22 ? 3 + random() * 5 : undefined,
    });
  }
  return out;
})();

function OrbitingBody({ body, time }: { body: Body; time: MotionValue<number> }) {
  const angle = useTransform(time, (t) => (t / body.period) * Math.PI * 2 + body.phase);
  const x = useTransform(angle, (a) => pointAt(body.rx, body.ry, a).x);
  const y = useTransform(angle, (a) => pointAt(body.rx, body.ry, a).y);

  const moonAngle = useTransform(time, (t) =>
    body.moon ? (t / body.moon.period) * Math.PI * 2 : 0,
  );
  const moonX = useTransform(moonAngle, (a) => (body.moon?.distance ?? 0) * Math.cos(a));
  const moonY = useTransform(
    moonAngle,
    // Squashed vertically so the moon's path reads as tilted like everything else.
    (a) => (body.moon?.distance ?? 0) * Math.sin(a) * 0.42,
  );

  return (
    <motion.g style={{ x, y }} className="will-change-transform">
      {body.halo && (
        <circle
          cx={CENTRE}
          cy={CENTRE}
          r={body.halo}
          stroke="currentColor"
          strokeOpacity={body.opacity * 0.5}
          strokeWidth={0.75}
        />
      )}

      <circle
        cx={CENTRE}
        cy={CENTRE}
        r={body.r}
        fill={body.accent ? 'var(--accent)' : 'currentColor'}
        fillOpacity={body.opacity}
      />

      {body.moon && (
        <motion.circle
          cx={CENTRE}
          cy={CENTRE}
          r={body.moon.r}
          fill="currentColor"
          fillOpacity={0.5}
          style={{ x: moonX, y: moonY }}
          className="will-change-transform"
        />
      )}
    </motion.g>
  );
}

function StaticBody({ body }: { body: Body }) {
  const { x, y } = pointAt(body.rx, body.ry, body.phase);
  return (
    <g transform={`translate(${x} ${y})`}>
      {body.halo && (
        <circle
          cx={CENTRE}
          cy={CENTRE}
          r={body.halo}
          stroke="currentColor"
          strokeOpacity={body.opacity * 0.5}
          strokeWidth={0.75}
        />
      )}
      <circle
        cx={CENTRE}
        cy={CENTRE}
        r={body.r}
        fill={body.accent ? 'var(--accent)' : 'currentColor'}
        fillOpacity={body.opacity}
      />
      {body.moon && (
        <circle
          cx={CENTRE + body.moon.distance}
          cy={CENTRE}
          r={body.moon.r}
          fill="currentColor"
          fillOpacity={0.5}
        />
      )}
    </g>
  );
}

export function OrbitField({ className }: { className?: string }) {
  const reduceMotion = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  /**
   * Nine bodies' worth of trig, recomputed every animation frame, forever —
   * for a picture that's invisible the moment you've scrolled a screen past
   * it. `margin` gives it a buffer so bodies freeze just outside the
   * viewport rather than visibly stopping at its edge, and `useThrottledClock`
   * below preserves elapsed time across the pause, so resuming when it
   * scrolls back into view is exact — no snap.
   */
  const inView = useInView(containerRef, { margin: '200px' });
  const animating = !reduceMotion && inView;

  // 30fps is plenty for an 11-59 SECOND orbit — no visible difference from a
  // display's native 60/120/144Hz, at a fraction of the main-thread cost.
  const time = useThrottledClock(animating, 30);

  /** The outer rim creeps round once every four minutes. */
  const rimRotate = useTransform(time, (t) => (t / 240000) * 360);

  return (
    <div ref={containerRef} className={`relative ${className ?? ''}`}>
      {/*
        The hero's ambient light. This used to be a 560px glow that trailed the
        pointer; it is now pinned behind the core, so it reads as light coming
        off the system instead of following the mouse around.
      */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 aspect-square w-[135%] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          background:
            'radial-gradient(closest-side, color-mix(in oklab, var(--accent) 17%, transparent), transparent)',
        }}
      />

      <svg
        viewBox={`0 0 ${VIEW} ${VIEW}`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
        focusable="false"
        className="relative block w-full"
      >
        <defs>
          <radialGradient id="orbit-core-glow">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.4" />
            <stop offset="40%" stopColor="var(--accent)" stopOpacity="0.1" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Starfield, behind everything. Twinkling is a CSS keyframe driven by
            per-star custom properties — no JS animation driver per star. */}
        <g>
          {STARS.map((star, index) =>
            star.twinkle ? (
              <circle
                key={`star-${index}`}
                cx={star.cx}
                cy={star.cy}
                r={star.r}
                fill="currentColor"
                className="twinkle"
                style={
                  {
                    '--twinkle-min': star.opacity,
                    '--twinkle-max': Math.min(star.opacity * 2.6, 0.55),
                    '--twinkle-duration': `${star.twinkle}s`,
                    '--twinkle-delay': `${(index % 5) * 0.7}s`,
                  } as CSSProperties
                }
              />
            ) : (
              <circle
                key={`star-${index}`}
                cx={star.cx}
                cy={star.cy}
                r={star.r}
                fill="currentColor"
                fillOpacity={star.opacity}
              />
            ),
          )}
        </g>

        {/* Slowly turning rim. A circle, so its own bbox centre is the system
            centre — which is what makes transform-origin: center correct. */}
        {!animating ? (
          <circle
            cx={CENTRE}
            cy={CENTRE}
            r={196}
            stroke="currentColor"
            strokeOpacity={0.07}
            strokeWidth={1}
            strokeDasharray="1 12"
          />
        ) : (
          <motion.circle
            cx={CENTRE}
            cy={CENTRE}
            r={196}
            stroke="currentColor"
            strokeOpacity={0.07}
            strokeWidth={1}
            strokeDasharray="1 12"
            className="will-change-transform"
            style={{ rotate: rimRotate, transformBox: 'fill-box', transformOrigin: 'center' }}
          />
        )}

        <circle cx={CENTRE} cy={CENTRE} r={150} fill="url(#orbit-core-glow)" />

        {RINGS.map((ring) => (
          <ellipse
            key={`ring-${ring.rx}`}
            cx={CENTRE}
            cy={CENTRE}
            rx={ring.rx}
            ry={ring.ry}
            transform={`rotate(${TILT} ${CENTRE} ${CENTRE})`}
            stroke="currentColor"
            strokeOpacity={ring.opacity}
            strokeWidth={1}
            strokeDasharray={ring.dashed ? '2 7' : undefined}
          />
        ))}

        {/* The core. Still — everything else moves around it. */}
        <circle cx={CENTRE} cy={CENTRE} r={7} fill="var(--accent)" />
        <circle cx={CENTRE} cy={CENTRE} r={15} stroke="var(--accent)" strokeOpacity={0.35} strokeWidth={1} />
        <circle
          cx={CENTRE}
          cy={CENTRE}
          r={26}
          stroke="var(--accent)"
          strokeOpacity={0.16}
          strokeWidth={1}
          strokeDasharray="1 5"
        />

        {BODIES.map((body, index) =>
          !animating ? (
            <StaticBody key={`body-${index}`} body={body} />
          ) : (
            <OrbitingBody key={`body-${index}`} body={body} time={time} />
          ),
        )}
      </svg>
    </div>
  );
}
