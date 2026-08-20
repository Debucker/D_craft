import { cookies } from 'next/headers';

/**
 * WHO IS WRITING
 * -----------------------------------------------------------------------
 * The board is public and has no accounts, so "a person" is a cookie the
 * server issues on first contact. It is enough to enforce one note each and to
 * stop anyone editing someone else's note.
 *
 * It is NOT authentication. Clearing cookies, or opening a private window, is
 * a new person as far as this is concerned — and the note they left behind
 * becomes uneditable by anyone. That is the honest trade for a board nobody
 * has to sign in to. Real identity means real accounts.
 *
 * The cookie is httpOnly so page scripts cannot read or forge it, and the
 * owner id is never sent to the browser: responses carry a plain `mine` flag
 * instead, so one visitor can never learn another's id.
 */

export const OWNER_COOKIE = 'dcraft_board_owner';

const YEAR_IN_SECONDS = 60 * 60 * 24 * 365;

export const OWNER_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax',
  path: '/',
  maxAge: YEAR_IN_SECONDS,
} as const;

function newOwnerId(): string {
  return globalThis.crypto.randomUUID();
}

/**
 * The caller's owner id, and whether it had to be minted. A fresh id must be
 * written back as a cookie by the route, or the next request is a new person
 * again.
 */
export async function resolveOwner(): Promise<{ ownerId: string; isNew: boolean }> {
  const store = await cookies();
  const existing = store.get(OWNER_COOKIE)?.value;
  if (existing && existing.length > 0) return { ownerId: existing, isNew: false };
  return { ownerId: newOwnerId(), isNew: true };
}
