'use client';

import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';

import { StickyNote, type Tool } from '@/components/notes/StickyNote';
import {
  DEFAULT_SIZE,
  DEFAULT_STYLE,
  FONTS,
  HIGHLIGHT_COLORS,
  INK_COLORS,
  NOTES_PER_PERSON,
  OnePerPersonError,
  PALETTE,
  LINE_HEIGHTS,
  TEXT_SIZE,
  ProfanityError,
  createNote as createNoteOnBoard,
  destroyNote,
  fetchNotes,
  makeId,
  saveNote,
  type FontKey,
  type Note,
  type NoteStyle,
} from '@/lib/notes';
import { checkProfanity } from '@/lib/profanity';
import { applyToSelection, hasSelection } from '@/lib/selection';
import { htmlToPlainText, plainTextToHtml } from '@/lib/richText';
import { indent, isBulleted, isNumbered, outdent, sortLines, toggleBullets, toggleNumbers } from '@/lib/text';

const ZOOM = { min: 0.25, max: 3, step: 1.2 } as const;

/** Symbols worth one click. Kept short — a full emoji picker is a rabbit hole. */
const SYMBOLS = ['★', '✓', '✗', '→', '←', '↑', '↓', '•', '♥', '!', '?', '№', '⚑', '☺', '☹', '⏰'];

const PEN_COLORS = ['#1f2933', '#d34848', '#2563eb', '#15803d', '#b45309', '#7c3aed'];

/* ---- Ribbon primitives ---------------------------------------------------
 * The toolbar was a single wrapping row of loose buttons. These three pieces
 * give it structure: every control is the same height, related controls sit in
 * a captioned group, and groups are separated by a rule. Nothing here holds
 * state — they are shape only.
 * ------------------------------------------------------------------------ */

/** A captioned cluster of related controls, like a ribbon group. */
function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex shrink-0 flex-col items-center gap-1.5 px-2.5">
      <div className="flex items-center gap-1">{children}</div>
      <span className="whitespace-nowrap text-[0.55rem] font-semibold uppercase tracking-[0.18em] text-white/30">
        {label}
      </span>
    </div>
  );
}

/** One control. Every button in the ribbon is this, so nothing is a stray size. */
function Btn({
  children,
  onClick,
  title,
  active = false,
  danger = false,
  square = false,
  className = '',
}: {
  children: React.ReactNode;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  title?: string;
  active?: boolean;
  danger?: boolean;
  square?: boolean;
  className?: string;
}) {
  const tone = active
    ? 'bg-accent text-bg font-semibold shadow-[0_2px_10px_-2px_rgba(232,184,75,0.55)]'
    : danger
      ? 'text-[#ff9683] hover:bg-[#ff9683]/12'
      : 'text-fg/85 hover:bg-white/[0.09] hover:text-fg';
  return (
    <button
      type="button"
      // Keep the caret where it is: focusing a toolbar button would collapse
      // the selection in the note before the command could apply to it.
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      title={title}
      className={`inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-lg text-[0.8125rem] font-medium transition-all duration-150 active:scale-95 ${
        square ? 'w-8' : 'px-2.5'
      } ${tone} ${className}`}
    >
      {children}
    </button>
  );
}

/** A colour chip. Round for ink and pens, square for paper and marker. */
function Swatch({
  color,
  active,
  title,
  onClick,
  round = false,
}: {
  color: string;
  active: boolean;
  title: string;
  onClick: () => void;
  round?: boolean;
}) {
  return (
    <button
      type="button"
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      title={title}
      aria-label={title}
      className={`h-6 w-6 shrink-0 transition-all duration-150 ${round ? 'rounded-full' : 'rounded-[5px]'} ${
        active
          ? 'ring-2 ring-white ring-offset-2 ring-offset-[#16161b]'
          : 'ring-1 ring-black/50 hover:ring-white/50'
      }`}
      style={{ backgroundColor: color }}
    />
  );
}

/* ---- Icons ---------------------------------------------------------------
 * A handful of 16px glyphs drawn inline. Text arrows like "⤒" render at
 * different weights and baselines depending on the platform's fallback font,
 * which is what made the bar look assembled from spare parts.
 * ------------------------------------------------------------------------ */
const ICON_PATHS: Record<string, React.ReactNode> = {
  move: <path d="M3.2 2.2 12.6 7.4l-4 1.1-1.1 4z" fill="currentColor" stroke="none" />,
  pen: <path d="M11.4 2.6 13.4 4.6 6 12l-3.2 1.2L4 10z" />,
  eraser: (
    <>
      <path d="M5.6 13h7.4" />
      <path d="M4.4 11.4 10.2 5.6l3 3-4.6 4.6H5.9z" />
    </>
  ),
  plus: <path d="M8 3.4v9.2M3.4 8h9.2" />,
  minus: <path d="M3.4 8h9.2" />,
  reset: (
    <>
      <path d="M12.6 8a4.6 4.6 0 1 1-1.4-3.3" />
      <path d="M12.8 2.6v3h-3" />
    </>
  ),
  pin: (
    <>
      <path d="M6 2.4h4M8 2.4v4.4M4.8 6.8h6.4l-1 3.2H5.8z" />
      <path d="M8 10v3.6" />
    </>
  ),
  front: (
    <>
      <rect x="2.6" y="2.6" width="7" height="7" rx="1" opacity="0.45" />
      <rect x="6.4" y="6.4" width="7" height="7" rx="1" fill="currentColor" fillOpacity="0.18" />
    </>
  ),
  back: (
    <>
      <rect x="2.6" y="2.6" width="7" height="7" rx="1" fill="currentColor" fillOpacity="0.18" />
      <rect x="6.4" y="6.4" width="7" height="7" rx="1" opacity="0.45" />
    </>
  ),
  trash: (
    <>
      <path d="M2.8 4.4h10.4M6.4 4.4V2.9h3.2v1.5" />
      <path d="M4.3 4.4 5 13.1h6l.7-8.7" />
    </>
  ),
  chevron: <path d="M4.2 6.2 8 10l3.8-3.8" />,
  undo: (
    <>
      <path d="M3 8.2h6.4a3.4 3.4 0 0 1 0 6.8H6" />
      <path d="M5.6 5.2 2.6 8.2l3 3" />
    </>
  ),
  redo: (
    <>
      <path d="M13 8.2H6.6a3.4 3.4 0 0 0 0 6.8H10" />
      <path d="M10.4 5.2l3 3-3 3" />
    </>
  ),
  note: (
    <>
      <rect x="2.8" y="2.8" width="10.4" height="10.4" rx="1.4" />
      <path d="M5.6 6.4h4.8M5.6 9.2h3.2" />
    </>
  ),
};

function Icon({ name, className }: { name: keyof typeof ICON_PATHS; className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      {ICON_PATHS[name]}
    </svg>
  );
}

/**
 * A note as drawn when the board is zoomed out. No springs, no drawing layer,
 * no pointer handlers — at this size none of it is legible or reachable anyway,
 * and mounting the full component hundreds of times over is exactly what made a
 * busy board crawl.
 */
const LiteNote = memo(function LiteNote({ note }: { note: Note }) {
  return (
    <div
      className="absolute rounded-[3px] shadow-[0_6px_16px_rgba(0,0,0,0.4)]"
      style={{
        left: note.x,
        top: note.y,
        width: note.width,
        height: note.height,
        transform: `rotate(${note.rotation}deg)`,
        zIndex: note.z,
        backgroundColor: note.color,
        outline: note.mine ? '2px solid rgba(255,255,255,0.85)' : undefined,
      }}
    >
      <p className="overflow-hidden p-3 font-hand text-[1.3rem] leading-tight text-black/60">
        {note.text.slice(0, 60)}
      </p>
    </div>
  );
});

type MenuId = 'paper' | 'ink' | 'marker' | 'symbol' | 'font' | 'paragraph';

/** A dropdown trigger showing the current choice as a chip. */
function PickerButton({
  swatch,
  caption,
  open,
  title,
  onClick,
}: {
  swatch: string | null;
  caption: string;
  open: boolean;
  title: string;
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-2 text-[0.8125rem] font-medium transition-all duration-150 ${
        open ? 'bg-white/[0.14] text-fg' : 'text-fg/85 hover:bg-white/[0.09] hover:text-fg'
      }`}
    >
      {swatch ? (
        <span
          className="h-4 w-4 rounded-[4px] ring-1 ring-black/50"
          style={{ backgroundColor: swatch }}
        />
      ) : (
        <span className="text-white/50">{caption}</span>
      )}
      <Icon name="chevron" className={`h-3 w-3 opacity-50 transition-transform ${open ? 'rotate-180' : ''}`} />
    </button>
  );
}

interface View {
  x: number;
  y: number;
  scale: number;
}

export function Canvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [view, setView] = useState<View>({ x: 0, y: 0, scale: 1 });
  const [tool, setTool] = useState<Tool>('select');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [penColor, setPenColor] = useState<string>(PEN_COLORS[0] as string);
  const [penWidth, setPenWidth] = useState(3);
  const [barOpen, setBarOpen] = useState(true);
  /** Pinned keeps the ribbon down; there is a lot in it now. */
  const [pinned, setPinned] = useState(false);
  const [minimapOpen, setMinimapOpen] = useState(true);
  /**
   * A touch/coarse-pointer device has no hover, so the position-based
   * auto-hide below has no way to reopen the bar except the small "Toolbar"
   * handle — reachable, but easy to lose track of mid-gesture. Detecting
   * this and auto-pinning keeps the bar reliably on screen instead, the
   * same as a person choosing to pin it.
   */
  const [coarsePointer, setCoarsePointer] = useState(false);
  /**
   * Which dropdown is open, and where its trigger sits relative to the bar.
   * Panels are rendered as siblings of the scrolling row, not inside it —
   * `overflow-x: auto` clips vertically too, so a panel nested in the row
   * would be cut off at the bar's edge.
   */
  const [menu, setMenu] = useState<{ id: MenuId; x: number } | null>(null);
  const menuOpenRef = useRef(false);

  /**
   * UNDO / REDO
   *
   * History is a stack of snapshots of YOUR note — the only thing you are
   * allowed to change — where `null` means "you had no note". That one
   * representation covers writing, restyling, moving, drawing, creating and
   * deleting, so undo can walk back through all of them the same way.
   */
  const past = useRef<(Note | null)[]>([]);
  const future = useRef<(Note | null)[]>([]);
  const lastRecordedAt = useRef(0);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  /** Mirrors `notes` so history can read the current state without stale closures. */
  const notesRef = useRef<Note[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const selected = notes.find((note) => note.id === selectedId) ?? null;
  /** Formatting of the selected note, for showing which buttons are on. */
  const style = selected?.style ?? DEFAULT_STYLE;

  /* ---- The shared board ---------------------------------------------------- */

  /**
   * Notes the person is touching right now. A poll must not yank a note out
   * from under a drag or an edit, so these are kept from the local copy while
   * everything else is refreshed from the server.
   */
  const busyIds = useRef(new Set<string>());
  /** Mirrors `editingId` for the poll, which runs outside React's render. */
  const editingRef = useRef<string | null>(null);
  const [offline, setOffline] = useState(false);

  const currentMine = useCallback(
    () => notesRef.current.find((note) => note.mine) ?? null,
    [],
  );

  /**
   * Take a snapshot BEFORE a change lands.
   *
   * Typing is coalesced: without it every keystroke would be its own history
   * entry and one ctrl-Z would undo a single letter. `force` is for changes
   * that are a single deliberate act — a colour, a delete — which should
   * always be their own step.
   */
  const record = useCallback(
    (force = false) => {
      const now = Date.now();
      if (!force && past.current.length > 0 && now - lastRecordedAt.current < 700) return;
      lastRecordedAt.current = now;

      const snapshot = currentMine();
      past.current.push(snapshot ? { ...snapshot } : null);
      if (past.current.length > 60) past.current.shift();
      future.current = [];
      setCanUndo(true);
      setCanRedo(false);
    },
    [currentMine],
  );

  const merge = useCallback((remote: Note[]) => {
    setNotes((local) => {
      /**
       * A note is "held" while it has an unsent change, while it is open in the
       * editor, and while it is being dragged. Held notes are kept from the
       * local copy and the remote version is dropped.
       *
       * Without the editor and drag cases, a poll landing between two keystrokes
       * would replace the textarea's contents with whatever the server last
       * heard — you would watch your own sentence revert as you typed it, or
       * have someone else's edit appear under your cursor.
       */
      const held = new Set(busyIds.current);
      if (editingRef.current) held.add(editingRef.current);
      if (dragging.current) held.add(dragging.current.id);

      if (held.size === 0) return remote;
      const kept = local.filter((note) => held.has(note.id));
      const keptIds = new Set(kept.map((note) => note.id));
      return [...remote.filter((note) => !keptIds.has(note.id)), ...kept];
    });
  }, []);

  useEffect(() => {
    editingRef.current = editingId;
  }, [editingId]);

  useEffect(() => {
    let alive = true;
    const controller = new AbortController();

    const pull = async () => {
      try {
        const remote = await fetchNotes(controller.signal);
        if (!alive) return;
        merge(remote);
        setOffline(false);
        setReady(true);
      } catch (error) {
        if (!alive || (error as Error).name === 'AbortError') return;
        setOffline(true);
        setReady(true);
      }
    };

    void pull();
    // Everyone sees everyone else's notes within a few seconds. Polling rather
    // than websockets: a note board changes rarely, and this needs no server
    // beyond the route handlers.
    const timer = window.setInterval(pull, 4000);
    return () => {
      alive = false;
      controller.abort();
      window.clearInterval(timer);
    };
  }, [merge]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 3200);
    return () => window.clearTimeout(timer);
  }, [notice]);

  /* ---- The auto-hiding bar ------------------------------------------------ */

  useEffect(() => {
    const query = window.matchMedia('(pointer: coarse)');
    setCoarsePointer(query.matches);
    if (query.matches) setPinned(true);
    const onChange = (event: MediaQueryListEvent) => {
      setCoarsePointer(event.matches);
      if (event.matches) setPinned(true);
    };
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  /**
   * Driven by pointer position, not mouseenter/mouseleave. Leave events only
   * fire once the pointer has actually been inside the bar, so a bar that has
   * never been touched would never hide. Two thresholds give it hysteresis:
   * it opens near the very top edge and does not close until the pointer is
   * clear of the bar, so it cannot flicker along the boundary.
   */
  useEffect(() => {
    if (pinned) {
      setBarOpen(true);
      return;
    }
    const onMove = (event: PointerEvent) => {
      // A 6px strip was near-impossible to hit on purpose. 64px is a target you
      // can throw the pointer at.
      const openAt = 64;
      // While a dropdown is out it hangs BELOW the bar, so the pointer has to
      // travel past the bar's own height to reach it. Closing on that would
      // yank the panel away mid-click.
      if (menuOpenRef.current) {
        if (event.clientY <= openAt) setBarOpen(true);
        return;
      }
      const closeBelow = (headerRef.current?.offsetHeight ?? 56) + 40;
      if (event.clientY <= openAt) setBarOpen(true);
      else if (event.clientY > closeBelow) setBarOpen(false);
    };
    window.addEventListener('pointermove', onMove);
    return () => window.removeEventListener('pointermove', onMove);
  }, [pinned]);

  /* ---- Zoom -------------------------------------------------------------- */

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Registered manually: React's onWheel is passive, so it cannot
    // preventDefault, and the page would scroll behind the canvas.
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const rect = container.getBoundingClientRect();
      const px = event.clientX - rect.left;
      const py = event.clientY - rect.top;

      setView((prev) => {
        const next = Math.min(
          ZOOM.max,
          Math.max(ZOOM.min, prev.scale * Math.exp(-event.deltaY * 0.0016)),
        );
        // Keep the world point under the cursor pinned to the cursor.
        const worldX = (px - prev.x) / prev.scale;
        const worldY = (py - prev.y) / prev.scale;
        return { scale: next, x: px - worldX * next, y: py - worldY * next };
      });
    };

    container.addEventListener('wheel', onWheel, { passive: false });
    return () => container.removeEventListener('wheel', onWheel);
  }, []);

  /** Centre the viewport on a note without changing zoom. */
  const focusOn = useCallback((note: Note) => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    setView((prev) => ({
      ...prev,
      x: rect.width / 2 - (note.x + note.width / 2) * prev.scale,
      y: rect.height / 2 - (note.y + note.height / 2) * prev.scale,
    }));
  }, []);

  /** Zoom and pan so the whole board is on screen at once. */
  const fitAll = useCallback(() => {
    const container = containerRef.current;
    if (!container || notes.length === 0) return;
    const rect = container.getBoundingClientRect();

    const minX = Math.min(...notes.map((note) => note.x));
    const minY = Math.min(...notes.map((note) => note.y));
    const maxX = Math.max(...notes.map((note) => note.x + note.width));
    const maxY = Math.max(...notes.map((note) => note.y + note.height));

    const pad = 80;
    const scale = Math.max(
      ZOOM.min,
      Math.min(1, (rect.width - pad * 2) / Math.max(1, maxX - minX), (rect.height - pad * 2) / Math.max(1, maxY - minY)),
    );
    setView({
      scale,
      x: rect.width / 2 - ((minX + maxX) / 2) * scale,
      y: rect.height / 2 - ((minY + maxY) / 2) * scale,
    });
  }, [notes]);

  const zoomBy = (factor: number) => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const px = rect.width / 2;
    const py = rect.height / 2;
    setView((prev) => {
      const next = Math.min(ZOOM.max, Math.max(ZOOM.min, prev.scale * factor));
      const worldX = (px - prev.x) / prev.scale;
      const worldY = (py - prev.y) / prev.scale;
      return { scale: next, x: px - worldX * next, y: py - worldY * next };
    });
  };

  /* ---- Pan and note dragging --------------------------------------------- */

  const panning = useRef<{ x: number; y: number; vx: number; vy: number } | null>(null);
  const dragging = useRef<{ id: string; x: number; y: number; nx: number; ny: number } | null>(null);

  /**
   * Two-finger pinch-to-zoom. The wheel handler above is the only zoom path
   * that exists otherwise, and a touch screen has no wheel — without this,
   * phones and tablets could pan the board but never zoom it.
   */
  const activeTouches = useRef(new Map<number, { x: number; y: number }>());
  const pinchDist = useRef<number | null>(null);

  const onBackgroundPointerDown = (event: ReactPointerEvent) => {
    if (event.pointerType === 'touch') {
      activeTouches.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
      try {
        (event.currentTarget as Element).setPointerCapture(event.pointerId);
      } catch {
        /* Non-fatal. */
      }
      if (activeTouches.current.size >= 2) {
        // A second finger just landed — hand off from panning to pinching.
        panning.current = null;
        const [a, b] = Array.from(activeTouches.current.values());
        pinchDist.current = a && b ? Math.hypot(b.x - a.x, b.y - a.y) : null;
        return;
      }
    } else if (event.button !== 0 && event.button !== 1) {
      return;
    }

    setSelectedId(null);
    setEditingId(null);
    panning.current = { x: event.clientX, y: event.clientY, vx: view.x, vy: view.y };
    try {
      (event.currentTarget as Element).setPointerCapture(event.pointerId);
    } catch {
      /* Non-fatal — panning is driven by the state above, not the capture. */
    }
  };

  const onNotePointerDown = (event: ReactPointerEvent, note: Note) => {
    if (tool !== 'select') return;
    if (editingId === note.id) return;
    // Someone else's note: let the click fall through and pan the board, the
    // same as clicking empty space. Nothing of theirs can be moved.
    if (!note.mine) return;
    event.stopPropagation();
    record(true);
    bringToFront(note.id);
    setSelectedId(note.id);
    dragging.current = { id: note.id, x: event.clientX, y: event.clientY, nx: note.x, ny: note.y };
    // NO setPointerCapture here, deliberately.
    //
    // Capturing retargets the compatibility mouse events as well as the pointer
    // ones, so `click` and `dblclick` fired on THIS wrapper instead of the sheet
    // inside it. Events bubble up, never down, so the sheet's onDoubleClick was
    // never reached and double-clicking a note silently failed to open the
    // editor. The drag needs no capture anyway: it is driven by the ref above
    // and the canvas container underneath is already full-screen, so the
    // pointer cannot leave it mid-drag.
  };

  const onPointerMove = (event: ReactPointerEvent) => {
    if (event.pointerType === 'touch' && activeTouches.current.has(event.pointerId)) {
      activeTouches.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    }

    if (activeTouches.current.size >= 2 && pinchDist.current !== null) {
      const [a, b] = Array.from(activeTouches.current.values());
      if (a && b) {
        const dist = Math.hypot(b.x - a.x, b.y - a.y) || 1;
        const rect = containerRef.current?.getBoundingClientRect();
        const px = (a.x + b.x) / 2 - (rect?.left ?? 0);
        const py = (a.y + b.y) / 2 - (rect?.top ?? 0);
        const lastDist = pinchDist.current;
        setView((prev) => {
          const factor = dist / lastDist;
          const next = Math.min(ZOOM.max, Math.max(ZOOM.min, prev.scale * factor));
          // Same anchor trick as the wheel handler: pin the world point
          // under the fingers' midpoint, recomputed every frame off the
          // LIVE view so a pinch that also drifts sideways pans and zooms
          // together instead of only one or the other.
          const worldX = (px - prev.x) / prev.scale;
          const worldY = (py - prev.y) / prev.scale;
          return { scale: next, x: px - worldX * next, y: py - worldY * next };
        });
        pinchDist.current = dist;
      }
      return;
    }

    if (dragging.current) {
      const drag = dragging.current;
      // Screen pixels -> world units, or the note lags the cursor when zoomed.
      const dx = (event.clientX - drag.x) / view.scale;
      const dy = (event.clientY - drag.y) / view.scale;
      setNotes((prev) =>
        prev.map((note) =>
          note.id === drag.id ? { ...note, x: drag.nx + dx, y: drag.ny + dy } : note,
        ),
      );
      return;
    }
    if (panning.current) {
      const pan = panning.current;
      setView((prev) => ({
        ...prev,
        x: pan.vx + (event.clientX - pan.x),
        y: pan.vy + (event.clientY - pan.y),
      }));
    }
  };

  const endPointer = (event: ReactPointerEvent) => {
    if (event.pointerType === 'touch') {
      activeTouches.current.delete(event.pointerId);
      if (activeTouches.current.size < 2) pinchDist.current = null;
    }
    if (dragging.current) pushNote(dragging.current.id);
    dragging.current = null;
    panning.current = null;
  };

  /* ---- Note operations ---------------------------------------------------- */

  /**
   * Changes are coalesced per note before being sent. Dragging a note fires on
   * every pointer move; without this the board would take a write per frame.
   */
  const pending = useRef(new Map<string, number>());

  const pushNote = useCallback((id: string) => {
    const timers = pending.current;
    window.clearTimeout(timers.get(id));
    busyIds.current.add(id);
    timers.set(
      id,
      window.setTimeout(() => {
        timers.delete(id);
        setNotes((current) => {
          const note = current.find((entry) => entry.id === id);
          if (note) {
            void saveNote(id, note)
              .catch((error) => {
                if (error instanceof ProfanityError) {
                  setNotice('Please keep it clean — that word is not allowed on the board.');
                } else {
                  setNotice('Could not reach the board — that change was not saved.');
                }
              })
              .finally(() => busyIds.current.delete(id));
          } else {
            busyIds.current.delete(id);
          }
          return current;
        });
      }, 400),
    );
  }, []);

  useEffect(() => {
    const timers = pending.current;
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, []);

  const bringToFront = useCallback((id: string) => {
    setNotes((prev) => {
      const top = prev.reduce((max, note) => Math.max(max, note.z), 0);
      return prev.map((note) => (note.id === id ? { ...note, z: top + 1 } : note));
    });
    pushNote(id);
  }, [pushNote]);

  const sendToBack = (id: string) => {
    setNotes((prev) => {
      const bottom = prev.reduce((min, note) => Math.min(min, note.z), 0);
      return prev.map((note) => (note.id === id ? { ...note, z: bottom - 1 } : note));
    });
    pushNote(id);
  };

  const myNote = notes.find((note) => note.mine);

  const addNote = () => {
    if (myNote) {
      setNotice('You already have a note on this board. Edit or delete it to write another.');
      focusOn(myNote);
      setSelectedId(myNote.id);
      return;
    }
    record(true);
    const container = containerRef.current;
    const rect = container?.getBoundingClientRect();
    // Drop it in the middle of whatever the person is currently looking at.
    const centreX = ((rect ? rect.width / 2 : 400) - view.x) / view.scale;
    const centreY = ((rect ? rect.height / 2 : 300) - view.y) / view.scale;
    const top = notes.reduce((max, note) => Math.max(max, note.z), 0);

    const note: Note = {
      id: makeId(),
      x: centreX - DEFAULT_SIZE.width / 2 + (Math.random() * 40 - 20),
      y: centreY - DEFAULT_SIZE.height / 2 + (Math.random() * 40 - 20),
      width: DEFAULT_SIZE.width,
      height: DEFAULT_SIZE.height,
      rotation: Math.random() * 8 - 4,
      color: (PALETTE[notes.length % PALETTE.length] ?? PALETTE[0]).bg,
      text: '',
      strokes: [],
      z: top + 1,
      createdAt: Date.now(),
      style: DEFAULT_STYLE,
    };
    // Optimistic: it appears at once, then the board confirms it.
    setNotes((prev) => [...prev, note]);
    setSelectedId(note.id);
    setEditingId(note.id);
    setTool('select');
    busyIds.current.add(note.id);

    void createNoteOnBoard(note)
      .then((saved) => {
        // The server decides ownership, so take its copy.
        setNotes((prev) => prev.map((entry) => (entry.id === note.id ? saved : entry)));
      })
      .catch((error) => {
        setNotes((prev) => prev.filter((entry) => entry.id !== note.id));
        setSelectedId(null);
        setEditingId(null);
        setNotice(
          error instanceof OnePerPersonError
            ? 'You already have a note on this board.'
            : 'Could not reach the board — that note was not saved.',
        );
      })
      .finally(() => busyIds.current.delete(note.id));
  };


  const selectNote = useCallback(
    (id: string) => {
      setSelectedId(id);
      bringToFront(id);
    },
    [bringToFront],
  );

  const stopEditing = useCallback(() => setEditingId(null), []);

  /** Only your own note can be changed. The server enforces it too. */
  const owns = useCallback(
    (id: string) => notes.some((note) => note.id === id && note.mine),
    [notes],
  );

  const updateNote = (id: string, patch: Partial<Note>) => {
    if (!owns(id)) return;
    // Text coalesces so a sentence is one step; anything else is deliberate.
    record(!('text' in patch));
    if (typeof patch.text === 'string') {
      const check = checkProfanity(patch.text);
      if (!check.clean) {
        setNotice('Please keep it clean — that word is not allowed on the board.');
        return;
      }
    }
    setNotes((prev) => prev.map((note) => (note.id === id ? { ...note, ...patch } : note)));
    pushNote(id);
  };

  useEffect(() => {
    notesRef.current = notes;
  }, [notes]);

  useEffect(() => {
    menuOpenRef.current = menu !== null;
  }, [menu]);

  useEffect(() => {
    if (!selectedId) setMenu(null);
  }, [selectedId]);

  // If the bar goes away for any reason, its dropdowns go with it.
  useEffect(() => {
    if (!barOpen) setMenu(null);
  }, [barOpen]);

  const deleteNote = (id: string) => {
    if (!owns(id)) return;
    record(true);
    setNotes((prev) => prev.filter((note) => note.id !== id));
    if (selectedId === id) setSelectedId(null);
    if (editingId === id) setEditingId(null);
    void destroyNote(id).catch(() => setNotice('Could not reach the board — it may reappear.'));
  };

  /**
   * Patch just the formatting of the selected note.
   *
   * This merges inside the state updater rather than against the `selected`
   * captured at render. Building the patch from that snapshot meant two quick
   * clicks — bold then italic — both started from the same pre-bold style, and
   * the second silently threw the first away.
   */
  /**
   * Formatting applies to the SELECTION when there is one, and to the whole
   * note otherwise — the same rule a word processor follows. `applyToSelection`
   * reports whether it found a live selection to work on.
   */
  const formatSelection = (command: string, value?: string): boolean =>
    hasSelection() && applyToSelection(command, value);

  const styleNote = (patch: Partial<NoteStyle>) => {
    const id = selectedId;
    if (!id) return;
    record(true);
    setNotes((prev) =>
      prev.map((note) =>
        note.id === id
          ? { ...note, style: { ...(note.style ?? DEFAULT_STYLE), ...patch } }
          : note,
      ),
    );
    pushNote(id);
  };

  /** Open a dropdown under its trigger, or close it if it is already open. */
  const toggleMenu = (id: MenuId, event: React.MouseEvent<HTMLElement>) => {
    const trigger = event.currentTarget.getBoundingClientRect();
    const bar = headerRef.current?.getBoundingClientRect();
    setMenu((current) =>
      current?.id === id ? null : { id, x: Math.max(8, trigger.left - (bar?.left ?? 0)) },
    );
  };

  /** Rewrite the selected note's text through one of the list transforms. */
  const transformText = (transform: (text: string) => string) => {
    const id = selectedId;
    if (!id || !owns(id)) return;
    record(true);
    setNotes((prev) =>
      prev.map((note) => {
        if (note.id !== id) return note;
        // Lists and sorting are line operations, so they run on the words and
        // the result is re-wrapped as markup. Inline formatting inside those
        // lines is not preserved — a reordered list cannot keep spans that
        // straddled the old order.
        const plain = htmlToPlainText(note.text);
        return { ...note, text: plainTextToHtml(transform(plain)) };
      }),
    );
    pushNote(id);
  };

  const insertSymbol = (symbol: string) => {
    const id = selectedId;
    if (!id) return;
    record(true);
    // Same reason as styleNote: append to the newest text, not a stale copy,
    // or clicking two symbols quickly only keeps the second.
    setNotes((prev) =>
      prev.map((note) => (note.id === id ? { ...note, text: note.text + symbol } : note)),
    );
    pushNote(id);
  };

  /**
   * Move the board to a given version of your note. The three cases —
   * changed, gone, back again — are exactly create, patch and delete.
   */
  const applyVersion = useCallback((target: Note | null) => {
    const current = currentMine();

    if (target && current) {
      setNotes((prev) => prev.map((note) => (note.id === target.id ? target : note)));
      void saveNote(target.id, target).catch(() => setNotice('Could not reach the board.'));
      return;
    }
    if (target && !current) {
      // Undoing a delete. The board has room because you have none right now.
      setNotes((prev) => [...prev, target]);
      void createNoteOnBoard(target).catch(() => {
        setNotes((prev) => prev.filter((note) => note.id !== target.id));
        setNotice('Could not put that note back.');
      });
      return;
    }
    if (!target && current) {
      setNotes((prev) => prev.filter((note) => note.id !== current.id));
      void destroyNote(current.id).catch(() => setNotice('Could not reach the board.'));
      setSelectedId(null);
      setEditingId(null);
    }
  }, [currentMine]);

  const undo = useCallback(() => {
    const previous = past.current.pop();
    if (previous === undefined) return;
    const current = currentMine();
    future.current.push(current ? { ...current } : null);
    applyVersion(previous);
    setCanUndo(past.current.length > 0);
    setCanRedo(true);
    // A fresh edit after an undo must not merge into the pre-undo entry.
    lastRecordedAt.current = 0;
  }, [applyVersion, currentMine]);

  const redo = useCallback(() => {
    const next = future.current.pop();
    if (next === undefined) return;
    const current = currentMine();
    past.current.push(current ? { ...current } : null);
    applyVersion(next);
    setCanRedo(future.current.length > 0);
    setCanUndo(true);
    lastRecordedAt.current = 0;
  }, [applyVersion, currentMine]);

  /* ---- Keyboard ----------------------------------------------------------- */

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const meta = event.ctrlKey || event.metaKey;
      const target = event.target as HTMLElement | null;
      const typing =
        !!editingId ||
        (target && (['INPUT', 'TEXTAREA'].includes(target.tagName) || target.isContentEditable));
      // Undo and redo work while typing; every other shortcut does not.
      if (typing && !meta) return;

      // Ctrl/Cmd-Z undoes, Ctrl-Y or Ctrl-Shift-Z redoes. These fire even
      // while the editor has focus, which is why they are checked first.
      if (meta && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
        return;
      }
      if (meta && event.key.toLowerCase() === 'y') {
        event.preventDefault();
        redo();
        return;
      }

      if ((event.key === 'Delete' || event.key === 'Backspace') && selectedId) {
        event.preventDefault();
        deleteNote(selectedId);
      }
      if (typing) return;
      if (event.key === 'v') setTool('select');
      if (event.key === 'd') setTool('draw');
      if (event.key === 'e') setTool('erase');
      if (event.key === 'n') addNote();
      if (event.key === '0') setView({ x: 0, y: 0, scale: 1 });
      if (event.key === 'f') fitAll();
      if (event.key === 'm' && myNote) {
        focusOn(myNote);
        setSelectedId(myNote.id);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  /* ---- Render ------------------------------------------------------------- */

  const gridSize = 32 * view.scale;

  /** Below this the sheet is too small to interact with, so draw it cheaply. */
  const lite = view.scale < 0.5;

  /**
   * Only notes near the viewport are mounted. A board with hundreds of notes
   * would otherwise keep hundreds of components — each with its own springs and
   * pointer handlers — alive and re-rendering off-screen, which is where the
   * lag came from. The margin keeps a screen's worth ready on every side so
   * panning never shows a gap.
   */
  const visibleNotes = useMemo(() => {
    const container = containerRef.current;
    const width = container?.clientWidth ?? 1920;
    const height = container?.clientHeight ?? 1080;
    const margin = 400;

    const left = (-view.x - margin) / view.scale;
    const top = (-view.y - margin) / view.scale;
    const right = (-view.x + width + margin) / view.scale;
    const bottom = (-view.y + height + margin) / view.scale;

    return notes.filter(
      (note) =>
        note.x + note.width >= left &&
        note.x <= right &&
        note.y + note.height >= top &&
        note.y <= bottom,
    );
  }, [notes, view]);

  /** Bounds of everything, for the minimap. */
  const bounds = useMemo(() => {
    if (notes.length === 0) return null;
    const minX = Math.min(...notes.map((n) => n.x));
    const minY = Math.min(...notes.map((n) => n.y));
    const maxX = Math.max(...notes.map((n) => n.x + n.width));
    const maxY = Math.max(...notes.map((n) => n.y + n.height));
    return { minX, minY, maxX, maxY, width: Math.max(1, maxX - minX), height: Math.max(1, maxY - minY) };
  }, [notes]);

  return (
    <div className="fixed inset-0 overflow-hidden bg-[#101014]">
      <AnimatePresence>
        {barOpen && (
          <motion.header
            initial={{ y: '-100%' }}
            animate={{ y: 0 }}
            exit={{ y: '-100%' }}
            transition={{ type: 'spring', stiffness: 420, damping: 36 }}
            ref={headerRef}
            className="absolute inset-x-0 top-0 z-50 border-b border-white/[0.08] bg-[#15151a]/95 shadow-[0_10px_40px_-12px_rgba(0,0,0,0.9)] backdrop-blur-xl"
          >
            {/* ---- Always-on row: what you can do to the board ---- */}
            <div className="flex items-stretch gap-0 overflow-x-auto px-3 py-2.5">
              <div className="flex shrink-0 flex-col items-center justify-center gap-1.5 pr-3">
                <Link
                  href="/"
                  title="Back to the portfolio"
                  className="inline-flex h-8 items-center rounded-md px-2.5 text-sm text-muted transition-colors hover:bg-white/10 hover:text-fg"
                >
                  ← Portfolio
                </Link>
                <span className="text-[0.58rem] font-medium uppercase tracking-[0.16em] text-faint">
                  Leave
                </span>
              </div>

              <span className="my-1 w-px shrink-0 self-stretch bg-white/[0.09]" />

              <Group label="Tools">
                {(
                  [
                    ['select', 'Move', 'V', 'move'],
                    ['draw', 'Draw', 'D', 'pen'],
                    ['erase', 'Erase', 'E', 'eraser'],
                  ] as const
                ).map(([value, label, key, icon]) => (
                  <Btn
                    key={value}
                    active={tool === value}
                    onClick={() => setTool(value)}
                    title={`${label} — shortcut ${key}`}
                  >
                    <Icon name={icon} />
                    {label}
                  </Btn>
                ))}
              </Group>

              <span className="my-1 w-px shrink-0 self-stretch bg-white/[0.09]" />

              <Group label="Board">
                <Btn onClick={addNote} title="Add a note — shortcut N" className="bg-white/[0.09]">
                  <Icon name="plus" />
                  Note
                </Btn>
              </Group>

              <span className="my-1 w-px shrink-0 self-stretch bg-white/[0.09]" />

              <Group label="History">
                <Btn
                  square
                  onClick={undo}
                  title="Undo — Ctrl+Z"
                  className={canUndo ? '' : 'pointer-events-none opacity-30'}
                >
                  <Icon name="undo" />
                </Btn>
                <Btn
                  square
                  onClick={redo}
                  title="Redo — Ctrl+Y or Ctrl+Shift+Z"
                  className={canRedo ? '' : 'pointer-events-none opacity-30'}
                >
                  <Icon name="redo" />
                </Btn>
              </Group>

              {(tool === 'draw' || tool === 'erase') && (
                <>
                  <span className="my-1 w-px shrink-0 self-stretch bg-white/[0.09]" />
                  <Group label="Pen">
                    {PEN_COLORS.map((color) => (
                      <Swatch
                        key={color}
                        color={color}
                        round
                        active={penColor === color}
                        title={`Pen colour ${color}`}
                        onClick={() => setPenColor(color)}
                      />
                    ))}
                    <input
                      type="range"
                      min={1}
                      max={12}
                      value={penWidth}
                      onChange={(event) => setPenWidth(Number(event.target.value))}
                      className="ml-1 w-20 accent-[var(--accent)]"
                      title="Pen thickness"
                      aria-label="Pen thickness"
                    />
                  </Group>
                </>
              )}

              <span className="my-1 w-px shrink-0 self-stretch bg-white/[0.09]" />

              <Group label="View">
                <Btn square onClick={() => zoomBy(1 / ZOOM.step)} title="Zoom out">
                  <Icon name="minus" />
                </Btn>
                <span className="w-12 text-center text-[0.8125rem] font-medium tabular-nums text-white/60">
                  {Math.round(view.scale * 100)}%
                </span>
                <Btn square onClick={() => zoomBy(ZOOM.step)} title="Zoom in">
                  <Icon name="plus" />
                </Btn>
                <Btn square onClick={() => setView({ x: 0, y: 0, scale: 1 })} title="Reset the view — shortcut 0">
                  <Icon name="reset" />
                </Btn>
                <Btn onClick={fitAll} title="Fit every note on screen — shortcut F">
                  Fit all
                </Btn>
                {myNote && (
                  <Btn
                    onClick={() => {
                      focusOn(myNote);
                      setSelectedId(myNote.id);
                    }}
                    title="Jump to your note — shortcut M"
                  >
                    My note
                  </Btn>
                )}
              </Group>

              <div className="ml-auto flex shrink-0 flex-col items-center gap-1.5 pl-3">
                <div className="flex items-center gap-1">
                  <span
                    className="flex h-8 items-center gap-1.5 rounded-lg bg-white/[0.05] px-2.5 text-[0.8125rem] font-medium tabular-nums text-white/60"
                    title={`${notes.length} notes on the board · ${NOTES_PER_PERSON} per person`}
                  >
                    <Icon name="note" className="opacity-60" />
                    {notes.length}
                  </span>
                  <Btn
                    square
                    active={pinned}
                    onClick={() => setPinned((value) => !value)}
                    title={pinned ? 'Unpin the toolbar so it hides again' : 'Pin the toolbar open'}
                  >
                    <Icon name="pin" />
                  </Btn>
                </div>
                <span className="text-[0.55rem] font-semibold uppercase tracking-[0.18em] text-white/30">
                  Board
                </span>
              </div>
            </div>

            {/* ---- Contextual row: only what applies to the selected note ---- */}
            {selected && (
              <div className="flex items-stretch gap-0 overflow-x-auto border-t border-white/[0.07] bg-gradient-to-b from-accent/[0.08] to-transparent px-3 py-2.5">
                <div className="hidden shrink-0 items-center pr-2 xl:flex">
                  <span className="whitespace-nowrap rounded-md bg-accent/20 px-2 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.16em] text-accent">
                    Note
                  </span>
                </div>

                <Group label="Paper">
                  <PickerButton
                    swatch={selected.color}
                    caption="Paper"
                    open={menu?.id === 'paper'}
                    title="Paper colour"
                    onClick={(event) => toggleMenu('paper', event)}
                  />
                </Group>

                <span className="my-1 w-px shrink-0 self-stretch bg-white/[0.09]" />

                <Group label="Font">
                  <button
                    type="button"
                    onClick={(event) => toggleMenu('font', event)}
                    title="Typeface"
                    className={`inline-flex h-8 w-[6.5rem] shrink-0 items-center justify-between gap-1 rounded-lg px-2 text-[0.9rem] transition-all duration-150 ${
                      menu?.id === 'font' ? 'bg-white/[0.14] text-fg' : 'text-fg/85 hover:bg-white/[0.09]'
                    }`}
                    style={{ fontFamily: FONTS[style.font].stack }}
                  >
                    <span className="truncate">{FONTS[style.font].label}</span>
                    <Icon
                      name="chevron"
                      className={`h-3 w-3 shrink-0 opacity-50 transition-transform ${menu?.id === 'font' ? 'rotate-180' : ''}`}
                    />
                  </button>
                  <Btn
                    square
                    onClick={() => styleNote({ size: Math.max(TEXT_SIZE.min, style.size - TEXT_SIZE.step) })}
                    title="Smaller text"
                  >
                    A−
                  </Btn>
                  <span className="w-6 text-center text-sm tabular-nums text-muted">{style.size}</span>
                  <Btn
                    square
                    onClick={() => styleNote({ size: Math.min(TEXT_SIZE.max, style.size + TEXT_SIZE.step) })}
                    title="Larger text"
                  >
                    A+
                  </Btn>
                </Group>

                <span className="my-1 w-px shrink-0 self-stretch bg-white/[0.09]" />

                <Group label="Style">
                  <Btn
                    square
                    active={style.bold}
                    onClick={() => {
                      if (!formatSelection('bold')) styleNote({ bold: !style.bold });
                    }}
                    title="Bold — the selected words, or the whole note"
                  >
                    <span className="font-bold">B</span>
                  </Btn>
                  <Btn
                    square
                    active={style.italic}
                    onClick={() => {
                      if (!formatSelection('italic')) styleNote({ italic: !style.italic });
                    }}
                    title="Italic — the selected words, or the whole note"
                  >
                    <span className="italic">I</span>
                  </Btn>
                  <Btn
                    square
                    active={style.underline}
                    onClick={() => {
                      if (!formatSelection('underline')) styleNote({ underline: !style.underline });
                    }}
                    title="Underline — the selected words, or the whole note"
                  >
                    <span className="underline">U</span>
                  </Btn>
                </Group>

                <span className="my-1 w-px shrink-0 self-stretch bg-white/[0.09]" />

                <Group label="Paragraph">
                  <Btn
                    active={menu?.id === 'paragraph'}
                    onClick={(event) => toggleMenu('paragraph', event)}
                    title="Lists, indent, alignment and spacing"
                  >
                    <span className="text-base leading-none">¶</span>
                    <Icon
                      name="chevron"
                      className={`h-3 w-3 opacity-50 transition-transform ${menu?.id === 'paragraph' ? 'rotate-180' : ''}`}
                    />
                  </Btn>
                </Group>

                <span className="my-1 w-px shrink-0 self-stretch bg-white/[0.09]" />

                <Group label="Colour">
                  <PickerButton
                    swatch={style.color}
                    caption="Ink"
                    open={menu?.id === 'ink'}
                    title="Ink colour"
                    onClick={(event) => toggleMenu('ink', event)}
                  />
                  <PickerButton
                    swatch={style.highlight}
                    caption="Marker"
                    open={menu?.id === 'marker'}
                    title="Highlighter"
                    onClick={(event) => toggleMenu('marker', event)}
                  />
                </Group>

                <span className="my-1 w-px shrink-0 self-stretch bg-white/[0.09]" />

                <Group label="Insert">
                  <Btn active={menu?.id === 'symbol'} onClick={(event) => toggleMenu('symbol', event)} title="Insert a symbol">
                    ★
                    <Icon
                      name="chevron"
                      className={`h-3 w-3 opacity-50 transition-transform ${menu?.id === 'symbol' ? 'rotate-180' : ''}`}
                    />
                  </Btn>
                </Group>

                <span className="my-1 w-px shrink-0 self-stretch bg-white/[0.09]" />

                <Group label="Arrange">
                  <Btn square onClick={() => bringToFront(selected.id)} title="Bring to front">
                    <Icon name="front" />
                  </Btn>
                  <Btn square onClick={() => sendToBack(selected.id)} title="Send to back">
                    <Icon name="back" />
                  </Btn>
                </Group>

                <span className="my-1 w-px shrink-0 self-stretch bg-white/[0.09]" />

                <Group label="Note">
                  <Btn onClick={() => setEditingId(selected.id)} title="Edit the text">
                    <Icon name="pen" />
                    Edit
                  </Btn>
                  <Btn onClick={() => updateNote(selected.id, { strokes: [] })} title="Remove all drawing">
                    <Icon name="eraser" />
                    Clear
                  </Btn>
                  <Btn square danger onClick={() => deleteNote(selected.id)} title="Delete this note — shortcut Delete">
                    <Icon name="trash" />
                  </Btn>
                </Group>
              </div>
            )}

            {/* ---- Dropdown panels ---------------------------------------
              Siblings of the scrolling row, positioned under their trigger, so
              the row's overflow never clips them. */}
            {selected && menu && (
              <>
                <button
                  type="button"
                  aria-label="Close menu"
                  className="fixed inset-0 z-40 cursor-default"
                  onClick={() => setMenu(null)}
                />
                <div
                  className="absolute top-full z-50 mt-2 rounded-xl border border-white/[0.12] bg-[#1b1b21] p-2.5 shadow-[0_20px_60px_-12px_rgba(0,0,0,0.95)]"
                  style={{ left: menu.x }}
                >
                  {menu.id === 'paper' && (
                    <div className="grid w-52 grid-cols-4 gap-1.5">
                      {PALETTE.map((entry) => (
                        <Swatch
                          key={entry.bg}
                          color={entry.bg}
                          active={selected.color === entry.bg}
                          title={entry.name}
                          onClick={() => {
                            updateNote(selected.id, { color: entry.bg });
                            setMenu(null);
                          }}
                        />
                      ))}
                    </div>
                  )}

                  {menu.id === 'ink' && (
                    <div className="w-44">
                      <Btn
                        active={style.color === null}
                        onClick={() => {
                          styleNote({ color: null });
                          setMenu(null);
                        }}
                        title="Ink that suits the paper"
                        className="mb-1.5 w-full"
                      >
                        Auto
                      </Btn>
                      <div className="grid grid-cols-6 gap-1.5">
                        {INK_COLORS.map((ink) => (
                          <Swatch
                            key={ink}
                            color={ink}
                            round
                            active={style.color === ink}
                            title={`Ink ${ink}`}
                            onClick={() => {
                              if (!formatSelection('foreColor', ink)) styleNote({ color: ink });
                              setMenu(null);
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {menu.id === 'marker' && (
                    <div className="w-40">
                      <Btn
                        active={style.highlight === null}
                        onClick={() => {
                          styleNote({ highlight: null });
                          setMenu(null);
                        }}
                        title="No highlight"
                        className="mb-1.5 w-full"
                      >
                        Off
                      </Btn>
                      <div className="grid grid-cols-5 gap-1.5">
                        {HIGHLIGHT_COLORS.map((hue) => (
                          <Swatch
                            key={hue}
                            color={hue}
                            active={style.highlight === hue}
                            title={`Highlight ${hue}`}
                            onClick={() => {
                              if (!formatSelection('hiliteColor', hue)) styleNote({ highlight: hue });
                              setMenu(null);
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {menu.id === 'font' && (
                    <div className="w-56">
                      {(Object.keys(FONTS) as FontKey[]).map((key) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => {
                            if (!formatSelection('fontName', FONTS[key].family)) styleNote({ font: key });
                            setMenu(null);
                          }}
                          title={FONTS[key].label}
                          className={`flex w-full items-baseline justify-between gap-3 rounded-lg px-2.5 py-2 text-left transition-colors ${
                            style.font === key ? 'bg-white/[0.14]' : 'hover:bg-white/[0.08]'
                          }`}
                        >
                          {/* Each row is set in its own face — the point is to
                              see the typeface before choosing it. */}
                          <span className="text-[1.05rem] text-fg" style={{ fontFamily: FONTS[key].stack }}>
                            {FONTS[key].label}
                          </span>
                          <span
                            className="shrink-0 text-[1.05rem] text-white/45"
                            style={{ fontFamily: FONTS[key].stack }}
                          >
                            Aa Bb 123
                          </span>
                        </button>
                      ))}
                    </div>
                  )}

                  {menu.id === 'paragraph' && (
                    <div className="w-72 space-y-3">
                      <div>
                        <p className="mb-1.5 px-0.5 text-[0.55rem] font-semibold uppercase tracking-[0.18em] text-white/30">
                          Lists
                        </p>
                        <div className="flex items-center gap-1">
                          <Btn
                            active={isBulleted(selected.text)}
                            onClick={() => transformText(toggleBullets)}
                            title="Bulleted list"
                          >
                            <svg viewBox="0 0 16 16" width="16" height="16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden>
                              <path d="M6 4.5h7M6 8h7M6 11.5h7" />
                              <circle cx="3" cy="4.5" r="1" fill="currentColor" stroke="none" />
                              <circle cx="3" cy="8" r="1" fill="currentColor" stroke="none" />
                              <circle cx="3" cy="11.5" r="1" fill="currentColor" stroke="none" />
                            </svg>
                            Bullets
                          </Btn>
                          <Btn
                            active={isNumbered(selected.text)}
                            onClick={() => transformText(toggleNumbers)}
                            title="Numbered list"
                          >
                            <svg viewBox="0 0 16 16" width="16" height="16" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" aria-hidden>
                              <path d="M6.5 4.5h7M6.5 8h7M6.5 11.5h7M2 3.4h1v2.2M2 11h1.4L2 12.6h1.4" />
                            </svg>
                            Numbers
                          </Btn>
                          <Btn onClick={() => transformText(sortLines)} title="Sort lines A to Z">
                            <svg viewBox="0 0 16 16" width="16" height="16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                              <path d="M3 3.5v9M1.4 10.6 3 12.5l1.6-1.9M7 4.5h7M7 8h5M7 11.5h3" />
                            </svg>
                            A→Z
                          </Btn>
                        </div>
                      </div>

                      <div>
                        <p className="mb-1.5 px-0.5 text-[0.55rem] font-semibold uppercase tracking-[0.18em] text-white/30">
                          Indent
                        </p>
                        <div className="flex items-center gap-1">
                          <Btn square onClick={() => transformText(outdent)} title="Decrease indent">
                            <svg viewBox="0 0 16 16" width="16" height="16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                              <path d="M7 4.5h7M7 11.5h7M2 8h12M5 5.5 2.5 8 5 10.5" />
                            </svg>
                          </Btn>
                          <Btn square onClick={() => transformText(indent)} title="Increase indent">
                            <svg viewBox="0 0 16 16" width="16" height="16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                              <path d="M7 4.5h7M7 11.5h7M2 8h12M11 5.5 13.5 8 11 10.5" />
                            </svg>
                          </Btn>
                        </div>
                      </div>

                      <div>
                        <p className="mb-1.5 px-0.5 text-[0.55rem] font-semibold uppercase tracking-[0.18em] text-white/30">
                          Alignment
                        </p>
                        <div className="flex items-center gap-1">
                          {(
                            [
                              ['left', 'Align left', 'M3 4.5h10M3 8h6.5M3 11.5h8.5'],
                              ['center', 'Align centre', 'M3 4.5h10M4.8 8h6.4M3.8 11.5h8.4'],
                              ['right', 'Align right', 'M3 4.5h10M6.5 8h6.5M4.5 11.5h8.5'],
                              ['justify', 'Justify', 'M3 4.5h10M3 8h10M3 11.5h10'],
                            ] as const
                          ).map(([value, label, path]) => (
                            <Btn
                              key={value}
                              square
                              active={style.align === value}
                              onClick={() => styleNote({ align: value })}
                              title={label}
                            >
                              <svg viewBox="0 0 16 16" width="16" height="16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden>
                                <path d={path} />
                              </svg>
                            </Btn>
                          ))}
                        </div>
                      </div>

                      <div>
                        <p className="mb-1.5 px-0.5 text-[0.55rem] font-semibold uppercase tracking-[0.18em] text-white/30">
                          Line spacing
                        </p>
                        <div className="flex items-center gap-1">
                          {LINE_HEIGHTS.map((option) => (
                            <Btn
                              key={option.value}
                              active={(style.lineHeight ?? 1.3) === option.value}
                              onClick={() => styleNote({ lineHeight: option.value })}
                              title={`${option.label} line spacing`}
                            >
                              {option.label}
                            </Btn>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {menu.id === 'symbol' && (
                    <div className="w-64">
                      <div className="grid grid-cols-8 gap-1">
                        {SYMBOLS.map((symbol) => (
                          <button
                            key={symbol}
                            type="button"
                            onClick={() => insertSymbol(symbol)}
                            title={`Insert ${symbol}`}
                            className="flex h-7 items-center justify-center rounded text-fg transition-colors hover:bg-white/15"
                          >
                            {symbol}
                          </button>
                        ))}
                      </div>
                      <p className="mt-2 border-t border-white/10 pt-2 text-center text-2xs text-faint">
                        Added to the end of the note
                      </p>
                    </div>
                  )}
                </div>
              </>
            )}
          </motion.header>
        )}
      </AnimatePresence>

      {/* A sliver of a handle, so the hidden bar is discoverable. */}
      {!barOpen && (
        <div className="absolute inset-x-0 top-0 z-40 flex justify-center">
          <button
            type="button"
            onClick={() => setBarOpen(true)}
            title="Show the toolbar"
            className="group mt-1.5 flex items-center gap-1.5 rounded-full border border-white/10 bg-[#15151a]/85 px-3 py-1 text-[0.7rem] font-medium text-white/45 shadow-lg backdrop-blur transition-colors hover:border-white/20 hover:text-white/80"
          >
            <span className="h-1 w-8 rounded-full bg-current opacity-40 transition-opacity group-hover:opacity-70" />
            Toolbar
          </button>
        </div>
      )}

      {/* ---- The canvas ---- */}
      <div
        ref={containerRef}
        onPointerDown={onBackgroundPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endPointer}
        onPointerCancel={endPointer}
        className="absolute inset-0 touch-none"
        style={{
          cursor: tool === 'select' ? 'grab' : 'crosshair',
          // Dot grid, scaled with the zoom so it reads as one surface.
          backgroundColor: '#101014',
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.14) 1px, transparent 1px)',
          backgroundSize: `${gridSize}px ${gridSize}px`,
          backgroundPosition: `${view.x}px ${view.y}px`,
        }}
      >
        <div
          className="absolute left-0 top-0 origin-top-left"
          style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})` }}
        >
          {lite
            ? visibleNotes.map((note: Note) => <LiteNote key={note.id} note={note} />)
            : visibleNotes.map((note: Note) => (
            <div
              key={note.id}
              onPointerDown={(event) => onNotePointerDown(event, note)}
              className="absolute left-0 top-0"
            >
              <StickyNote
                note={note}
                selected={selectedId === note.id}
                editing={editingId === note.id}
                tool={tool}
                scale={view.scale}
                penColor={penColor}
                penWidth={penWidth}
                onSelect={selectNote}
                onChange={updateNote}
                onStartEditing={setEditingId}
                onStopEditing={stopEditing}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Empty state */}
      {ready && notes.length === 0 && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] px-10 py-8 text-center backdrop-blur-sm">
            <p className="font-hand text-4xl text-white/55">No feedback yet</p>
            <p className="mt-3 text-sm text-white/40">
              Press <kbd className="rounded-md border border-white/10 bg-white/[0.08] px-1.5 py-0.5 font-mono text-xs text-white/70">N</kbd>{' '}
              to leave the first note
            </p>
          </div>
        </div>
      )}

      {offline && (
        <div className="pointer-events-none absolute left-1/2 top-4 z-40 -translate-x-1/2">
          <p className="rounded-full border border-[#ff9683]/30 bg-[#2a1512]/90 px-4 py-1.5 text-xs text-[#ff9683] backdrop-blur">
            Cannot reach the board — changes are not being saved
          </p>
        </div>
      )}

      {/* ---- Minimap ------------------------------------------------------
        Once the board runs past the edges of the screen, panning blind is
        hopeless. This shows every note at once, where you are looking, and
        takes a click to go anywhere. */}
      {bounds && notes.length > 1 && (
        <div className="absolute bottom-16 right-4 z-40">
          {minimapOpen ? (
            <div className="rounded-xl border border-white/[0.12] bg-[#15151a]/95 p-2 shadow-[0_16px_48px_-12px_rgba(0,0,0,0.9)] backdrop-blur">
              <div className="mb-1.5 flex items-center justify-between px-0.5">
                <span className="text-[0.55rem] font-semibold uppercase tracking-[0.18em] text-white/30">
                  Board
                </span>
                <button
                  type="button"
                  onClick={() => setMinimapOpen(false)}
                  title="Hide the minimap"
                  className="text-white/35 transition-colors hover:text-white/70"
                >
                  <Icon name="chevron" className="h-3.5 w-3.5" />
                </button>
              </div>

              <button
                type="button"
                onClick={(event) => {
                  // Click anywhere on the map to centre the view there.
                  const map = event.currentTarget.getBoundingClientRect();
                  const fx = (event.clientX - map.left) / map.width;
                  const fy = (event.clientY - map.top) / map.height;
                  const container = containerRef.current?.getBoundingClientRect();
                  setView((prev) => ({
                    ...prev,
                    x: (container?.width ?? 0) / 2 - (bounds.minX + fx * bounds.width) * prev.scale,
                    y: (container?.height ?? 0) / 2 - (bounds.minY + fy * bounds.height) * prev.scale,
                  }));
                }}
                title="Click to jump there"
                className="relative block h-28 w-44 overflow-hidden rounded-lg border border-white/10 bg-black/40"
              >
                {notes.map((note: Note) => (
                  <span
                    key={note.id}
                    className={`absolute rounded-[1px] ${note.mine ? 'ring-1 ring-white' : ''}`}
                    style={{
                      left: `${((note.x - bounds.minX) / bounds.width) * 100}%`,
                      top: `${((note.y - bounds.minY) / bounds.height) * 100}%`,
                      width: `${Math.max(1.5, (note.width / bounds.width) * 100)}%`,
                      height: `${Math.max(1.5, (note.height / bounds.height) * 100)}%`,
                      backgroundColor: note.color,
                      opacity: note.mine ? 1 : 0.65,
                    }}
                  />
                ))}

                {/* Where you are looking right now. */}
                <span
                  className="absolute border border-accent bg-accent/10"
                  style={{
                    left: `${((-view.x / view.scale - bounds.minX) / bounds.width) * 100}%`,
                    top: `${((-view.y / view.scale - bounds.minY) / bounds.height) * 100}%`,
                    width: `${(((containerRef.current?.clientWidth ?? 0) / view.scale) / bounds.width) * 100}%`,
                    height: `${(((containerRef.current?.clientHeight ?? 0) / view.scale) / bounds.height) * 100}%`,
                  }}
                />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setMinimapOpen(true)}
              title="Show the minimap"
              className="flex items-center gap-1.5 rounded-full border border-white/10 bg-[#15151a]/90 px-3 py-1.5 text-xs text-white/50 shadow-lg backdrop-blur transition-colors hover:text-white/85"
            >
              <Icon name="note" className="h-3.5 w-3.5" />
              Map
            </button>
          )}
        </div>
      )}

      {/* Hint + notices */}
      <div className="pointer-events-none absolute inset-x-0 bottom-4 flex flex-col items-center gap-2 px-4">
        <AnimatePresence>
          {notice && (
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-bg shadow-[0_8px_24px_-6px_rgba(232,184,75,0.6)]"
            >
              {notice}
            </motion.p>
          )}
        </AnimatePresence>
        <p className="rounded-full border border-white/[0.07] bg-black/45 px-4 py-1.5 text-xs text-white/40 backdrop-blur">
          {coarsePointer
            ? 'Drag to pan · pinch to zoom · tap a note, then Edit to write · everyone sees this board'
            : 'Pointer to the top for the toolbar · scroll to zoom · drag to pan · double-click your note to write · F fits the board · everyone sees this board'}
        </p>
      </div>
    </div>
  );
}
