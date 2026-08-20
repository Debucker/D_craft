'use client';

import { Logo } from './Logo';
import { site } from '@/content/site';

export interface WordmarkProps {
  /** Mark size in px; the text scales alongside it. */
  size?: number;
  className?: string;
}

/**
 * The nav lockup: mark + name. The mark is decorative here because the
 * adjacent text already names the brand — one accessible name, not two.
 */
export function Wordmark({ size = 31, className }: WordmarkProps) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className ?? ''}`}>
      <Logo size={size} className="text-fg transition-colors duration-300 group-hover:text-accent" />
      <span className="font-display text-[1.0625rem] font-semibold tracking-tight text-fg">
        {site.shortName}
      </span>
    </span>
  );
}
