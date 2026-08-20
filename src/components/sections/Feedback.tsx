'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';

import { ArrowIcon } from '@/components/icons/Arrow';
import { PinIcon } from '@/components/icons/Pin';
import { Reveal, Stagger, StaggerItem } from '@/components/motion/Reveal';
import { site } from '@/content/site';

/**
 * The three notes fanned out on the card.
 *
 * Paper colours come straight from the board's own PALETTE so the preview and
 * the real thing are the same stock. Each entry carries its resting placement
 * and where it drifts to while the card is hovered — transforms only, so the
 * whole fan animates on the compositor and costs the main thread nothing.
 */
const PREVIEW_NOTES = [
  {
    bg: '#fde68a',
    ink: '#42300a',
    className:
      'left-0 top-9 -rotate-[10deg] group-hover:-translate-x-3 group-hover:-translate-y-2 group-hover:-rotate-[15deg]',
  },
  {
    bg: '#bfdbfe',
    ink: '#11294a',
    className: 'left-20 top-0 rotate-[7deg] group-hover:-translate-y-4 group-hover:rotate-[11deg]',
  },
  {
    bg: '#fbcfe8',
    ink: '#4a1130',
    className:
      'left-10 top-24 -rotate-[3deg] group-hover:translate-x-3 group-hover:translate-y-2 group-hover:rotate-[2deg]',
  },
] as const;

/**
 * FEEDBACK — the landing page's doorway to the board at /feedback.
 *
 * Glass only reads as glass when there is something behind it to refract, so
 * the section paints two blurred colour fields first and the card sits over
 * them with a backdrop blur.
 */
export function Feedback() {
  return (
    <section id="feedback" className="relative overflow-hidden py-16 sm:py-20">
      {/* Light behind the glass. Without this the blur has nothing to work on. */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -left-16 top-0 h-48 w-48 rounded-full bg-accent/20 blur-[56px]" />
        <div className="absolute bottom-0 right-0 h-52 w-52 rounded-full bg-[#6d7cff]/15 blur-[64px]" />
      </div>

      <div className="shell relative">
        <Reveal>
          <motion.div className="group relative overflow-hidden rounded-[22px] border border-white/10 bg-white/[0.06] shadow-[0_24px_64px_-36px_rgba(0,0,0,0.9)] backdrop-blur-md">
            {/* Hairline grid, seen faintly through the glass. */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-[0.045]"
              style={{
                backgroundImage:
                  'linear-gradient(to right, var(--color-fg) 1px, transparent 1px), linear-gradient(to bottom, var(--color-fg) 1px, transparent 1px)',
                backgroundSize: '48px 48px',
              }}
            />

            {/* Specular edge: bright along the top, gone by the bottom. */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/[0.07] to-transparent"
            />

            {/* Sheen that sweeps across the glass once, on hover. */}
            <div
              aria-hidden
              className="pointer-events-none absolute -inset-y-8 -left-1/3 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/[0.07] to-transparent transition-transform duration-1000 ease-out-expo group-hover:translate-x-[420%]"
            />

            <div className="relative grid items-center gap-8 p-7 sm:p-9 lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-12 lg:p-11">
              <div>
                <div className="flex items-center gap-2.5">
                  <span aria-hidden className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
                  </span>
                  <span className="eyebrow">{site.feedback.label}</span>
                </div>

                <h2 className="mt-4 max-w-[16ch] text-3xl font-semibold tracking-tight text-fg sm:text-4xl">
                  {site.feedback.heading}
                </h2>

                <p className="mt-4 max-w-[46ch] text-base text-muted">{site.feedback.lead}</p>

                <Stagger as="ul" stagger={0.07} delay={0.1} className="mt-6 flex flex-wrap gap-2">
                  {site.feedback.rules.map((rule) => (
                    <StaggerItem
                      key={rule}
                      as="li"
                      className="inline-flex items-center gap-2 rounded-pill border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-faint"
                    >
                      <span aria-hidden className="h-1 w-1 rounded-full bg-accent" />
                      {rule}
                    </StaggerItem>
                  ))}
                </Stagger>

                <Link
                  href="/feedback"
                  className="mt-7 inline-flex items-center gap-2.5 rounded-pill bg-accent px-6 py-3 text-sm font-semibold text-bg shadow-[0_12px_34px_-12px_rgba(232,184,75,0.85)] transition-transform duration-300 ease-out-expo hover:-translate-y-0.5 focus-visible:-translate-y-0.5"
                >
                  <PinIcon className="h-3.5 w-3.5" />
                  {site.feedback.cta}
                  <ArrowIcon className="transition-transform duration-300 ease-out-expo group-hover:translate-x-1" />
                </Link>
              </div>

              {/* The fan of notes. Decorative — the copy above says everything. */}
              <div
                aria-hidden
                className="relative mx-auto hidden h-[14.5rem] w-[13rem] shrink-0 sm:block"
              >
                {PREVIEW_NOTES.map((note, index) => (
                  <div
                    key={note.bg}
                    className={`absolute h-28 w-28 rounded-[3px] p-3 shadow-[0_12px_26px_-12px_rgba(0,0,0,0.75)] transition-transform duration-700 ease-out-expo ${note.className}`}
                    style={{ backgroundColor: note.bg, color: note.ink }}
                  >
                    <span className="font-hand text-[1.2rem] leading-[1.15]">
                      {site.feedback.preview[index]}
                    </span>
                    {/* The fold every sticky note has in the bottom corner. */}
                    <span
                      className="absolute bottom-0 right-0 h-4 w-4"
                      style={{
                        background:
                          'linear-gradient(135deg, transparent 50%, rgba(0,0,0,0.14) 50%)',
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </Reveal>
      </div>
    </section>
  );
}
