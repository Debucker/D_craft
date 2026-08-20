'use client';

import { useState } from 'react';
import { motion, useMotionValueEvent, useReducedMotion, useScroll } from 'framer-motion';

import { Wordmark } from '@/components/brand/Wordmark';
import { navSections, site } from '@/content/site';

/** Sections that stay visible on small screens; the rest hide under sm. */
const MOBILE_VISIBLE: ReadonlySet<string> = new Set(['work', 'contact']);

export function Nav() {
  const [condensed, setCondensed] = useState(false);
  const { scrollY } = useScroll();
  const reduceMotion = useReducedMotion();

  // One state flip at the threshold, not a re-render per scroll frame.
  useMotionValueEvent(scrollY, 'change', (value) => {
    const next = value > 32;
    setCondensed((current) => (current === next ? current : next));
  });

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-colors duration-500 ${
        condensed
          ? 'border-b border-line bg-bg/80 backdrop-blur-md'
          : 'border-b border-transparent bg-transparent'
      }`}
    >
      <motion.nav
        aria-label="Primary"
        className="shell flex h-[4.5rem] items-center justify-between gap-6"
        initial={reduceMotion ? false : { opacity: 0, y: -12 }}
        animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
      >
        <a
          href="#top"
          className="group -m-2 rounded p-2"
          aria-label={`${site.name} — back to top`}
        >
          <Wordmark />
        </a>

        <ul className="flex items-center gap-1 sm:gap-3">
          {navSections.map((section) => (
            <li key={section.id} className={MOBILE_VISIBLE.has(section.id) ? '' : 'hidden sm:block'}>
              <a
                href={`#${section.id}`}
                className="group inline-block px-2 py-1.5 text-sm text-muted transition-colors duration-300 hover:text-fg focus-visible:text-fg sm:px-3"
              >
                {/* The underline lives on this unpadded span, not the padded
                    `<a>` above, so it hugs each word's own width instead of
                    stretching across the padding too — see the comment on
                    `.link-draw` in globals.css for why that matters here. */}
                <span className="link-draw relative inline-block">{section.label}</span>
              </a>
            </li>
          ))}
        </ul>
      </motion.nav>
    </header>
  );
}
