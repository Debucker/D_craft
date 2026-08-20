'use client';

import type { ComponentType, ReactNode } from 'react';
import { motion, useReducedMotion, type HTMLMotionProps } from 'framer-motion';
import {
  RISE,
  VIEWPORT,
  enterTransition,
  revealVariants,
  staggerVariants,
} from '@/lib/motion';

type RevealTag =
  | 'div'
  | 'section'
  | 'article'
  | 'header'
  | 'footer'
  | 'ul'
  | 'ol'
  | 'li'
  | 'p'
  | 'span';

/**
 * All the tags we allow accept the same props we actually pass (className,
 * children, variants), so we render through one generic component type rather
 * than branching per tag. Narrow double-cast, contained to this line.
 */
const asMotion = (tag: RevealTag) =>
  motion[tag] as unknown as ComponentType<HTMLMotionProps<'div'>>;

export interface RevealProps {
  children: ReactNode;
  /** Element to render. Keeps the markup semantic. */
  as?: RevealTag;
  className?: string;
  /** Seconds before this element starts. */
  delay?: number;
  /** Travel distance in px. */
  y?: number;
  /**
   * Animate as soon as it mounts instead of waiting for the viewport.
   * Use for above-the-fold content only.
   */
  immediate?: boolean;
}

/** Fade + rise a single element when it scrolls into view. */
export function Reveal({
  children,
  as = 'div',
  className,
  delay = 0,
  y = RISE,
  immediate = false,
}: RevealProps) {
  const reduceMotion = useReducedMotion();
  const Tag = asMotion(as);

  if (reduceMotion) {
    return <Tag className={className}>{children}</Tag>;
  }

  return (
    <Tag
      className={className}
      variants={revealVariants(y)}
      initial="hidden"
      {...(immediate ? { animate: 'show' } : { whileInView: 'show', viewport: VIEWPORT })}
      transition={enterTransition(delay)}
    >
      {children}
    </Tag>
  );
}

export interface StaggerProps {
  children: ReactNode;
  as?: RevealTag;
  className?: string;
  /** Gap between each child, in seconds. */
  stagger?: number;
  delay?: number;
  immediate?: boolean;
}

/**
 * Parent for lists. Children must be <StaggerItem> to inherit the timing —
 * anything else renders normally and simply doesn't animate.
 */
export function Stagger({
  children,
  as = 'div',
  className,
  stagger = 0.08,
  delay = 0,
  immediate = false,
}: StaggerProps) {
  const reduceMotion = useReducedMotion();
  const Tag = asMotion(as);

  if (reduceMotion) {
    return <Tag className={className}>{children}</Tag>;
  }

  return (
    <Tag
      className={className}
      variants={staggerVariants(stagger, delay)}
      initial="hidden"
      {...(immediate ? { animate: 'show' } : { whileInView: 'show', viewport: VIEWPORT })}
    >
      {children}
    </Tag>
  );
}

export interface StaggerItemProps {
  children: ReactNode;
  as?: RevealTag;
  className?: string;
  y?: number;
  duration?: number;
}

export function StaggerItem({
  children,
  as = 'div',
  className,
  y = RISE,
  duration = 0.7,
}: StaggerItemProps) {
  const reduceMotion = useReducedMotion();
  const Tag = asMotion(as);

  if (reduceMotion) {
    return <Tag className={className}>{children}</Tag>;
  }

  return (
    <Tag
      className={className}
      variants={revealVariants(y)}
      transition={enterTransition(0, duration)}
    >
      {children}
    </Tag>
  );
}
