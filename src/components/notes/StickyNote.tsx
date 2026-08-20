'use client';

import { memo, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import {
  motion,
  useMotionTemplate,
  useReducedMotion,
  useSpring,
  useTransform,
} from 'framer-motion';

import {
  DEFAULT_STYLE,
  FONTS,
  PALETTE,
  clampSize,
  type Note,
  type Point,
  type Stroke,
} from '@/lib/notes';
import { looksLikeHtml, plainTextToHtml, sanitiseHtml } from '@/lib/richText';
import { registerEditor, unregisterEditor } from '@/lib/selection';

export type Tool = 'select' | 'draw' | 'erase';

interface StickyNoteProps {
  note: Note;
  selected: boolean;
  editing: boolean;
  tool: Tool;
  /** Canvas zoom, needed to convert screen pixels into world units. */
  scale: number;
  penColor: string;
  penWidth: number;
  /**
   * These take the note id rather than closing over it, so the canvas can pass
   * the SAME function to every note. Fresh closures per note would defeat the
   * memo below and re-render the whole board on every change.
   */
  onSelect: (id: string) => void;
  onChange: (id: string, patch: Partial<Note>) => void;
  onStartEditing: (id: string) => void;
  onStopEditing: () => void;
}

/** How far the sheet tips away from the cursor, in degrees. */
const MAX_TILT = 15;

/** Corner fold, at rest and while the cursor is on the sheet. */
const FOLD = { rest: 20, lifted: 34 } as const;

/**
 * Loose and underdamped on purpose. Paper does not glide into place — it
 * overshoots and settles, and that wobble is the whole effect.
 */
const PAPER_SPRING = { stiffness: 170, damping: 11, mass: 0.9 } as const;
const FOLD_SPRING = { stiffness: 220, damping: 20, mass: 0.6 } as const;

function tintFor(color: string) {
  return PALETTE.find((entry) => entry.bg === color) ?? PALETTE[0];
}

/** A stroke as an SVG path. Quadratic midpoints keep the line smooth. */
function strokePath(points: readonly Point[]): string {
  if (points.length === 0) return '';
  const first = points[0] as Point;
  if (points.length === 1) return `M ${first.x} ${first.y} l 0.01 0`;

  let d = `M ${first.x} ${first.y}`;
  for (let i = 1; i < points.length - 1; i++) {
    const current = points[i] as Point;
    const next = points[i + 1] as Point;
    d += ` Q ${current.x} ${current.y} ${(current.x + next.x) / 2} ${(current.y + next.y) / 2}`;
  }
  const last = points[points.length - 1] as Point;
  d += ` L ${last.x} ${last.y}`;
  return d;
}

function StickyNoteImpl({
  note,
  selected,
  editing,
  tool,
  scale,
  penColor,
  penWidth,
  onSelect,
  onChange,
  onStartEditing,
  onStopEditing,
}: StickyNoteProps) {
  const reduceMotion = useReducedMotion();
  const tint = tintFor(note.color);
  const style = note.style ?? DEFAULT_STYLE;

  /** Everything the text carries, shared by the display and edit states. */
  const textStyle = {
    fontFamily: FONTS[style.font].stack,
    fontSize: style.size,
    fontWeight: style.bold ? 700 : 400,
    fontStyle: style.italic ? 'italic' : 'normal',
    textDecoration: style.underline ? 'underline' : 'none',
    textAlign: style.align,
    color: style.color ?? tint.ink,
    lineHeight: style.lineHeight ?? 1.3,
  } as const;
  const sheetRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);

  /** Notes written before rich text hold plain strings; promote them once. */
  const bodyHtml = looksLikeHtml(note.text) ? note.text : plainTextToHtml(note.text);
  const [draft, setDraft] = useState<Stroke | null>(null);
  /** True when the body is taller than the sheet and is being clipped. */
  const [clipped, setClipped] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  /** Someone else's note: readable, never editable. */
  const readOnly = note.mine !== true;
  const drawingMode = !readOnly && (tool === 'draw' || tool === 'erase');
  /**
   * The 3D tilt is switched OFF while drawing. A perspective transform maps the
   * sheet non-linearly onto the screen, so `toLocal` — which assumes a flat
   * rotate + uniform zoom — would put strokes under the cursor by a few pixels
   * at the edges. Flat sheet, accurate pen.
   */
  /**
   * The paper physics run on EVERY note, including other people's. Being unable
   * to change a note is not a reason for it to feel dead under the cursor —
   * read-only blocks the edits, not the tilt and the corner lift.
   */
  const paperActive = !drawingMode && !editing && !reduceMotion;

  /* ---- Paper physics ------------------------------------------------------ */

  const tiltX = useSpring(0, PAPER_SPRING);
  const tiltY = useSpring(0, PAPER_SPRING);
  const lift = useSpring(0, FOLD_SPRING);
  const fold = useSpring(FOLD.rest, FOLD_SPRING);

  // The sheet is clipped where the corner folds back, so the fold is a real
  // cut rather than a triangle sitting on top of the paper.
  const clipPath = useMotionTemplate`polygon(0 0, 100% 0, 100% calc(100% - ${fold}px), calc(100% - ${fold}px) 100%, 0 100%)`;
  const shadow = useTransform(
    lift,
    [0, 1],
    ['0 10px 26px rgba(0,0,0,0.42)', '0 26px 46px rgba(0,0,0,0.55)'],
  );

  const handlePaperMove = (event: ReactPointerEvent) => {
    if (!paperActive) return;
    const rect = sheetRef.current?.getBoundingClientRect();
    if (!rect) return;
    // -1..1 from the centre of the sheet.
    const nx = (event.clientX - (rect.left + rect.width / 2)) / (rect.width / 2);
    const ny = (event.clientY - (rect.top + rect.height / 2)) / (rect.height / 2);
    // Tip away from the cursor, like a sheet pressed at that point.
    tiltY.set(Math.max(-1, Math.min(1, nx)) * MAX_TILT);
    tiltX.set(Math.max(-1, Math.min(1, -ny)) * MAX_TILT);
  };

  const handlePaperEnter = () => {
    if (!paperActive) return;
    lift.set(1);
    fold.set(FOLD.lifted);
  };

  const handlePaperLeave = () => {
    // Springs return to rest with a wobble — that overshoot is the flutter you
    // see when the cursor passes straight across a note.
    tiltX.set(0);
    tiltY.set(0);
    lift.set(0);
    fold.set(FOLD.rest);
  };

  // Drop the sheet flat the moment a tool takes over, so nothing is left tilted.
  useEffect(() => {
    if (!paperActive) {
      tiltX.set(0);
      tiltY.set(0);
      lift.set(0);
      fold.set(FOLD.rest);
    }
  }, [paperActive, tiltX, tiltY, lift, fold]);

  /**
   * The editor is UNCONTROLLED. Writing `innerHTML` on every keystroke would
   * destroy and rebuild the text nodes under the caret, so the cursor would
   * jump to the start on every character. The markup is therefore seeded once
   * when editing opens, and read back out on input.
   */
  /**
   * Text that runs past the bottom edge is clipped, not spilled — a note with
   * words hanging off it looks broken. Enlarging the note reveals more, which
   * is the natural way to ask for room.
   */
  useEffect(() => {
    const element = editing ? textRef.current : bodyRef.current;
    if (!element) {
      setClipped(false);
      return;
    }
    setClipped(element.scrollHeight > element.clientHeight + 2);
  }, [editing, note.text, note.width, note.height, style.size, style.lineHeight, style.font]);

  useEffect(() => {
    const element = textRef.current;
    if (!editing || !element) return;

    element.innerHTML = sanitiseHtml(bodyHtml);
    element.focus();

    // Put the caret at the end rather than the start.
    const range = document.createRange();
    range.selectNodeContents(element);
    range.collapse(false);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);

    registerEditor(element, (html) => onChange(note.id, { text: sanitiseHtml(html) }));
    return () => unregisterEditor(element);
    // Seeding must happen when editing opens, not when the text changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing, note.id]);

  /**
   * Screen point -> note-local point. The note is translated by the canvas and
   * rotated on its own centre, so both have to be undone: divide out the zoom,
   * then rotate backwards around the centre.
   */
  const toLocal = (clientX: number, clientY: number): Point => {
    const rect = sheetRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = (clientX - cx) / scale;
    const dy = (clientY - cy) / scale;
    const radians = (-note.rotation * Math.PI) / 180;
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);
    return {
      x: dx * cos - dy * sin + note.width / 2,
      y: dx * sin + dy * cos + note.height / 2,
    };
  };

  /* ---- Drawing ---------------------------------------------------------- */

  const handleDrawStart = (event: ReactPointerEvent) => {
    if (readOnly || !drawingMode) return;
    event.stopPropagation();
    event.preventDefault();
    onSelect(note.id);

    if (tool === 'erase') {
      eraseAt(event.clientX, event.clientY);
    } else {
      setDraft({
        color: penColor,
        width: penWidth,
        points: [toLocal(event.clientX, event.clientY)],
      });
    }

    // Last, and guarded. Capture only improves the stroke when the pointer
    // leaves the note mid-line; it must never be able to abort the handler
    // before the stroke has started, which would silently kill drawing.
    try {
      (event.target as Element).setPointerCapture(event.pointerId);
    } catch {
      /* Pointer already released, or a synthetic event. Drawing still works. */
    }
  };

  const handleDrawMove = (event: ReactPointerEvent) => {
    handlePaperMove(event);
    if (event.buttons === 0) return;
    if (tool === 'erase') {
      eraseAt(event.clientX, event.clientY);
      return;
    }
    if (!draft) return;
    event.stopPropagation();
    const point = toLocal(event.clientX, event.clientY);
    setDraft((prev) => (prev ? { ...prev, points: [...prev.points, point] } : prev));
  };

  const handleDrawEnd = () => {
    if (!draft) return;
    // A single tap is not a line — discard it rather than storing a dot.
    if (draft.points.length > 1) onChange(note.id, { strokes: [...note.strokes, draft] });
    setDraft(null);
  };

  /** Erase whole strokes, which is predictable and needs no pixel buffer. */
  const eraseAt = (clientX: number, clientY: number) => {
    const point = toLocal(clientX, clientY);
    const radius = 14;
    const survivors = note.strokes.filter(
      (stroke) => !stroke.points.some((p) => Math.hypot(p.x - point.x, p.y - point.y) < radius),
    );
    if (survivors.length !== note.strokes.length) onChange(note.id, { strokes: survivors });
  };

  /* ---- Resize ----------------------------------------------------------- */

  const handleResize = (event: ReactPointerEvent) => {
    event.stopPropagation();
    event.preventDefault();
    const startX = event.clientX;
    const startY = event.clientY;
    const startSize = note.width;
    try {
      (event.currentTarget as Element).setPointerCapture(event.pointerId);
    } catch {
      /* Non-fatal: the window listeners below drive the resize regardless. */
    }

    // Only this pointer drives this resize. Without the check, a drag whose
    // pointerup was missed — pointer left the window, gesture interrupted —
    // leaves its listener bound and hijacks the next interaction, resizing the
    // note from a startSize that is long out of date.
    const pointerId = event.pointerId;

    const move = (moveEvent: globalThis.PointerEvent) => {
      if (moveEvent.pointerId !== pointerId) return;
      // ONE dimension. Averaging the two axes lets the grip be dragged
      // diagonally while the note stays square, and `clampSize` keeps it
      // between the floor and the ceiling so it can never swamp the board.
      const dx = (moveEvent.clientX - startX) / scale;
      const dy = (moveEvent.clientY - startY) / scale;
      const size = clampSize(startSize + (dx + dy) / 2);
      onChange(note.id, { width: size, height: size });
    };

    const up = (upEvent?: globalThis.PointerEvent) => {
      if (upEvent && upEvent.pointerId !== pointerId) return;
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      window.removeEventListener('blur', release);
    };
    // A window blur (alt-tab mid-drag) never delivers pointerup.
    const release = () => up();

    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    window.addEventListener('blur', release);
  };

  return (
    <div
      data-note={note.id}
      className="absolute select-none"
      style={{
        left: note.x,
        top: note.y,
        width: note.width,
        height: note.height,
        zIndex: note.z,
        // Perspective belongs on the parent of the tilted element, and it is
        // per-note so a note never inherits a vanishing point from the canvas.
        perspective: 850,
      }}
    >
      <motion.div
        ref={sheetRef}
        className="relative h-full w-full"
        style={{
          rotate: note.rotation,
          rotateX: tiltX,
          rotateY: tiltY,
          transformStyle: 'preserve-3d',
        }}
        onPointerEnter={handlePaperEnter}
        onPointerLeave={handlePaperLeave}
        onPointerDown={handleDrawStart}
        onPointerMove={handleDrawMove}
        onPointerUp={handleDrawEnd}
        onPointerCancel={handleDrawEnd}
        onDoubleClick={(event) => {
          if (readOnly) return;
          event.stopPropagation();
          if (!drawingMode) onStartEditing(note.id);
        }}
      >
        {/* The sheet. Clipped at the corner where the paper folds back. */}
        <motion.div
          className={`absolute inset-0 rounded-[3px] ${selected ? 'ring-2 ring-white/80' : ''}`}
          style={{
            background: `linear-gradient(158deg, ${tint.bg} 0%, ${tint.bg} 72%, ${tint.edge} 100%)`,
            cursor: readOnly ? 'default' : drawingMode ? 'crosshair' : 'grab',
            clipPath,
            boxShadow: shadow,
          }}
        >
          {/* Drawing layer. Sits under the text so writing stays readable. */}
          <svg
            className="pointer-events-none absolute inset-0 h-full w-full"
            viewBox={`0 0 ${note.width} ${note.height}`}
            preserveAspectRatio="none"
            aria-hidden
          >
            {[...note.strokes, ...(draft ? [draft] : [])].map((stroke, index) => (
              <path
                key={index}
                d={strokePath(stroke.points)}
                fill="none"
                stroke={stroke.color}
                strokeWidth={stroke.width}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}
          </svg>

          {editing ? (
            <div
              ref={textRef}
              contentEditable
              suppressContentEditableWarning
              role="textbox"
              aria-multiline="true"
              aria-label="Note text"
              onInput={(event) =>
                onChange(note.id, { text: sanitiseHtml(event.currentTarget.innerHTML) })
              }
              onBlur={onStopEditing}
              onKeyDown={(event) => {
                if (event.key === 'Escape') onStopEditing();
                event.stopPropagation();
              }}
              onPointerDown={(event) => event.stopPropagation()}
              className="absolute inset-0 h-full w-full overflow-hidden break-words p-4 outline-none"
              style={textStyle}
            />
          ) : bodyHtml ? (
            <div
              ref={bodyRef}
              className="pointer-events-none absolute inset-0 overflow-hidden break-words p-4"
              style={{
                ...textStyle,
                ...(style.highlight
                  ? {
                      // The note-wide marker. Selection highlights live in the
                      // markup itself and are unaffected by this.
                      backgroundColor: style.highlight,
                      boxDecorationBreak: 'clone',
                      WebkitBoxDecorationBreak: 'clone',
                    }
                  : {}),
              }}
              // Sanitised again here: the server is authoritative, but a note
              // must never be rendered on the strength of that alone.
              dangerouslySetInnerHTML={{ __html: sanitiseHtml(bodyHtml) }}
            />
          ) : (
            <p className="pointer-events-none absolute inset-0 p-4 opacity-40" style={textStyle}>
              {readOnly ? '' : 'Double-click to write'}
            </p>
          )}
        </motion.div>

        {/* The folded corner. A triangle showing the back of the sheet, sitting
            in the notch the clip-path cut out of it. */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute bottom-0 right-0"
          style={{
            width: fold,
            height: fold,
            clipPath: 'polygon(100% 0, 0 100%, 100% 100%)',
            background: `linear-gradient(315deg, ${tint.edge} 0%, ${tint.bg} 45%, rgba(0,0,0,0.22) 100%)`,
            filter: 'drop-shadow(-2px -2px 3px rgba(0,0,0,0.28))',
            borderBottomRightRadius: 3,
          }}
        />

        {/*
          A fade rather than a hard cut, so it reads as "there is more" instead
          of "this note is broken". Decorative only — it never eats a click.
        */}
        {clipped && (
          <>
            <span
              aria-hidden
              className="pointer-events-none absolute inset-x-0 bottom-0 h-10"
              style={{ background: `linear-gradient(to bottom, transparent, ${tint.edge})` }}
            />
            <span
              aria-hidden
              className="pointer-events-none absolute bottom-1 left-1/2 -translate-x-1/2 text-[0.7rem] font-semibold leading-none"
              style={{ color: tint.ink, opacity: 0.5 }}
            >
              •••
            </span>
            <span className="sr-only">This note has more text than is shown.</span>
          </>
        )}

        {/* Resize grip, only while selected. */}
        {selected && !drawingMode && !readOnly && (
          <div
            onPointerDown={handleResize}
            className="absolute -right-2 top-1/2 h-5 w-5 -translate-y-1/2 cursor-nwse-resize rounded-full border-2 border-white/70 bg-black/40"
            title="Drag to resize"
          />
        )}
      </motion.div>
    </div>
  );
}

/**
 * Memoised. A board can hold hundreds of notes; without this, moving one note
 * or a poll landing re-rendered every note on screen, springs and all. Now a
 * note only re-renders when something about IT changes.
 */
export const StickyNote = memo(StickyNoteImpl);
