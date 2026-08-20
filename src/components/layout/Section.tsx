import type { ReactNode } from 'react';
import { Reveal } from '@/components/motion/Reveal';

export interface SectionProps {
  /** Anchor id — must match an entry in navSections. */
  id: string;
  /** Two-digit index shown in the eyebrow rule, e.g. "02". */
  index: string;
  /** Short uppercase label in the eyebrow rule. */
  label: string;
  /** Section heading. Optional — Work supplies its own. */
  title?: ReactNode;
  /** Standfirst under the heading. */
  lead?: string;
  children: ReactNode;
  className?: string;
}

/**
 * The shared editorial frame: a hairline rule with an index + label, then a
 * heading, then content. Every section uses it so the page reads as one system.
 */
export function Section({ id, index, label, title, lead, children, className }: SectionProps) {
  return (
    <section id={id} className={`py-section ${className ?? ''}`}>
      <div className="shell">
        <Reveal className="flex items-baseline gap-4 border-b border-line pb-4">
          <span className="eyebrow text-faint">{index}</span>
          <span className="eyebrow">{label}</span>
        </Reveal>

        {(title || lead) && (
          <div className="mt-stack">
            {title && (
              <Reveal as="header">
                <h2 className="text-section max-w-[18ch] font-semibold text-fg">{title}</h2>
              </Reveal>
            )}
            {lead && (
              <Reveal delay={0.08}>
                <p className="mt-6 max-w-[52ch] text-lg text-muted">{lead}</p>
              </Reveal>
            )}
          </div>
        )}

        {children}
      </div>
    </section>
  );
}
