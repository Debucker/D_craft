/**
 * TEXT TRANSFORMS
 * -----------------------------------------------------------------------
 * Lists, indenting and sorting for a note.
 *
 * A note's body is a plain string in a <textarea>, not a rich-text document,
 * so a "bulleted list" here is literally lines that start with a bullet — the
 * same thing you would get typing them yourself. That keeps the stored value
 * something a person could read, edit by hand, or paste elsewhere, and means
 * these operations are all just string in, string out.
 */

export const BULLET = '• ';
const NUMBERED = /^(\d+)\.\s/;
const INDENT = '  ';

function splitIndent(line: string): { indent: string; body: string } {
  const indent = /^\s*/.exec(line)?.[0] ?? '';
  return { indent, body: line.slice(indent.length) };
}

/** Strip any list marker, so the markers never stack up on each other. */
function stripMarker(body: string): string {
  return body.startsWith(BULLET) ? body.slice(BULLET.length) : body.replace(NUMBERED, '');
}

function hasContent(line: string): boolean {
  return line.trim().length > 0;
}

export function isBulleted(text: string): boolean {
  const lines = text.split('\n').filter(hasContent);
  return lines.length > 0 && lines.every((line) => splitIndent(line).body.startsWith(BULLET));
}

export function isNumbered(text: string): boolean {
  const lines = text.split('\n').filter(hasContent);
  return lines.length > 0 && lines.every((line) => NUMBERED.test(splitIndent(line).body));
}

/** Toggle: already a bulleted list -> plain lines, otherwise bullet them. */
export function toggleBullets(text: string): string {
  const off = isBulleted(text);
  return text
    .split('\n')
    .map((line) => {
      if (!hasContent(line)) return line;
      const { indent, body } = splitIndent(line);
      const bare = stripMarker(body);
      return off ? indent + bare : indent + BULLET + bare;
    })
    .join('\n');
}

/** Toggle a numbered list, renumbering from one each time. */
export function toggleNumbers(text: string): string {
  const off = isNumbered(text);
  let n = 0;
  return text
    .split('\n')
    .map((line) => {
      if (!hasContent(line)) return line;
      const { indent, body } = splitIndent(line);
      const bare = stripMarker(body);
      if (off) return indent + bare;
      n += 1;
      return `${indent}${n}. ${bare}`;
    })
    .join('\n');
}

export function indent(text: string): string {
  return text
    .split('\n')
    .map((line) => (hasContent(line) ? INDENT + line : line))
    .join('\n');
}

export function outdent(text: string): string {
  return text
    .split('\n')
    .map((line) => (line.startsWith(INDENT) ? line.slice(INDENT.length) : line.replace(/^\s+/, '')))
    .join('\n');
}

/**
 * Sort lines alphabetically, ignoring list markers and indentation so "• pear"
 * sorts under P rather than under the bullet. A numbered list is renumbered
 * afterwards, or sorting would leave 3, 1, 2 down the side.
 */
export function sortLines(text: string): string {
  const lines = text.split('\n');
  const content = lines.filter(hasContent);
  if (content.length < 2) return text;

  const numbered = isNumbered(text);

  const sorted = [...content].sort((a, b) => {
    const left = stripMarker(splitIndent(a).body);
    const right = stripMarker(splitIndent(b).body);
    return left.localeCompare(right, 'en', { sensitivity: 'base', numeric: true });
  });

  if (!numbered) return sorted.join('\n');

  let n = 0;
  return sorted
    .map((line) => {
      const { indent: pad, body } = splitIndent(line);
      n += 1;
      return `${pad}${n}. ${stripMarker(body)}`;
    })
    .join('\n');
}
