/**
 * NOTES — shared types and the browser's client for the board.
 * -----------------------------------------------------------------------
 * The board is SHARED. Notes live on the server (see `notesServer.ts`) and are
 * reached over `/api/notes`, so everyone who opens the page sees the same
 * board and each other's notes.
 *
 * Conflict handling is last-write-wins per note. Two people editing the SAME
 * note at the same time will overwrite one another; two people editing
 * different notes never collide, because every change is sent as a patch to
 * one note rather than as a rewrite of the whole board.
 */

export interface Point {
  readonly x: number;
  readonly y: number;
}

/** One freehand line drawn on a note, in note-local coordinates. */
export interface Stroke {
  readonly color: string;
  readonly width: number;
  readonly points: readonly Point[];
}

/** Fonts a note can be written in. Keys map to the theme's font tokens. */
export const FONTS = {
  hand: { label: 'Hand', stack: 'var(--font-hand)', family: 'Caveat' },
  marker: { label: 'Marker', stack: 'var(--font-marker)', family: 'Permanent Marker' },
  serif: { label: 'Serif', stack: 'var(--font-serif)', family: 'Playfair Display' },
  sans: { label: 'Sans', stack: 'var(--font-sans)', family: 'Inter' },
  display: { label: 'Display', stack: 'var(--font-display)', family: 'Space Grotesk' },
  mono: { label: 'Mono', stack: 'var(--font-mono)', family: 'ui-monospace' },
} as const;

export type FontKey = keyof typeof FONTS;

export interface NoteStyle {
  readonly font: FontKey;
  /** Text size in px. */
  readonly size: number;
  readonly bold: boolean;
  readonly italic: boolean;
  readonly underline: boolean;
  readonly align: 'left' | 'center' | 'right' | 'justify';
  /** Multiplier on the text size. */
  readonly lineHeight: number;
  /** Null means the ink colour that suits the note's paper. */
  readonly color: string | null;
  /** Marker band behind the text. Null means none. */
  readonly highlight: string | null;
}

export const DEFAULT_STYLE: NoteStyle = {
  font: 'hand',
  size: 22,
  bold: false,
  italic: false,
  underline: false,
  align: 'left',
  lineHeight: 1.3,
  color: null,
  highlight: null,
};

export const TEXT_SIZE = { min: 13, max: 40, step: 2 } as const;

export const LINE_HEIGHTS = [
  { value: 1.0, label: 'Tight' },
  { value: 1.3, label: 'Normal' },
  { value: 1.6, label: 'Roomy' },
  { value: 2.0, label: 'Double' },
] as const;

/** Ink colours, and marker colours that stay readable over paper. */
export const INK_COLORS = ['#1f2933', '#b3261e', '#1d4ed8', '#15803d', '#7c3aed', '#a16207'] as const;
export const HIGHLIGHT_COLORS = ['#fff275', '#a5f3fc', '#bbf7d0', '#fecdd3', '#e9d5ff'] as const;

export interface Note {
  readonly id: string;
  /** Position on the infinite canvas, in world units. */
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  /** Degrees. Small, so the board looks pinned rather than printed. */
  readonly rotation: number;
  /** Hex from PALETTE. */
  readonly color: string;
  readonly text: string;
  readonly strokes: readonly Stroke[];
  /** Stacking order. Higher is nearer the front. */
  readonly z: number;
  readonly createdAt: number;
  /** Optional so notes written before formatting existed still load. */
  readonly style?: NoteStyle;
  /**
   * Set by the server: is this the viewer's own note? Owner ids never reach the
   * browser, so this flag is all a client can know about who wrote what.
   */
  readonly mine?: boolean;
}

/** Sticky stock. `ink` is chosen to stay readable on each. */
export const PALETTE = [
  { name: 'Yellow', bg: '#fde68a', edge: '#e9c65d', ink: '#42300a' },
  { name: 'Pink', bg: '#fbcfe8', edge: '#e9adcc', ink: '#4a1130' },
  { name: 'Blue', bg: '#bfdbfe', edge: '#9cbce9', ink: '#11294a' },
  { name: 'Green', bg: '#bbf7d0', edge: '#94daaf', ink: '#0b3520' },
  { name: 'Orange', bg: '#fed7aa', edge: '#e8ba86', ink: '#4a2408' },
  { name: 'Purple', bg: '#ddd6fe', edge: '#bdb4ea', ink: '#2a1a5e' },
  { name: 'Mint', bg: '#a7f3d0', edge: '#84d6b1', ink: '#0a3b2a' },
  { name: 'White', bg: '#f5f5f4', edge: '#d8d8d4', ink: '#2a2a28' },
] as const;

export const DEFAULT_SIZE = { width: 220, height: 220 } as const;

/**
 * Notes are square, always. A free-form rectangle turns the board into a mess
 * of mismatched slabs, and the cap stops one note swallowing the canvas.
 */
export const NOTE_SIZE = { min: 150, max: 340 } as const;

/**
 * One note per person. The board itself is unlimited — this is a per-visitor
 * limit, enforced on the server against the owner cookie.
 */
export const NOTES_PER_PERSON = 1;

export const LIMITS = { text: { max: 400 } } as const;

/* --- Board client -------------------------------------------------------- */

const API = '/api/notes';

function normalise(note: Note): Note {
  return {
    ...note,
    style: { ...DEFAULT_STYLE, ...(note.style ?? {}) },
    width: clampSize(note.width),
    height: clampSize(note.width),
  };
}

export function clampSize(value: number): number {
  return Math.max(NOTE_SIZE.min, Math.min(NOTE_SIZE.max, Math.round(value)));
}

export function makeId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Raised when the server rejects text the profanity filter caught. */
export class ProfanityError extends Error {
  constructor() {
    super('PROFANITY');
    this.name = 'ProfanityError';
  }
}

/** Raised when you already have a note on the board. */
export class OnePerPersonError extends Error {
  constructor() {
    super('ONE_PER_PERSON');
    this.name = 'OnePerPersonError';
  }
}

/** Raised when the server refuses a change to someone else's note. */
export class NotYoursError extends Error {
  constructor() {
    super('NOT_YOURS');
    this.name = 'NotYoursError';
  }
}

export async function fetchNotes(signal?: AbortSignal): Promise<Note[]> {
  const response = await fetch(API, { cache: 'no-store', ...(signal ? { signal } : {}) });
  if (!response.ok) throw new Error(`Could not load the board (${response.status}).`);
  const data: unknown = await response.json();
  return Array.isArray(data) ? (data as Note[]).map(normalise) : [];
}

export async function createNote(note: Note): Promise<Note> {
  const response = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(note),
  });
  if (response.status === 422) throw new ProfanityError();
  if (response.status === 409) throw new OnePerPersonError();
  if (!response.ok) throw new Error(`Could not add the note (${response.status}).`);
  return normalise((await response.json()) as Note);
}

export async function saveNote(id: string, patch: Partial<Note>): Promise<Note> {
  const response = await fetch(`${API}/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });
  if (response.status === 422) throw new ProfanityError();
  if (response.status === 403) throw new NotYoursError();
  if (!response.ok) throw new Error(`Could not save the note (${response.status}).`);
  return normalise((await response.json()) as Note);
}

export async function destroyNote(id: string): Promise<void> {
  const response = await fetch(`${API}/${encodeURIComponent(id)}`, { method: 'DELETE' });
  if (!response.ok && response.status !== 404) {
    throw new Error(`Could not delete the note (${response.status}).`);
  }
}
