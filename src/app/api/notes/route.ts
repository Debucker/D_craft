import { NextResponse } from 'next/server';

import { createNote, listNotes } from '@/lib/notesServer';
import { OWNER_COOKIE, OWNER_COOKIE_OPTIONS, resolveOwner } from '@/lib/owner';
import { checkProfanity } from '@/lib/profanity';
import { htmlToPlainText } from '@/lib/richText';

/** The board is read and written live; it must never be cached. */
export const dynamic = 'force-dynamic';

export async function GET() {
  const { ownerId, isNew } = await resolveOwner();
  const notes = await listNotes(ownerId);

  const response = NextResponse.json(notes, { headers: { 'Cache-Control': 'no-store' } });
  // First visit: hand out an identity, or every request is a new person and
  // nobody could ever edit the note they just wrote.
  if (isNew) response.cookies.set(OWNER_COOKIE, ownerId, OWNER_COOKIE_OPTIONS);
  return response;
}

export async function POST(request: Request) {
  const { ownerId, isNew } = await resolveOwner();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });
  }
  if (typeof body !== 'object' || body === null) {
    return NextResponse.json({ error: 'Expected a note object.' }, { status: 400 });
  }

  const input = body as Record<string, unknown>;

  /**
   * The filter runs HERE, not only in the browser. Client-side checks are a
   * courtesy to the person typing; on a board everyone can read, the server is
   * the only place a check actually holds.
   */
  // The body is markup now, so the filter reads the words, not the tags —
  // otherwise "f<b>u</b>ck" would sail straight past it.
  if (
    typeof input['text'] === 'string' &&
    !checkProfanity(htmlToPlainText(input['text'])).clean
  ) {
    return NextResponse.json({ error: 'PROFANITY' }, { status: 422 });
  }

  const result = await createNote(input, ownerId);

  if (result === 'ALREADY_HAS_ONE') {
    return NextResponse.json({ error: 'ONE_PER_PERSON' }, { status: 409 });
  }
  if (result === 'BOARD_FULL') {
    return NextResponse.json({ error: 'BOARD_FULL' }, { status: 507 });
  }

  const response = NextResponse.json(result, {
    status: 201,
    headers: { 'Cache-Control': 'no-store' },
  });
  if (isNew) response.cookies.set(OWNER_COOKIE, ownerId, OWNER_COOKIE_OPTIONS);
  return response;
}
