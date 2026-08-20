import { NextResponse } from 'next/server';

import { ADMIN_COOKIE, ADMIN_COOKIE_OPTIONS, adminConfigured, login } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  if (!adminConfigured()) {
    return NextResponse.json(
      { error: 'NOT_CONFIGURED', message: 'Set ADMIN_PASSWORD before the panel can be used.' },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });
  }

  const password = typeof body === 'object' && body !== null ? (body as Record<string, unknown>)['password'] : null;
  if (typeof password !== 'string' || password.length === 0) {
    return NextResponse.json({ error: 'Password required.' }, { status: 400 });
  }

  const token = await login(password);
  if (!token) {
    return NextResponse.json({ error: 'WRONG_PASSWORD' }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_COOKIE, token, ADMIN_COOKIE_OPTIONS);
  return response;
}
