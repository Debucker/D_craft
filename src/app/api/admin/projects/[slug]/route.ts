import { NextResponse } from 'next/server';

import { isAuthenticated } from '@/lib/adminAuth';
import { parseProjectPatch } from '@/lib/projectValidation';
import { deleteProject, updateProject } from '@/lib/projectsServer';

export const dynamic = 'force-dynamic';

type Context = { params: Promise<{ slug: string }> };

export async function PATCH(request: Request, context: Context) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  const { slug } = await context.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });
  }
  if (typeof body !== 'object' || body === null) {
    return NextResponse.json({ error: 'Expected a project object.' }, { status: 400 });
  }

  const patch = parseProjectPatch(body as Record<string, unknown>);
  const result = await updateProject(slug, patch);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 404 });

  return NextResponse.json(result.projects, { headers: { 'Cache-Control': 'no-store' } });
}

export async function DELETE(_request: Request, context: Context) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  const { slug } = await context.params;

  const result = await deleteProject(slug);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 404 });

  return NextResponse.json(result.projects, { headers: { 'Cache-Control': 'no-store' } });
}
