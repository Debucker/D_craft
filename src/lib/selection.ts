'use client';

/**
 * THE ACTIVE EDITOR
 * -----------------------------------------------------------------------
 * The toolbar lives in the top bar; the text being formatted lives inside a
 * note. This is the wire between them: whichever note is open for editing
 * registers itself here, and the toolbar applies commands to it.
 *
 * A module-level reference rather than context because only ONE note is ever
 * open at a time, and a context would re-render every note whenever the active
 * editor changed — the exact cost the board is trying to avoid.
 */

interface ActiveEditor {
  readonly element: HTMLElement;
  /** Push the edited markup back into React state. */
  readonly sync: (html: string) => void;
}

let active: ActiveEditor | null = null;

export function registerEditor(element: HTMLElement, sync: (html: string) => void): void {
  active = { element, sync };
}

export function unregisterEditor(element: HTMLElement): void {
  if (active?.element === element) active = null;
}

export function hasActiveEditor(): boolean {
  return active !== null;
}

/** True when the caret is actually inside the open editor and covers some text. */
export function hasSelection(): boolean {
  if (!active) return false;
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return false;
  const range = selection.getRangeAt(0);
  return active.element.contains(range.commonAncestorContainer);
}

/**
 * Apply a formatting command to the current selection.
 *
 * `document.execCommand` is deprecated and still the only thing every browser
 * implements for this. Reimplementing it over Range means handling selections
 * that start mid-node, span several elements, or land inside existing
 * formatting — which is where hand-rolled versions corrupt documents. The
 * output is sanitised on the way out regardless, so the mess it sometimes
 * produces never reaches storage.
 */
export function applyToSelection(command: string, value?: string): boolean {
  if (!active) return false;

  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return false;
  if (!active.element.contains(selection.getRangeAt(0).commonAncestorContainer)) return false;

  active.element.focus({ preventScroll: true });
  try {
    // Produce <span style> rather than <font>, which the sanitiser allows.
    document.execCommand('styleWithCSS', false, 'true');
    document.execCommand(command, false, value);
  } catch {
    return false;
  }

  active.sync(active.element.innerHTML);
  return true;
}
