import { NextResponse } from 'next/server';

import { isAuthenticated } from '@/lib/adminAuth';
import { moveProject } from '@/lib/projectsServer';

export const dynamic = 'force-dynamic';

type Context = { params: Promise<{ slug: string }> };

export async function POST(request: Request, context: Context) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  const { slug } = await context.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });
  }

  const direction = typeof body === 'object' && body !== null ? (body as Record<string, unknown>)['direction'] : null;
  if (direction !== -1 && direction !== 1) {
    return NextResponse.json({ error: 'direction must be -1 or 1.' }, { status: 400 });
  }

  const result = await moveProject(slug, direction);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 404 });

  return NextResponse.json(result.projects, { headers: { 'Cache-Control': 'no-store' } });
}
