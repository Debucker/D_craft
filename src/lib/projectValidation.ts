import type { Project, ProjectLink, ProjectShot, ProjectStatus } from '@/content/projects';

/**
 * Turns whatever arrived over the wire from the admin form into a `Project`
 * this app is willing to store and render. The panel is behind a password,
 * not the profanity-filter-grade threat model the public notes board needs
 * — but a typo here still shouldn't be able to crash the public site's
 * render, so every field is type-checked and given a safe fallback.
 */

const STATUSES: readonly ProjectStatus[] = [
  'Live',
  'In progress',
  'Ongoing',
  'Shipped',
  'Research',
  'Coming soon',
];

function str(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value.trim() : fallback;
}

function optionalStr(value: unknown): string | undefined {
  const s = str(value);
  return s.length > 0 ? s : undefined;
}

function strArray(value: unknown): readonly string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).map((item) => item.trim());
}

function status(value: unknown): ProjectStatus {
  return STATUSES.includes(value as ProjectStatus) ? (value as ProjectStatus) : 'In progress';
}

function links(value: unknown): readonly ProjectLink[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null)
    .map((item) => ({
      label: str(item['label']),
      href: str(item['href']),
      external: item['external'] === true,
    }))
    .filter((link) => link.label.length > 0 && link.href.length > 0);
}

function shots(value: unknown): readonly ProjectShot[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const parsed = value
    .filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null)
    .map((item) => ({ src: str(item['src']), alt: str(item['alt']) }))
    .filter((shot) => shot.src.length > 0 && shot.alt.length > 0);
  return parsed.length > 0 ? parsed : undefined;
}

/** Lowercase, hyphenated, no leading/trailing/doubled hyphens. */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function parseProject(input: Record<string, unknown>): Project {
  const blurb = str(input['blurb']);
  const title = str(input['title']);

  return {
    slug: str(input['slug']) || slugify(title),
    kind: 'project',
    title,
    blurb,
    detail: optionalStr(input['detail']),
    role: str(input['role']),
    year: str(input['year']),
    status: status(input['status']),
    tags: strArray(input['tags']),
    links: links(input['links']),
    shots: shots(input['shots']),
    featured: input['featured'] === true,
  };
}

/** For a PATCH: only the fields actually present in the payload. */
export function parseProjectPatch(input: Record<string, unknown>): Partial<Project> {
  const patch: Record<string, unknown> = {};

  if ('title' in input) patch['title'] = str(input['title']);
  if ('blurb' in input) patch['blurb'] = str(input['blurb']);
  if ('detail' in input) patch['detail'] = optionalStr(input['detail']);
  if ('role' in input) patch['role'] = str(input['role']);
  if ('year' in input) patch['year'] = str(input['year']);
  if ('status' in input) patch['status'] = status(input['status']);
  if ('tags' in input) patch['tags'] = strArray(input['tags']);
  if ('links' in input) patch['links'] = links(input['links']);
  if ('shots' in input) patch['shots'] = shots(input['shots']);
  if ('featured' in input) patch['featured'] = input['featured'] === true;

  return patch as Partial<Project>;
}
