'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';

import { Logo } from './Logo';

const SEEN_KEY = 'dcraft-splash-seen';
/** Draw (1.1s) + orbit settle (~0.9s from its own delay), then a beat to look at it. */
const HOLD_MS = 1500;

function alreadySeen(id: string): boolean {
  try {
    const seen: unknown = JSON.parse(sessionStorage.getItem(SEEN_KEY) ?? '[]');
    return Array.isArray(seen) && seen.includes(id);
  } catch {
    return false;
  }
}

function markSeen(id: string) {
  try {
    const seen: unknown = JSON.parse(sessionStorage.getItem(SEEN_KEY) ?? '[]');
    const list = Array.isArray(seen) ? seen : [];
    sessionStorage.setItem(SEEN_KEY, JSON.stringify([...new Set([...list, id])]));
  } catch {
    /* Private browsing or storage disabled — the splash just plays every time. */
  }
}

export interface SplashProps {
  /** Distinct per page, so each gets its own once-per-session loader. */
  id: string;
}

/**
 * Full-screen loading mark — the D that used to sit permanently in the hero,
 * now announcing the page instead: draws itself in, the dot completes one
 * orbit, then it fades to reveal the real content underneath.
 *
 * Server and first client paint both render the overlay VISIBLE, unconditionally
 * — that's the only state that's identical in both places, so hydration never
 * mismatches. (Reading sessionStorage in a lazy `useState` initialiser looks
 * tempting, but the server has no sessionStorage and guesses "already seen";
 * the client then hydrates into a different guess, and React throws a
 * hydration-mismatch error over a splash screen.) A returning visitor — this
 * page's id already in this session's storage — has it pulled instantly, with
 * no fade, the moment the post-hydration effect below can run.
 */
export function Splash({ id }: SplashProps) {
  const reduceMotion = useReducedMotion();
  const [visible, setVisible] = useState(true);
  const [instant, setInstant] = useState(false);

  useEffect(() => {
    if (reduceMotion || alreadySeen(id)) {
      setInstant(true);
      setVisible(false);
      return;
    }

    markSeen(id);
    const previousOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';

    // `setVisible(false)` below doesn't unmount this component — Splash
    // stays mounted with the overlay just removed from its JSX — so the
    // effect's own cleanup (which only runs on unmount or a dependency
    // change, neither of which happens here) is not enough to undo the
    // line above. Restore it directly whenever the hold ends, and keep the
    // cleanup only for the case where Splash unmounts before the timer.
    const restore = () => {
      document.documentElement.style.overflow = previousOverflow;
    };
    const timer = window.setTimeout(() => {
      restore();
      setVisible(false);
    }, HOLD_MS);

    return () => {
      window.clearTimeout(timer);
      restore();
    };
  }, [reduceMotion, id]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          aria-hidden
          className="pointer-events-none fixed inset-0 z-[100] flex items-center justify-center bg-bg"
          initial={false}
          exit={{ opacity: 0 }}
          transition={{ duration: instant ? 0 : 0.55, ease: [0.16, 1, 0.3, 1] }}
        >
          <Logo size={104} draw orbit className="text-fg" />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
