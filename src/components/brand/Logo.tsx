'use client';

import { useEffect, useId } from 'react';
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from 'framer-motion';

/* ---------------------------------------------------------------------------
 * The mark: a geometric "D" — a straight stem and a true semicircular bowl
 * (chord 44 = 2 × r22), with a dot on a tilted elliptical orbit around it.
 *
 * The orbit is driven by a single angle MotionValue mapped through cos/sin into
 * translate x/y, so the whole animation is one compositor-friendly transform.
 * No cx/cy attribute animation, no layout, no repaint of the path.
 * ------------------------------------------------------------------------- */

/** Semicircular bowl: stem at x=14, arc from (28,10) to (28,54), r=22. */
const D_PATH = 'M14 10 H28 A22 22 0 0 1 28 54 H14 Z';

/** Weight of the mark. 22-unit bowl radius, so this reads as a bold stroke. */
const STROKE = 7.5;

/** The accent dot. Grow this and ORBIT.rx/ry have to grow with it. */
const DOT_R = 4.5;

const ORBIT = {
  /** Semi-major / semi-minor axes in viewBox units. */
  rx: 29.5,
  ry: 24.5,
  /** Tilt of the orbital plane, degrees. */
  tilt: -12,
  /**
   * Where the dot parks: upper-right, ~0.8u clear of the bowl stroke.
   * The clearance is a function of STROKE — thicken the D and the bowl's outer
   * edge moves out by half that, so the orbit radii above have to follow or the
   * dot ends up sitting on the stroke.
   */
  restAngle: (-35 * Math.PI) / 180,
} as const;

const TILT_COS = Math.cos((ORBIT.tilt * Math.PI) / 180);
const TILT_SIN = Math.sin((ORBIT.tilt * Math.PI) / 180);

/** One full lap once the dot has settled, when `loop` is on. Slow and quiet
 *  on purpose — a background detail, not something asking to be watched. */
const LOOP_PERIOD = 16;

/**
 * The mark is drawn in 0-64 space, but the dot's orbit is wider than that —
 * its extremes reach x = -1.8 and x = 65.8, and an SVG clips at its viewBox.
 * Left at "0 0 64 64" the dot visibly slices off as it comes round the sides.
 * Padding the box by 3 units on every side clears it while keeping the mark
 * centred; the 70/64 scale-up is already folded into the sizes at the call
 * sites, so the D renders the same size it always did.
 */
const VIEW_BOX = '-3 -3 70 70';

export interface LogoProps {
  /** Rendered width & height in px. Sized against the 70-unit viewBox. */
  size?: number;
  /** Stroke-draw the D on mount. Use once per page (the hero). */
  draw?: boolean;
  /** Run the single orbit loop on mount, then rest. */
  orbit?: boolean;
  /** After the arrival loop settles, keep the dot circling slowly forever. Requires `orbit`. */
  loop?: boolean;
  /** Seconds to wait before the mark animates in. */
  delay?: number;
  className?: string;
  /**
   * Accessible name. Omit when the mark sits next to a text wordmark —
   * it's then decorative and gets aria-hidden.
   */
  title?: string;
}

export function Logo({
  size = 70,
  draw = false,
  orbit = false,
  loop = false,
  delay = 0,
  className,
  title,
}: LogoProps) {
  const reduceMotion = useReducedMotion();
  const titleId = useId();

  // One angle → two transforms. Start a full turn behind the rest position so
  // the dot completes exactly one clockwise loop and settles.
  const angle = useMotionValue(
    orbit ? ORBIT.restAngle - Math.PI * 2 : ORBIT.restAngle,
  );

  const x = useTransform(angle, (a) => {
    const lx = ORBIT.rx * Math.cos(a);
    const ly = ORBIT.ry * Math.sin(a);
    return lx * TILT_COS - ly * TILT_SIN;
  });

  const y = useTransform(angle, (a) => {
    const lx = ORBIT.rx * Math.cos(a);
    const ly = ORBIT.ry * Math.sin(a);
    return lx * TILT_SIN + ly * TILT_COS;
  });

  const shouldOrbit = orbit && !reduceMotion;

  useEffect(() => {
    if (!shouldOrbit) {
      angle.set(ORBIT.restAngle);
      return;
    }

    // StrictMode mounts every effect twice in dev (mount, cleanup, mount) —
    // without this flag, the first run's settle can still complete and
    // start its own infinite loop after cleanup, leaving two competing
    // animations fighting over the same angle. onComplete checks it before
    // ever starting the loop, so a cleaned-up run can't do that.
    let cancelled = false;
    let continuous: ReturnType<typeof animate> | undefined;

    const settle = animate(angle, ORBIT.restAngle, {
      duration: 2.6,
      delay: delay + 0.3,
      // Eases out of the loop so it arrives and settles rather than stopping.
      ease: [0.5, 0, 0.15, 1],
      onComplete: () => {
        if (loop && !cancelled) {
          // Same sign as the settle target above (which travels from
          // restAngle - 2π up to restAngle, i.e. increasing) — using -2π
          // here would spin the loop the opposite way the instant it took
          // over, so the dot visibly reverses direction at the handoff.
          continuous = animate(angle, ORBIT.restAngle + Math.PI * 2, {
            duration: LOOP_PERIOD,
            ease: 'linear',
            repeat: Infinity,
          });
        }
      },
    });

    return () => {
      cancelled = true;
      settle.stop();
      continuous?.stop();
    };
  }, [angle, shouldOrbit, loop, delay]);

  const decorative = title === undefined;

  return (
    <svg
      viewBox={VIEW_BOX}
      width={size}
      height={size}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role={decorative ? undefined : 'img'}
      aria-hidden={decorative || undefined}
      aria-labelledby={decorative ? undefined : titleId}
      focusable="false"
    >
      {!decorative && <title id={titleId}>{title}</title>}

      {/* Ghost of the orbital path — visible while the dot is travelling.
          When `loop` is on the dot never stops travelling, so this settles
          at a low resting opacity instead of fading out; otherwise it fades
          out with the one-shot arrival animation, as before. */}
      {shouldOrbit && (
        <motion.ellipse
          cx={32}
          cy={32}
          rx={ORBIT.rx}
          ry={ORBIT.ry}
          transform={`rotate(${ORBIT.tilt} 32 32)`}
          stroke="currentColor"
          strokeWidth={0.75}
          initial={{ opacity: 0 }}
          animate={{ opacity: loop ? [0, 0.16, 0.16, 0.1] : [0, 0.16, 0.16, 0] }}
          transition={{
            duration: 3.1,
            delay: delay + 0.2,
            times: [0, 0.12, 0.72, 1],
            ease: 'linear',
          }}
        />
      )}

      <motion.path
        d={D_PATH}
        stroke="currentColor"
        strokeWidth={STROKE}
        strokeLinejoin="round"
        strokeLinecap="round"
        initial={draw && !reduceMotion ? { pathLength: 0, opacity: 0 } : false}
        animate={draw && !reduceMotion ? { pathLength: 1, opacity: 1 } : undefined}
        transition={{
          pathLength: { duration: 1.1, delay, ease: [0.16, 1, 0.3, 1] },
          opacity: { duration: 0.25, delay },
        }}
      />

      <motion.circle
        cx={32}
        cy={32}
        r={DOT_R}
        fill="var(--accent)"
        style={{ x, y }}
        initial={draw && !reduceMotion ? { opacity: 0, scale: 0.4 } : false}
        animate={draw && !reduceMotion ? { opacity: 1, scale: 1 } : undefined}
        transition={{ duration: 0.5, delay: delay + 0.25, ease: [0.16, 1, 0.3, 1] }}
      />
    </svg>
  );
}
