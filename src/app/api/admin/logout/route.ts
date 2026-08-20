import { NextResponse } from 'next/server';

import { ADMIN_COOKIE, logout } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

export async function POST() {
  await logout();
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(ADMIN_COOKIE);
  return response;
}
