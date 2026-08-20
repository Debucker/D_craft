import { cookies } from 'next/headers';

import { readStore, writeStore } from '@/lib/storage';

/**
 * ADMIN SESSION
 * -----------------------------------------------------------------------
 * One password (`ADMIN_PASSWORD`, an env var you set), one session at a
 * time — there's exactly one admin, so anything more is unneeded
 * complexity. On a correct login a random token is written to the store and
 * also set as an httpOnly cookie; a request is authenticated when its
 * cookie matches what's in the store. Logging out — or logging in again
 * from elsewhere — overwrites that stored token, which is what invalidates
 * every earlier session in one move.
 *
 * The password itself is compared in constant time so response timing
 * can't leak how many leading characters a guess got right.
 */

export const ADMIN_COOKIE = 'dcraft_admin_session';
const SESSION_KEY = 'admin:session';
const THIRTY_DAYS_IN_SECONDS = 60 * 60 * 24 * 30;

export const ADMIN_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
  maxAge: THIRTY_DAYS_IN_SECONDS,
} as const;

function timingSafeEqual(a: string, b: string): boolean {
  const bufA = new TextEncoder().encode(a);
  const bufB = new TextEncoder().encode(b);
  // Different lengths already leak *something*, but never short-circuit on
  // content — walk the longer of the two so the loop cost doesn't vary with
  // how much of the guess was right.
  const length = Math.max(bufA.length, bufB.length);
  let diff = bufA.length ^ bufB.length;
  for (let i = 0; i < length; i++) {
    diff |= (bufA[i] ?? 0) ^ (bufB[i] ?? 0);
  }
  return diff === 0;
}

/** True if a password was ever configured — the panel is unreachable without one. */
export function adminConfigured(): boolean {
  return typeof process.env.ADMIN_PASSWORD === 'string' && process.env.ADMIN_PASSWORD.length > 0;
}

/** On success, returns the session token to set as the cookie. */
export async function login(password: string): Promise<string | null> {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected || !timingSafeEqual(password, expected)) return null;

  const token = globalThis.crypto.randomUUID();
  await writeStore(SESSION_KEY, token);
  return token;
}

export async function logout(): Promise<void> {
  await writeStore(SESSION_KEY, null);
}

export async function isAuthenticated(): Promise<boolean> {
  const store = await cookies();
  const cookie = store.get(ADMIN_COOKIE)?.value;
  if (!cookie) return false;

  const valid = await readStore<string>(SESSION_KEY);
  return typeof valid === 'string' && valid.length > 0 && cookie === valid;
}
