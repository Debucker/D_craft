import { NextResponse } from 'next/server';

import { deleteNote, patchNote } from '@/lib/notesServer';
import { resolveOwner } from '@/lib/owner';
import { checkProfanity } from '@/lib/profanity';
import { htmlToPlainText } from '@/lib/richText';

export const dynamic = 'force-dynamic';

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Context) {
  const { id } = await context.params;
  const { ownerId } = await resolveOwner();

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

  // Same reason as the create route: the board is public, so the check has to
  // hold on the server rather than in the browser that sent this.
  // The body is markup now, so the filter reads the words, not the tags —
  // otherwise "f<b>u</b>ck" would sail straight past it.
  if (
    typeof input['text'] === 'string' &&
    !checkProfanity(htmlToPlainText(input['text'])).clean
  ) {
    return NextResponse.json({ error: 'PROFANITY' }, { status: 422 });
  }

  const result = await patchNote(id, input, ownerId);
  if (result === 'NOT_FOUND') return NextResponse.json({ error: 'No such note.' }, { status: 404 });
  // Ownership is enforced on the server. The UI also hides the controls, but
  // that is presentation — this is the part that actually holds.
  if (result === 'NOT_YOURS') return NextResponse.json({ error: 'NOT_YOURS' }, { status: 403 });

  return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } });
}

export async function DELETE(_request: Request, context: Context) {
  const { id } = await context.params;
  const { ownerId } = await resolveOwner();

  const result = await deleteNote(id, ownerId);
  if (result === 'NOT_FOUND') return NextResponse.json({ error: 'No such note.' }, { status: 404 });
  if (result === 'NOT_YOURS') return NextResponse.json({ error: 'NOT_YOURS' }, { status: 403 });

  return new NextResponse(null, { status: 204 });
}
