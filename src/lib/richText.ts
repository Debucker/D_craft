/**
 * RICH TEXT — sanitising, and applying formatting to a selection.
 * -----------------------------------------------------------------------
 * A note's body is now HTML, so that bold, colour, highlight and typeface can
 * apply to the words you selected rather than the whole note.
 *
 * ⚠️  THIS IS A SECURITY BOUNDARY, NOT A TIDYING STEP.
 *
 * The board is public: one person's note is rendered inside everyone else's
 * browser. Storing HTML without sanitising it is textbook stored XSS — a note
 * containing `<img src=x onerror=...>` would run in every visitor's session.
 *
 * `sanitiseHtml` is therefore DEFAULT-DENY. Anything that is not explicitly on
 * the allowlist is discarded: unknown tags are dropped, every attribute is
 * dropped, and `style` is not passed through but REBUILT from declarations that
 * individually matched a permitted property and a permitted value pattern. It
 * runs on the server before anything is stored, and again in the browser before
 * anything is rendered, because one layer failing should not be enough.
 */

/** Tags kept, and what each is normalised to. */
const TAGS: Readonly<Record<string, string>> = {
  b: 'strong',
  strong: 'strong',
  i: 'em',
  em: 'em',
  u: 'u',
  s: 's',
  strike: 's',
  del: 's',
  mark: 'mark',
  span: 'span',
  div: 'div',
  p: 'div',
  br: 'br',
};

const VOID_TAGS = new Set(['br']);

/** Style properties kept, each with the only values it may hold. */
const COLOUR = /^(#[0-9a-f]{3,8}|rgba?\([\d\s.,%/]+\)|transparent|currentcolor)$/i;

const STYLE_RULES: Readonly<Record<string, RegExp>> = {
  color: COLOUR,
  'background-color': COLOUR,
  'font-weight': /^(bold|bolder|normal|[1-9]00)$/i,
  'font-style': /^(italic|normal|oblique)$/i,
  'text-decoration': /^(underline|line-through|none)$/i,
  'text-decoration-line': /^(underline|line-through|none)$/i,
  // Font families are matched against the board's own faces, so nothing can
  // smuggle a url() or an expression() through this property.
  'font-family': /^[a-z0-9 ,'"-]+$/i,
};

/** Only these families may appear; anything else is dropped outright. */
const ALLOWED_FAMILIES = [
  'caveat',
  'permanent marker',
  'playfair display',
  'inter',
  'space grotesk',
  'ui-monospace',
  'monospace',
  'serif',
  'sans-serif',
  'cursive',
];

function escapeText(text: string): string {
  return text.replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function safeFontFamily(value: string): boolean {
  return value
    .split(',')
    .every((part) => ALLOWED_FAMILIES.includes(part.trim().replace(/^['"]|['"]$/g, '').toLowerCase()));
}

/** Rebuild a style attribute from only the declarations we permit. */
function filterStyle(raw: string): string {
  const kept: string[] = [];

  for (const declaration of raw.split(';')) {
    const at = declaration.indexOf(':');
    if (at === -1) continue;

    const property = declaration.slice(0, at).trim().toLowerCase();
    const value = declaration.slice(at + 1).trim();
    if (!value || value.length > 120) continue;

    // Belt and braces: these can never appear in a value we keep.
    if (/url\(|expression\(|javascript:|@import|<|&#/i.test(value)) continue;

    const rule = STYLE_RULES[property];
    if (!rule || !rule.test(value)) continue;
    if (property === 'font-family' && !safeFontFamily(value)) continue;

    kept.push(`${property}:${value}`);
  }

  return kept.join(';');
}

/**
 * Sanitise a fragment of HTML down to the allowlist above.
 *
 * The scan is deliberately blunt: everything between `<` and `>` is examined,
 * and unless it matches a permitted tag shape exactly it is thrown away rather
 * than repaired. Text outside tags has its angle brackets escaped, so a stray
 * `<` can never begin a tag we did not intend.
 */
export function sanitiseHtml(input: string): string {
  if (!input) return '';

  // Strip whole dangerous elements, contents and all, before anything else.
  const html = input
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(script|style|iframe|object|embed|template|noscript|svg|math)[\s\S]*?<\/\1\s*>/gi, '')
    .replace(/<(script|style|iframe|object|embed|template|noscript|svg|math)\b[^>]*\/?>/gi, '');

  let out = '';
  let cursor = 0;
  const tagPattern = /<\/?([a-zA-Z][a-zA-Z0-9]*)((?:[^<>"']|"[^"]*"|'[^']*')*)\/?>/g;
  let match: RegExpExecArray | null;

  while ((match = tagPattern.exec(html)) !== null) {
    out += escapeText(html.slice(cursor, match.index));
    cursor = tagPattern.lastIndex;

    const whole = match[0];
    const name = (match[1] ?? '').toLowerCase();
    const attributes = match[2] ?? '';
    const mapped = TAGS[name];
    if (!mapped) continue; // Unknown tag: drop it, keep whatever it wrapped.

    if (whole.startsWith('</')) {
      if (!VOID_TAGS.has(mapped)) out += `</${mapped}>`;
      continue;
    }

    if (VOID_TAGS.has(mapped)) {
      out += `<${mapped}>`;
      continue;
    }

    // Every attribute is discarded except style, which is rebuilt from scratch.
    const styleMatch = /\bstyle\s*=\s*("([^"]*)"|'([^']*)')/i.exec(attributes);
    const style = styleMatch ? filterStyle(styleMatch[2] ?? styleMatch[3] ?? '') : '';
    out += style ? `<${mapped} style="${style}">` : `<${mapped}>`;
  }

  out += escapeText(html.slice(cursor));
  return out;
}

/** The words only — for the profanity filter and for plain-text fallbacks. */
export function htmlToPlainText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(div|p)>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ');
}

/**
 * Turn a plain string into safe markup, for notes written before this existed.
 *
 * The ampersand is escaped FIRST. Doing the angle brackets first and the
 * ampersand second turns the `&` of a freshly written `&lt;` back into
 * `&amp;lt;`, and the reader sees the entity instead of the character.
 */
export function plainTextToHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>');
}

/** True when the value still looks like plain text rather than markup. */
export function looksLikeHtml(value: string): boolean {
  return /<\/?[a-z][\s\S]*>/i.test(value);
}
