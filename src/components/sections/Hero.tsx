'use client';

import { motion, useReducedMotion } from 'framer-motion';

import { ArrowIcon } from '@/components/icons/Arrow';
import { MailIcon } from '@/components/icons/Mail';
import { Logo } from '@/components/brand/Logo';
import { OrbitField } from '@/components/brand/OrbitField';
import { Stagger, StaggerItem } from '@/components/motion/Reveal';
import { site } from '@/content/site';

export function Hero() {
  const reduceMotion = useReducedMotion();

  return (
    <section
      id="top"
      className="relative flex min-h-[100svh] items-center overflow-hidden pb-24 pt-32"
    >
      {/* Hairline grid, barely there — gives the negative space some structure. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage:
            'linear-gradient(to right, var(--color-fg) 1px, transparent 1px)',
          backgroundSize: 'clamp(6rem, 12vw, 11rem) 100%',
        }}
      />

      <div className="shell relative grid items-center gap-stack lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] lg:gap-12">
        <Stagger immediate stagger={0.09} delay={0.1} className="text-center lg:text-left">
          <StaggerItem className="mb-5 flex justify-center lg:justify-start">
            <Logo
              size={96}
              draw
              orbit
              loop
              delay={0.2}
              className="h-16 w-16 text-fg sm:h-20 sm:w-20 lg:h-24 lg:w-24"
            />
          </StaggerItem>

          <StaggerItem>
            <h1 className="text-hero font-bold text-fg">
              {site.hero.headline.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
              <span className="sr-only">— {site.role} based in {site.location}</span>
            </h1>
          </StaggerItem>

          <StaggerItem className="mx-auto mt-8 max-w-[26ch] sm:max-w-[34ch] lg:mx-0">
            <p className="text-2xl font-display font-semibold leading-tight text-fg">
              {site.hero.positioning}
            </p>
          </StaggerItem>

          <StaggerItem className="mx-auto mt-6 max-w-[54ch] lg:mx-0">
            <p className="text-base text-muted">{site.hero.sub}</p>
          </StaggerItem>

          <StaggerItem className="mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-4 lg:justify-start">
            <a
              href="#work"
              className="group inline-flex items-center gap-2.5 rounded-pill bg-accent px-6 py-3 text-sm font-medium text-bg transition-transform duration-300 ease-out-expo hover:-translate-y-0.5"
            >
              See selected work
              <ArrowIcon className="transition-transform duration-300 ease-out-expo group-hover:translate-x-1" />
            </a>

            {/*
              A direct mailto, not a scroll-to-form — someone who already
              knows they want to hire shouldn't have to find the form first.
              Styled as a real secondary button (outlined) rather than a
              quiet text link, so it reads as an action, not an afterthought.
            */}
            <a
              href={`mailto:${site.email}`}
              className="group inline-flex items-center gap-2.5 rounded-pill border border-line-strong px-6 py-3 text-sm font-medium text-fg transition-colors duration-300 hover:border-accent hover:text-accent"
            >
              <MailIcon />
              Or get in touch
            </a>
          </StaggerItem>
        </Stagger>

        <motion.div
          className="hidden lg:block"
          initial={reduceMotion ? false : { opacity: 0, scale: 0.94 }}
          animate={reduceMotion ? undefined : { opacity: 1, scale: 1 }}
          transition={{ duration: 1.4, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          <OrbitField className="ml-auto w-full max-w-[30rem] text-fg" />
        </motion.div>
      </div>

      {/* Scroll cue — a hairline that keeps drawing itself downward. */}
      {!reduceMotion && (
        <div
          aria-hidden
          className="pointer-events-none absolute bottom-10 left-1/2 hidden h-14 w-px -translate-x-1/2 overflow-hidden bg-line md:block"
        >
          <motion.span
            className="absolute inset-x-0 top-0 block h-1/2 origin-top bg-accent"
            animate={{ scaleY: [0, 1, 1], y: ['0%', '0%', '200%'] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut', times: [0, 0.45, 1] }}
          />
        </div>
      )}
    </section>
  );
}
