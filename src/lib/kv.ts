import { Redis } from '@upstash/redis';

/**
 * HOSTED KEY-VALUE STORE — the swap point that lets writes survive Vercel.
 * -----------------------------------------------------------------------
 * Serverless functions get a read-only, ephemeral filesystem, so anything
 * written to local disk (the notes board's old approach) either fails or
 * vanishes on the next cold start. Upstash Redis is the fix: a tiny hosted
 * store reachable over plain HTTP, with a free tier, that both the notes
 * board and the admin panel read and write through `storage.ts`.
 *
 * Absent credentials is a valid state, not an error — it's what local dev
 * looks like before you've set up an Upstash database. `storage.ts` falls
 * back to local files whenever `hasKv()` is false, so nothing here is
 * required to run the site on your own machine.
 */

let client: Redis | null | undefined;

function getClient(): Redis | null {
  if (client !== undefined) return client;

  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;

  client = url && token ? new Redis({ url, token }) : null;
  return client;
}

export function hasKv(): boolean {
  return getClient() !== null;
}

export async function kvGet<T>(key: string): Promise<T | null> {
  const redis = getClient();
  if (!redis) return null;
  const value = await redis.get<T>(key);
  return value ?? null;
}

export async function kvSet<T>(key: string, value: T): Promise<void> {
  const redis = getClient();
  if (!redis) return;
  await redis.set(key, value);
}
