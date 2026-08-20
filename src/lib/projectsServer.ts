import { projects as SEED_PROJECTS, type Project } from '@/content/projects';
import { readStore, writeStore } from '@/lib/storage';

/**
 * SERVER-SIDE PROJECT STORE
 * -----------------------------------------------------------------------
 * `content/projects.ts` is still the SEED: what a fresh deploy shows before
 * anyone has touched the admin panel, and the fallback if the store is ever
 * empty. Once the panel writes a first change, this store — not that file —
 * is what the site actually renders, via `readStore`/`writeStore`
 * (`storage.ts`): a hosted Redis store in production, a local JSON file in
 * dev. That split is what lets the panel change the live site without a
 * rebuild.
 */

const STORE_KEY = 'projects';

export async function getProjects(): Promise<readonly Project[]> {
  const stored = await readStore<Project[]>(STORE_KEY);
  return Array.isArray(stored) ? stored : SEED_PROJECTS;
}

async function saveProjects(next: readonly Project[]): Promise<void> {
  await writeStore(STORE_KEY, next);
}

function isValidSlug(slug: string): boolean {
  return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug);
}

export type ProjectsResult =
  | { readonly ok: true; readonly projects: readonly Project[] }
  | { readonly ok: false; readonly error: 'DUPLICATE_SLUG' | 'INVALID_SLUG' | 'NOT_FOUND' };

export async function addProject(project: Project): Promise<ProjectsResult> {
  if (!isValidSlug(project.slug)) return { ok: false, error: 'INVALID_SLUG' };

  const current = await getProjects();
  if (current.some((existing) => existing.slug === project.slug)) {
    return { ok: false, error: 'DUPLICATE_SLUG' };
  }

  const next = [...current, project];
  await saveProjects(next);
  return { ok: true, projects: next };
}

export async function updateProject(slug: string, patch: Partial<Project>): Promise<ProjectsResult> {
  const current = await getProjects();
  const index = current.findIndex((existing) => existing.slug === slug);
  if (index === -1) return { ok: false, error: 'NOT_FOUND' };

  const updated = { ...current[index], ...patch, slug: current[index]!.slug } as Project;
  const next = [...current];
  next[index] = updated;
  await saveProjects(next);
  return { ok: true, projects: next };
}

export async function deleteProject(slug: string): Promise<ProjectsResult> {
  const current = await getProjects();
  if (!current.some((existing) => existing.slug === slug)) return { ok: false, error: 'NOT_FOUND' };

  const next = current.filter((existing) => existing.slug !== slug);
  await saveProjects(next);
  return { ok: true, projects: next };
}

/** Move one project earlier (-1) or later (+1) in display order. */
export async function moveProject(slug: string, direction: -1 | 1): Promise<ProjectsResult> {
  const current = await getProjects();
  const index = current.findIndex((existing) => existing.slug === slug);
  if (index === -1) return { ok: false, error: 'NOT_FOUND' };

  const target = index + direction;
  if (target < 0 || target >= current.length) return { ok: true, projects: current };

  const next = [...current];
  const a = next[index]!;
  const b = next[target]!;
  next[index] = b;
  next[target] = a;
  await saveProjects(next);
  return { ok: true, projects: next };
}
