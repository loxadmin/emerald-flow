// Distributed rate limiting for edge functions.
//
// WHY IT EXISTS NOW: `track`, `track-session`, `track-conversion`, `ext-track`,
// `offerwall` and the webhooks are unauthenticated and publicly reachable. They
// are the highest-volume writers in the database (tracking_sessions alone is
// ~10k reads + ~9k writes). Without a limiter, one abusive client can drive
// unbounded Postgres writes and Supabase spend.
//
// WHY POSTGRES AND NOT REDIS: edge isolates scale independently, so in-memory
// counters do not work. Postgres is already there, the counter table is tiny,
// and the write cost is one upsert per request bucket. If sustained volume ever
// makes that upsert the bottleneck, swap `PostgresRateLimiter` for an
// Upstash/Redis (or DigitalOcean-managed Redis) implementation of the same
// interface — no handler changes.

export interface RateLimiter {
  check(key: string, limit: number, windowSeconds: number): Promise<RateLimitResult>;
}

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: number; // epoch ms
};

/** Sensible defaults per endpoint class. */
export const RateLimits = {
  /** Per-IP tracking writes. Generous: real users fire several per session. */
  tracking: { limit: 120, windowSeconds: 60 },
  /** Auth-adjacent endpoints (OTP, signature, verification). */
  auth: { limit: 10, windowSeconds: 300 },
  /** Expensive compute (AI chat, PDF generation, reports). */
  expensive: { limit: 20, windowSeconds: 60 },
  /** Generic authenticated mutations. */
  mutation: { limit: 60, windowSeconds: 60 },
  /** Public reads (offerwall, tracker script). */
  publicRead: { limit: 300, windowSeconds: 60 },
} as const;

class PostgresRateLimiter implements RateLimiter {
  constructor(private url: string, private serviceKey: string) {}

  async check(key: string, limit: number, windowSeconds: number): Promise<RateLimitResult> {
    try {
      const res = await fetch(`${this.url}/rest/v1/rpc/consume_rate_limit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: this.serviceKey,
          Authorization: `Bearer ${this.serviceKey}`,
        },
        body: JSON.stringify({ _key: key, _limit: limit, _window_seconds: windowSeconds }),
      });
      if (!res.ok) throw new Error(`rate limiter ${res.status}`);
      const row = await res.json();
      return {
        allowed: !!row?.allowed,
        remaining: Number(row?.remaining ?? 0),
        resetAt: Date.parse(row?.reset_at ?? "") || Date.now() + windowSeconds * 1000,
      };
    } catch {
      // FAIL OPEN. A limiter outage must never take the product down; the
      // database still has RLS and validation behind it.
      return { allowed: true, remaining: limit, resetAt: Date.now() + windowSeconds * 1000 };
    }
  }
}

let limiter: RateLimiter | null = null;

export function getRateLimiter(): RateLimiter {
  if (!limiter) {
    limiter = new PostgresRateLimiter(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );
  }
  return limiter;
}

/** Swap in another backend (Redis, DigitalOcean) without touching handlers. */
export function setRateLimiter(next: RateLimiter) {
  limiter = next;
}

export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("cf-connecting-ip") || "unknown";
}

/**
 * Guard helper. Returns a 429 Response when the caller is over budget,
 * otherwise null. Usage:
 *
 *   const limited = await enforceRateLimit(req, "track", RateLimits.tracking);
 *   if (limited) return limited;
 */
export async function enforceRateLimit(
  req: Request,
  bucket: string,
  policy: { limit: number; windowSeconds: number },
  identity?: string,
): Promise<Response | null> {
  const id = identity || clientIp(req);
  const result = await getRateLimiter().check(`${bucket}:${id}`, policy.limit, policy.windowSeconds);
  if (result.allowed) return null;
  const retryAfter = Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1000));
  return new Response(JSON.stringify({ error: "Too many requests" }), {
    status: 429,
    headers: {
      "Content-Type": "application/json",
      "Retry-After": String(retryAfter),
      "X-RateLimit-Limit": String(policy.limit),
      "X-RateLimit-Remaining": "0",
    },
  });
}
