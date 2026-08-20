import { DEFAULT_STYLE, clampSize, type Note } from '@/lib/notes';
import { sanitiseHtml } from '@/lib/richText';
import { readStore, writeStore } from '@/lib/storage';

/** As stored. `ownerId` never leaves the server. */
export type StoredNote = Note & { ownerId: string };

/**
 * SERVER-SIDE NOTE STORE
 * -----------------------------------------------------------------------
 * The board is shared: everyone who opens /notes sees the same notes, because
 * they live here rather than in each visitor's browser.
 *
 * Storage goes through `readStore`/`writeStore` (`storage.ts`) — a hosted
 * Redis store in production, a local JSON file in dev. Notes used to be
 * written straight to disk here, which meant they vanished on every Vercel
 * cold start; the store swap is what makes the board survive a real deploy.
 *
 * There is no cap on how many notes the board holds — only a hard ceiling far
 * above normal use, so a script cannot grow the file without bound. Each
 * PERSON may leave one note; that limit lives in the route handlers.
 */

const STORE_KEY = 'notes';

/**
 * Writes are serialised through this promise chain. Two requests arriving
 * together would otherwise both read, both mutate their own copy, and both
 * write — and whichever finished last would silently erase the other's note.
 * This only coordinates requests handled by the SAME server instance; the
 * hosted store is still the actual source of truth across instances.
 */
/** Far above any real board; purely a stop against runaway growth. */
export const HARD_CEILING = 10000;

let queue: Promise<unknown> = Promise.resolve();

function serialise<T>(job: () => Promise<T>): Promise<T> {
  const run = queue.then(job, job);
  // Keep the chain alive even if a job rejects.
  queue = run.catch(() => undefined);
  return run;
}

async function readAll(): Promise<StoredNote[]> {
  const stored = await readStore<StoredNote[]>(STORE_KEY);
  return Array.isArray(stored) ? stored : [];
}

async function writeAll(notes: readonly StoredNote[]): Promise<void> {
  await writeStore(STORE_KEY, notes);
}

/** Coerce whatever arrived over the wire into a note we are willing to store. */
export function sanitise(input: Record<string, unknown>, fallback?: Note): Note {
  const base = fallback ?? {
    id: String(input['id'] ?? ''),
    x: 0,
    y: 0,
    width: 220,
    height: 220,
    rotation: 0,
    color: '#fde68a',
    text: '',
    strokes: [],
    z: 0,
    createdAt: Date.now(),
    style: DEFAULT_STYLE,
  };

  const num = (key: string, current: number) =>
    typeof input[key] === 'number' && Number.isFinite(input[key]) ? (input[key] as number) : current;

  const size = clampSize(num('width', base.width));

  return {
    ...base,
    x: num('x', base.x),
    y: num('y', base.y),
    width: size,
    height: size,
    rotation: num('rotation', base.rotation),
    z: num('z', base.z),
    color: typeof input['color'] === 'string' ? input['color'] : base.color,
    // Sanitised HERE, on the way in. This is the authoritative pass: the
    // browser's is a convenience, and a hand-written request skips it.
    text: typeof input['text'] === 'string' ? sanitiseHtml(input['text'].slice(0, 4000)) : base.text,
    strokes: Array.isArray(input['strokes']) ? (input['strokes'] as Note['strokes']) : base.strokes,
    style:
      typeof input['style'] === 'object' && input['style'] !== null
        ? { ...DEFAULT_STYLE, ...(base.style ?? {}), ...(input['style'] as object) }
        : base.style,
  };
}

/** What the browser receives: no owner ids, just whether it is theirs. */
function toPublic(note: StoredNote, viewer: string): Note {
  const { ownerId, ...rest } = note;
  return { ...rest, mine: ownerId === viewer };
}

/* --- The swap point. Point these at a hosted store to go public. --------- */

export function listNotes(viewer: string): Promise<Note[]> {
  return serialise(async () => (await readAll()).map((note) => toPublic(note, viewer)));
}

/** How many notes this person already has. One is the limit. */
export function countFor(ownerId: string): Promise<number> {
  return serialise(async () => (await readAll()).filter((note) => note.ownerId === ownerId).length);
}

export function createNote(
  input: Record<string, unknown>,
  ownerId: string,
): Promise<Note | 'ALREADY_HAS_ONE' | 'BOARD_FULL'> {
  return serialise(async () => {
    const notes = await readAll();
    // Checked inside the queue, not before it: two requests racing would both
    // pass an earlier check and both get a note in.
    if (notes.some((note) => note.ownerId === ownerId)) return 'ALREADY_HAS_ONE';
    if (notes.length >= HARD_CEILING) return 'BOARD_FULL';

    const note: StoredNote = { ...sanitise(input), ownerId };
    await writeAll([...notes, note]);
    return toPublic(note, ownerId);
  });
}

export function patchNote(
  id: string,
  input: Record<string, unknown>,
  ownerId: string,
): Promise<Note | 'NOT_FOUND' | 'NOT_YOURS'> {
  return serialise(async () => {
    const notes = await readAll();
    const index = notes.findIndex((note) => note.id === id);
    if (index === -1) return 'NOT_FOUND';

    const current = notes[index] as StoredNote;
    if (current.ownerId !== ownerId) return 'NOT_YOURS';

    const updated: StoredNote = { ...sanitise(input, current), ownerId: current.ownerId };
    notes[index] = updated;
    await writeAll(notes);
    return toPublic(updated, ownerId);
  });
}

export function deleteNote(
  id: string,
  ownerId: string,
): Promise<'DELETED' | 'NOT_FOUND' | 'NOT_YOURS'> {
  return serialise(async () => {
    const notes = await readAll();
    const target = notes.find((note) => note.id === id);
    if (!target) return 'NOT_FOUND';
    if (target.ownerId !== ownerId) return 'NOT_YOURS';
    await writeAll(notes.filter((note) => note.id !== id));
    return 'DELETED';
  });
}
