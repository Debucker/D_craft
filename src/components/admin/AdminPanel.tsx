'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import type { Project, ProjectLink, ProjectShot, ProjectStatus } from '@/content/projects';

const STATUSES: readonly ProjectStatus[] = [
  'Live',
  'In progress',
  'Ongoing',
  'Shipped',
  'Research',
  'Coming soon',
];

/** The form's own shape — strings everywhere, split into real fields on submit. */
interface DraftLink {
  label: string;
  href: string;
  external: boolean;
}
interface DraftShot {
  src: string;
  alt: string;
}
interface Draft {
  slug: string;
  title: string;
  blurb: string;
  detail: string;
  role: string;
  year: string;
  status: ProjectStatus;
  tags: string;
  featured: boolean;
  links: DraftLink[];
  shots: DraftShot[];
}

const EMPTY_DRAFT: Draft = {
  slug: '',
  title: '',
  blurb: '',
  detail: '',
  role: '',
  year: '',
  status: 'In progress',
  tags: '',
  featured: false,
  links: [],
  shots: [],
};

function toDraft(project: Project): Draft {
  return {
    slug: project.slug,
    title: project.title,
    blurb: project.blurb,
    detail: project.detail ?? '',
    role: project.role,
    year: project.year,
    status: project.status,
    tags: project.tags.join(', '),
    featured: project.featured ?? false,
    links: project.links.map((link) => ({ ...link, external: link.external ?? false })),
    shots: (project.shots ?? []).map((shot) => ({ ...shot })),
  };
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function draftToPayload(draft: Draft) {
  return {
    slug: draft.slug,
    title: draft.title,
    blurb: draft.blurb,
    detail: draft.detail.trim().length > 0 ? draft.detail : undefined,
    role: draft.role,
    year: draft.year,
    status: draft.status,
    tags: draft.tags
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean),
    featured: draft.featured,
    links: draft.links
      .filter((link) => link.label.trim().length > 0 && link.href.trim().length > 0)
      .map((link): ProjectLink => ({ label: link.label, href: link.href, external: link.external })),
    shots: draft.shots
      .filter((shot) => shot.src.trim().length > 0)
      .map((shot): ProjectShot => ({ src: shot.src, alt: shot.alt })),
  };
}

const inputClass =
  'mt-2 w-full rounded-card border border-line bg-bg/60 px-3.5 py-2.5 text-sm text-fg transition-colors duration-300 hover:border-line-strong focus:border-accent';
const labelClass = 'eyebrow block';

export function AdminPanel({ initialProjects }: { initialProjects: readonly Project[] }) {
  const router = useRouter();
  const [projects, setProjects] = useState<readonly Project[]>(initialProjects);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = draft !== null && projects.some((project) => project.slug === draft.slug);

  function startAdd() {
    setError(null);
    setDraft({ ...EMPTY_DRAFT });
  }

  function startEdit(project: Project) {
    setError(null);
    setDraft(toDraft(project));
  }

  function cancel() {
    setDraft(null);
    setError(null);
  }

  async function submit() {
    if (!draft) return;
    setSaving(true);
    setError(null);

    const payload = draftToPayload(draft);

    try {
      const response = isEditing
        ? await fetch(`/api/admin/projects/${encodeURIComponent(draft.slug)}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        : await fetch('/api/admin/projects', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        setError(body?.message ?? 'Could not save — check the fields and try again.');
        return;
      }

      const next = (await response.json()) as Project[];
      setProjects(next);
      setDraft(null);
      router.refresh();
    } catch {
      setError('Could not reach the server.');
    } finally {
      setSaving(false);
    }
  }

  async function remove(slug: string) {
    if (!window.confirm('Delete this project? This can’t be undone.')) return;

    const response = await fetch(`/api/admin/projects/${encodeURIComponent(slug)}`, { method: 'DELETE' });
    if (!response.ok) {
      setError('Could not delete that project.');
      return;
    }
    const next = (await response.json()) as Project[];
    setProjects(next);
    if (draft?.slug === slug) setDraft(null);
    router.refresh();
  }

  async function move(slug: string, direction: -1 | 1) {
    const response = await fetch(`/api/admin/projects/${encodeURIComponent(slug)}/move`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ direction }),
    });
    if (!response.ok) return;
    const next = (await response.json()) as Project[];
    setProjects(next);
    router.refresh();
  }

  async function logout() {
    await fetch('/api/admin/logout', { method: 'POST' });
    // Hard navigation, same reasoning as the login page: a client-side push
    // can serve a cached "still authenticated" response for a page whose
    // access this very request just revoked.
    window.location.href = '/admin/login';
  }

  return (
    <div className="min-h-svh bg-bg px-6 py-12 text-fg">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center justify-between gap-4 border-b border-line pb-6">
          <div>
            <h1 className="font-display text-2xl font-semibold">Projects</h1>
            <p className="mt-1 text-sm text-muted">
              Changes here go live on the site immediately — no redeploy needed.
            </p>
          </div>
          <button
            onClick={logout}
            className="shrink-0 rounded-pill border border-line-strong px-4 py-2 text-sm text-muted transition-colors duration-300 hover:border-accent hover:text-fg"
          >
            Log out
          </button>
        </div>

        {!draft && (
          <button
            onClick={startAdd}
            className="mt-8 rounded-pill bg-accent px-6 py-3 text-sm font-semibold text-bg transition-transform duration-300 ease-out-expo hover:-translate-y-0.5"
          >
            + Add project
          </button>
        )}

        {draft && (
          <ProjectForm
            draft={draft}
            // ProjectForm only ever renders while `draft` is non-null (this
            // guard right here), so its updater can assume a real `Draft` to
            // spread — this adapter is what lets it keep that narrower,
            // easier-to-write signature instead of juggling `| null`
            // everywhere just to satisfy `useState`'s wider setter type.
            setDraft={(updater) => setDraft((prev) => (prev ? updater(prev) : prev))}
            isEditing={isEditing}
            saving={saving}
            error={error}
            onSubmit={submit}
            onCancel={cancel}
          />
        )}

        <ul className="mt-10 space-y-3">
          {projects.map((project, index) => (
            <li
              key={project.slug}
              className="flex items-center justify-between gap-4 rounded-card border border-line bg-surface p-5"
            >
              <div className="min-w-0">
                <p className="truncate font-display text-base font-medium text-fg">{project.title}</p>
                <p className="mt-1 text-xs text-faint">
                  {project.slug} · {project.status}
                  {project.kind === 'placeholder' ? ' · placeholder' : ''}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <button
                  onClick={() => move(project.slug, -1)}
                  disabled={index === 0}
                  aria-label="Move up"
                  className="rounded-card border border-line px-2.5 py-1.5 text-sm text-muted transition-colors duration-300 hover:border-line-strong hover:text-fg disabled:pointer-events-none disabled:opacity-30"
                >
                  ↑
                </button>
                <button
                  onClick={() => move(project.slug, 1)}
                  disabled={index === projects.length - 1}
                  aria-label="Move down"
                  className="rounded-card border border-line px-2.5 py-1.5 text-sm text-muted transition-colors duration-300 hover:border-line-strong hover:text-fg disabled:pointer-events-none disabled:opacity-30"
                >
                  ↓
                </button>
                <button
                  onClick={() => startEdit(project)}
                  className="rounded-card border border-line px-3 py-1.5 text-sm text-muted transition-colors duration-300 hover:border-line-strong hover:text-fg"
                >
                  Edit
                </button>
                <button
                  onClick={() => remove(project.slug)}
                  className="rounded-card border border-line px-3 py-1.5 text-sm text-muted transition-colors duration-300 hover:border-accent hover:text-accent"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

interface ProjectFormProps {
  draft: Draft;
  setDraft: (updater: (prev: Draft) => Draft) => void;
  isEditing: boolean;
  saving: boolean;
  error: string | null;
  onSubmit: () => void;
  onCancel: () => void;
}

function ProjectForm({ draft, setDraft, isEditing, saving, error, onSubmit, onCancel }: ProjectFormProps) {
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="mt-8 rounded-card border border-line bg-surface p-7">
      <h2 className="font-display text-lg font-medium text-fg">{isEditing ? 'Edit project' : 'New project'}</h2>

      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <div>
          <label className={labelClass}>Title</label>
          <input
            value={draft.title}
            onChange={(event) => {
              const title = event.target.value;
              set('title', title);
              if (!isEditing) set('slug', slugify(title));
            }}
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>Slug</label>
          <input
            value={draft.slug}
            disabled={isEditing}
            onChange={(event) => set('slug', slugify(event.target.value))}
            className={`${inputClass} disabled:opacity-50`}
          />
        </div>

        <div className="sm:col-span-2">
          <label className={labelClass}>Blurb — one line</label>
          <input value={draft.blurb} onChange={(event) => set('blurb', event.target.value)} className={inputClass} />
        </div>

        <div className="sm:col-span-2">
          <label className={labelClass}>Detail — optional, longer supporting line</label>
          <textarea
            rows={2}
            value={draft.detail}
            onChange={(event) => set('detail', event.target.value)}
            className={`${inputClass} resize-y`}
          />
        </div>

        <div>
          <label className={labelClass}>Role</label>
          <input value={draft.role} onChange={(event) => set('role', event.target.value)} className={inputClass} />
        </div>

        <div>
          <label className={labelClass}>Year</label>
          <input
            value={draft.year}
            onChange={(event) => set('year', event.target.value)}
            placeholder="2026 or 2026 —"
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>Status</label>
          <select
            value={draft.status}
            onChange={(event) => set('status', event.target.value as ProjectStatus)}
            className={inputClass}
          >
            {STATUSES.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelClass}>Tags — comma separated</label>
          <input value={draft.tags} onChange={(event) => set('tags', event.target.value)} className={inputClass} />
        </div>

        <label className="flex items-center gap-2.5 text-sm text-fg sm:col-span-2">
          <input
            type="checkbox"
            checked={draft.featured}
            onChange={(event) => set('featured', event.target.checked)}
            className="h-4 w-4 accent-accent"
          />
          Featured (spans the full grid width)
        </label>
      </div>

      <div className="mt-7">
        <div className="flex items-center justify-between">
          <span className={labelClass}>Links</span>
          <button
            onClick={() => set('links', [...draft.links, { label: '', href: '', external: true }])}
            className="text-xs text-muted transition-colors duration-300 hover:text-accent"
          >
            + Add link
          </button>
        </div>
        {draft.links.map((link, index) => (
          <div key={index} className="mt-3 flex flex-wrap items-center gap-2.5">
            <input
              value={link.label}
              onChange={(event) => {
                const next = [...draft.links];
                next[index] = { ...link, label: event.target.value };
                set('links', next);
              }}
              placeholder="Label — Visit site"
              className={`${inputClass} mt-0 w-40`}
            />
            <input
              value={link.href}
              onChange={(event) => {
                const next = [...draft.links];
                next[index] = { ...link, href: event.target.value };
                set('links', next);
              }}
              placeholder="https://…"
              className={`${inputClass} mt-0 flex-1`}
            />
            <label className="flex items-center gap-1.5 text-xs text-muted">
              <input
                type="checkbox"
                checked={link.external}
                onChange={(event) => {
                  const next = [...draft.links];
                  next[index] = { ...link, external: event.target.checked };
                  set('links', next);
                }}
                className="h-3.5 w-3.5 accent-accent"
              />
              external
            </label>
            <button
              onClick={() => set('links', draft.links.filter((_, i) => i !== index))}
              aria-label="Remove link"
              className="text-faint transition-colors duration-300 hover:text-accent"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      <div className="mt-7">
        <div className="flex items-center justify-between">
          <span className={labelClass}>Screenshots</span>
          <button
            onClick={() => set('shots', [...draft.shots, { src: '', alt: '' }])}
            className="text-xs text-muted transition-colors duration-300 hover:text-accent"
          >
            + Add screenshot
          </button>
        </div>
        <p className="mt-2 text-xs text-faint">
          Only files already in <code>public/work/</code> can be pointed at here — the panel doesn&rsquo;t
          upload images itself yet. Ask for a new screenshot to be added the usual way, then reference it below.
        </p>
        {draft.shots.map((shot, index) => (
          <div key={index} className="mt-3 flex flex-wrap items-center gap-2.5">
            <input
              value={shot.src}
              onChange={(event) => {
                const next = [...draft.shots];
                next[index] = { ...shot, src: event.target.value };
                set('shots', next);
              }}
              placeholder="/work/example.png"
              className={`${inputClass} mt-0 w-48`}
            />
            <input
              value={shot.alt}
              onChange={(event) => {
                const next = [...draft.shots];
                next[index] = { ...shot, alt: event.target.value };
                set('shots', next);
              }}
              placeholder="Describe what's on screen"
              className={`${inputClass} mt-0 flex-1`}
            />
            <button
              onClick={() => set('shots', draft.shots.filter((_, i) => i !== index))}
              aria-label="Remove screenshot"
              className="text-faint transition-colors duration-300 hover:text-accent"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      {error && (
        <p role="alert" className="mt-6 text-sm text-accent">
          {error}
        </p>
      )}

      <div className="mt-8 flex items-center gap-3">
        <button
          onClick={onSubmit}
          disabled={saving || draft.title.trim().length === 0 || draft.blurb.trim().length === 0}
          className="rounded-pill bg-accent px-6 py-3 text-sm font-semibold text-bg transition-transform duration-300 ease-out-expo hover:-translate-y-0.5 disabled:opacity-60"
        >
          {saving ? 'Saving…' : isEditing ? 'Save changes' : 'Create project'}
        </button>
        <button
          onClick={onCancel}
          className="rounded-pill border border-line-strong px-6 py-3 text-sm text-muted transition-colors duration-300 hover:border-accent hover:text-fg"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
