export interface ArrowIconProps {
  className?: string;
  /** 'up-right' reuses the same glyph, just rotated — for external links. */
  direction?: 'right' | 'up-right';
}

/**
 * A drawn arrow, not the Unicode "→"/"↗" characters.
 *
 * Google's "latin" subset of Inter covers ↑ and ↓ but not → or ↗ — so those
 * two glyphs were silently falling back to the OS font (Segoe UI on Windows)
 * while the rest of the button rendered in actual Inter. Two different
 * typefaces at two different weights, side by side in one button, is what
 * read as "crooked" — the box itself was always centred. Drawing the arrow
 * ourselves removes the font entirely from the equation.
 */
export function ArrowIcon({ className, direction = 'right' }: ArrowIconProps) {
  return (
    <svg
      viewBox="0 0 16 16"
      width="14"
      height="14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={`${direction === 'up-right' ? '-rotate-45' : ''} ${className ?? ''}`}
    >
      <path d="M3 8h9.4" />
      <path d="M8.8 4.4 12.4 8 8.8 11.6" />
    </svg>
  );
}
