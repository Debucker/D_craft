import type { Transition, Variants } from 'framer-motion';

/**
 * The motion system's shared constants. Every animation on the site pulls its
 * easing and timing from here, which is what stops a dozen hand-tuned
 * transitions from drifting apart.
 */

/** Decelerating, slightly overshoot-free. The house ease. */
export const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;
export const EASE_OUT_QUINT = [0.22, 1, 0.36, 1] as const;

/** Default distance for enter animations. Small on purpose. */
export const RISE = 18;

/**
 * Fire slightly before the element is fully on screen so content is already
 * settled by the time the reader's eye reaches it. `once` — no re-animating on
 * scroll-back, which reads as jitter.
 */
export const VIEWPORT = { once: true, margin: '0px 0px -10% 0px' } as const;

export const enterTransition = (delay = 0, duration = 0.7): Transition => ({
  duration,
  delay,
  ease: EASE_OUT_EXPO,
});

/** Single element: fade + rise. Transform and opacity only. */
export const revealVariants = (y: number = RISE): Variants => ({
  hidden: { opacity: 0, y },
  show: { opacity: 1, y: 0 },
});

/** Parent that releases its children one after another. */
export const staggerVariants = (stagger = 0.08, delayChildren = 0): Variants => ({
  hidden: {},
  show: {
    transition: { staggerChildren: stagger, delayChildren },
  },
});
