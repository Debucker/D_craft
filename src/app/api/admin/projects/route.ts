import { NextResponse } from 'next/server';

import { isAuthenticated } from '@/lib/adminAuth';
import { parseProject } from '@/lib/projectValidation';
import { addProject, getProjects } from '@/lib/projectsServer';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  const projects = await getProjects();
  return NextResponse.json(projects, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: Request) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });
  }
  if (typeof body !== 'object' || body === null) {
    return NextResponse.json({ error: 'Expected a project object.' }, { status: 400 });
  }

  const project = parseProject(body as Record<string, unknown>);
  if (!project.title || !project.blurb) {
    return NextResponse.json({ error: 'Title and blurb are required.' }, { status: 400 });
  }

  const result = await addProject(project);
  if (!result.ok) {
    const message = result.error === 'DUPLICATE_SLUG' ? 'A project with that slug already exists.' : 'That slug is invalid.';
    return NextResponse.json({ error: result.error, message }, { status: 409 });
  }

  return NextResponse.json(result.projects, { status: 201, headers: { 'Cache-Control': 'no-store' } });
}
