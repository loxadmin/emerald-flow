// Server-side cache abstraction (cache-aside).
//
// WHY IT EXISTS NOW: a handful of edge functions re-read the same immutable-ish
// rows on every single request (admin_settings by key: ~2.7k reads, api_keys by
// key: ~19k reads). Those are public/service configuration lookups, so caching
// them is safe and removes the largest share of avoidable Postgres round trips.
//
// WHAT IT IS NOT: this is deliberately NOT Redis. The current volume does not
// justify paying for and operating a cache cluster. The default implementation
// is per-isolate memory, which is free and correct-enough for short TTLs.
//
// PORTABILITY: business code depends on the `CacheProvider` interface only.
// Pointing it at Upstash/Redis (Vercel today) or a DigitalOcean-managed Redis
// later is a single `setCacheProvider()` call at boot — no service rewrites.

export interface CacheProvider {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds: number): Promise<void>;
  del(key: string): Promise<void>;
}

/** Per-isolate in-memory cache. Bounded, TTL'd, no external dependency. */
class MemoryCache implements CacheProvider {
  #max = 500;
  #store = new Map<string, { v: unknown; exp: number }>();

  async get<T>(key: string): Promise<T | null> {
    const hit = this.#store.get(key);
    if (!hit) return null;
    if (hit.exp < Date.now()) {
      this.#store.delete(key);
      return null;
    }
    return hit.v as T;
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    if (this.#store.size >= this.#max) {
      // evict oldest insertion
      const oldest = this.#store.keys().next().value;
      if (oldest) this.#store.delete(oldest);
    }
    this.#store.set(key, { v: value, exp: Date.now() + ttlSeconds * 1000 });
  }

  async del(key: string): Promise<void> {
    this.#store.delete(key);
  }
}

let provider: CacheProvider = new MemoryCache();

/** Swap the backing store (e.g. Redis) without touching call sites. */
export function setCacheProvider(next: CacheProvider) {
  provider = next;
}

export const CacheTTL = {
  /** Config that admins change rarely: admin_settings, site content. */
  config: 300,
  /** Credential/lookup rows that must not go stale for long: api_keys. */
  lookup: 60,
  /** Public aggregates and listings. */
  listing: 120,
} as const;

/**
 * Cache-aside read. A cache failure NEVER fails the request: on any provider
 * error we fall through to the loader and serve from Postgres.
 *
 * NEVER pass private, per-user or financial data through this helper — keys are
 * shared across all callers of an isolate. Use it for public/service config.
 */
export async function cached<T>(
  key: string,
  ttlSeconds: number,
  loader: () => Promise<T>,
): Promise<T> {
  try {
    const hit = await provider.get<T>(key);
    if (hit !== null && hit !== undefined) return hit;
  } catch {
    // cache unavailable -> degrade to origin
  }
  const value = await loader();
  try {
    if (value !== null && value !== undefined) await provider.set(key, value, ttlSeconds);
  } catch {
    // write-through failure is non-fatal
  }
  return value;
}

/** Explicit invalidation, to be called from the mutation path. */
export async function invalidate(key: string) {
  try {
    await provider.del(key);
  } catch {
    // best effort
  }
}

export const cacheKeys = {
  adminSetting: (k: string) => `admin_settings:${k}`,
  apiKey: (k: string) => `api_key:${k}`,
  trackerRelease: () => "tracker:release:current",
  siteContent: () => "site_content:visible",
};
