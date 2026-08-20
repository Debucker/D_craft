import { promises as fs } from 'node:fs';
import path from 'node:path';

import { hasKv, kvGet, kvSet } from '@/lib/kv';

/**
 * ONE JSON VALUE, ADDRESSED BY KEY.
 * -----------------------------------------------------------------------
 * Backed by Upstash Redis when its credentials are set (`kv.ts`), and by a
 * local file otherwise. Every caller — the notes board, the projects store —
 * goes through `readStore`/`writeStore` and never touches `fs` or Redis
 * directly, so the backend is one env var away from switching with no
 * change at any call site.
 */

const DATA_DIR = path.join(process.cwd(), '.data');

function fileFor(key: string): string {
  // Keys are our own literals ('notes', 'projects', 'admin:session', ...),
  // never user input — but ':' is a reserved character in Windows filenames
  // (NTFS reads it as an alternate-data-stream separator), so a key like
  // 'admin:session' failed outright on Windows dev machines even though it
  // worked everywhere else. Replacing anything outside [a-zA-Z0-9-_] keeps
  // every current and future key filename-safe on every OS, not just the
  // one that happened to break first.
  const safe = key.replace(/[^a-zA-Z0-9-_]/g, '_');
  return path.join(DATA_DIR, `${safe}.json`);
}

async function readFileStore<T>(key: string): Promise<T | null> {
  try {
    const raw = await fs.readFile(fileFor(key), 'utf8');
    return JSON.parse(raw) as T;
  } catch {
    // No file yet, or it's unreadable. "Nothing stored" is the right answer.
    return null;
  }
}

async function writeFileStore<T>(key: string, value: T): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const target = fileFor(key);
  // Write beside the target and rename, so a crash mid-write can't leave a
  // half-serialised file that would read back as empty.
  const temp = `${target}.${process.pid}.tmp`;
  await fs.writeFile(temp, JSON.stringify(value, null, 2), 'utf8');
  await fs.rename(temp, target);
}

export async function readStore<T>(key: string): Promise<T | null> {
  if (hasKv()) return kvGet<T>(key);
  return readFileStore<T>(key);
}

export async function writeStore<T>(key: string, value: T): Promise<void> {
  if (hasKv()) return kvSet(key, value);
  return writeFileStore(key, value);
}
