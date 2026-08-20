import Image from 'next/image';

import { ArrowIcon } from '@/components/icons/Arrow';
import type { Project, ProjectShot } from '@/content/projects';

export interface ProjectCardProps {
  project: Project;
  /** Two-digit ordinal shown in the card corner. */
  index: string;
}

/**
 * Screenshot strip.
 *
 * `next/image` with `fill`, so author-supplied files of any dimension are
 * served as sized, modern-format, lazily-loaded images without anyone having
 * to record their pixel dimensions in the content file. The `sizes` hint
 * matches the card grid, so phones never download a desktop-width file.
 *
 * Each shot links to the original, so a visitor who wants a proper look gets
 * one without us shipping a lightbox.
 */
function Shots({ shots, title }: { shots: readonly ProjectShot[]; title: string }) {
  /*
   * Two mistakes, previously stacked on top of each other:
   *
   * 1. The box was sized by a fixed HEIGHT (h-48/h-56), while a `featured`
   *    card spans the full grid width — so on a wide card the box stayed
   *    short but the image inside it got stretched wide, and object-cover
   *    cropped the excess off the TOP AND BOTTOM to fill that short box.
   *    For a screenshot whose headline sits a few hundred px down from the
   *    top (past a logo, a nav bar, a decorative band), that crop landed
   *    mid-sentence — visible proof in the karvon/ne-pulse cards, which
   *    showed everything BUT the actual headline.
   *
   * 2. `object-top` then made it worse by always keeping the TOP of the
   *    image and cropping the bottom — biasing toward whatever sits above
   *    the fold (often the least interesting part) and away from content
   *    further down.
   *
   * The fix is to constrain WIDTH, not height, and let an aspect ratio close
   * to what these screenshots actually are (~1.6:1 at the 1400×846 capture
   * size) determine the box — so there's barely any cropping to get wrong,
   * on a card of any width.
   */
  return (
    <ul
      className={`mt-7 grid gap-3 ${shots.length > 1 ? 'max-w-xl sm:grid-cols-2' : 'max-w-md'}`}
      aria-label={`${title} — screenshots`}
    >
      {/* Keyed by position, not src — the same image may legitimately be
          listed twice, and duplicate keys silently drop one of them. */}
      {shots.map((shot, index) => (
        <li key={`${shot.src}-${index}`}>
          <a
            href={shot.src}
            target="_blank"
            rel="noopener noreferrer"
            className="group/shot block overflow-hidden rounded-card border border-line bg-bg transition-colors duration-500 hover:border-accent/50"
          >
            <div className="relative aspect-[8/5] w-full overflow-hidden">
              <Image
                src={shot.src}
                alt={shot.alt}
                fill
                sizes="(min-width: 640px) 28rem, 90vw"
                className="object-cover object-center transition-transform duration-700 ease-out-expo group-hover/shot:scale-[1.03]"
              />
            </div>
            <span className="sr-only">(opens the full-size image in a new tab)</span>
          </a>
        </li>
      ))}
    </ul>
  );
}

function Tag({ label }: { label: string }) {
  return (
    <li className="rounded-pill border border-line px-3 py-1 text-xs text-muted transition-colors duration-500 group-hover:border-line-strong">
      {label}
    </li>
  );
}

/** An empty slot, styled as an intentional gap rather than a broken card. */
function PlaceholderCard({ project, index }: ProjectCardProps) {
  return (
    <article className="flex h-full min-h-[15rem] flex-col justify-between gap-10 rounded-card border border-dashed border-line p-7 sm:p-9">
      <div className="flex items-start justify-between gap-6">
        <h3 className="font-display text-xl font-semibold text-faint">{project.title}</h3>
        <span className="eyebrow shrink-0 text-faint">{index}</span>
      </div>
      <div>
        <p className="text-sm text-faint">{project.blurb}</p>
        <p className="eyebrow mt-5 text-faint">{project.status}</p>
      </div>
    </article>
  );
}

export function ProjectCard({ project, index }: ProjectCardProps) {
  if (project.kind === 'placeholder') {
    return <PlaceholderCard project={project} index={index} />;
  }

  return (
    <article
      className={[
        'group relative flex h-full flex-col overflow-hidden rounded-card border border-line bg-surface p-7 sm:p-9',
        'transition-[transform,border-color,background-color] duration-500 ease-out-expo',
        'hover:-translate-y-1 hover:border-line-strong hover:bg-surface-2',
        'focus-within:-translate-y-1 focus-within:border-line-strong focus-within:bg-surface-2',
      ].join(' ')}
    >
      {/* Accent hairline that draws across the top edge on hover/focus. */}
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 h-px origin-left scale-x-0 bg-accent transition-transform duration-700 ease-out-expo group-hover:scale-x-100 group-focus-within:scale-x-100"
      />

      <div className="flex items-start justify-between gap-6">
        <h3 className="text-2xl font-display font-semibold text-fg">{project.title}</h3>
        <span className="eyebrow shrink-0 pt-1.5 text-faint">{index}</span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="eyebrow">{project.year}</span>
        <span aria-hidden className="text-faint">
          ·
        </span>
        <span className="flex items-center gap-2 text-xs text-muted">
          <span aria-hidden className="h-1 w-1 rounded-full bg-accent" />
          {project.status}
        </span>
      </div>

      {/*
        The screenshot comes right after the year/status row — BEFORE the
        blurb and detail text, not after. Those two vary a lot in length
        from one project to the next (a one-line blurb vs. a blurb plus a
        four-line detail paragraph), and this card sits in a two-column
        grid next to whichever project comes next. Text-then-image meant
        the image's starting position drifted with however much text
        happened to precede it, so two neighbouring cards — each internally
        fine — never lined up as a pair. Image-then-text pins the image to
        the one part of the card that's nearly constant (title + meta row),
        so a whole row reads as a matched set regardless of blurb length.
      */}
      {project.shots && project.shots.length > 0 && (
        <Shots shots={project.shots} title={project.title} />
      )}

      <p className="mt-6 max-w-[38ch] text-lg text-fg">{project.blurb}</p>

      {project.detail && (
        <p className="mt-4 max-w-[52ch] text-sm text-muted">{project.detail}</p>
      )}

      {project.role && <p className="mt-6 text-xs text-faint">{project.role}</p>}

      {project.tags.length > 0 && (
        <ul className="mt-6 flex flex-wrap gap-2" aria-label={`${project.title} — tech and focus`}>
          {project.tags.map((tag) => (
            <Tag key={tag} label={tag} />
          ))}
        </ul>
      )}

      {/* Absorbs slack so link rows pin to the bottom across a grid row. */}
      <div className="grow" />

      {project.links.length > 0 && (
        <ul className="mt-8 flex flex-wrap items-center gap-x-7 gap-y-3 border-t border-line pt-6">
          {project.links.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                {...(link.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                className="link-draw group/link relative inline-flex items-center gap-2 text-sm text-fg transition-colors duration-300 hover:text-accent focus-visible:text-accent"
              >
                {link.label}
                <ArrowIcon
                  direction={link.external ? 'up-right' : 'right'}
                  className="transition-transform duration-300 ease-out-expo group-hover/link:translate-x-0.5"
                />
                {link.external && <span className="sr-only">(opens in a new tab)</span>}
              </a>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
