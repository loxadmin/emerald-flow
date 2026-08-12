# Production architecture

How this app is meant to scale, what is deliberately *not* built yet, and how to
move off Vercel/Supabase without a rewrite.

## 1. Layers

```text
Browser
  └── React + TanStack Query        cache + dedupe + background refresh
        └── src/lib/data/hooks.ts   the only place UI talks to server state
              └── src/lib/data/repository.ts   portable data access (no UI imports)
                    └── Supabase JS / Edge Functions
                          └── Postgres (RLS enforced)
```

Rules:

- UI components never call `supabase` directly. They call a hook.
- Hooks never inline a query. They call the repository.
- The repository is the only file that knows the backend is Supabase. Swapping
  to a REST API on DigitalOcean means rewriting that one module.

## 2. Client caching

`src/lib/query-keys.ts` is the single registry of cache keys and TTL policies:

| Policy     | staleTime | Use for                                   |
| ---------- | --------- | ----------------------------------------- |
| `static`   | 1 hour    | categories, packages, site content        |
| `standard` | 5 min     | campaigns, orders, profile                |
| `frequent` | 30 s      | wallet balance, pending queues            |
| `live`     | 0         | delivery metrics being actively edited    |

After any mutation, call `useInvalidate()` with the affected key prefix rather
than refetching by hand.

**Migration status:** the infrastructure and the hot paths are wired. Pages
still using `useEffect` fetching keep working unchanged — move them over as you
touch them, one page per change, rather than in a big-bang refactor.

## 3. Bundle strategy

- Every route except the landing page is `React.lazy`, wrapped in `Suspense`
  with a skeleton fallback.
- `vite.config.ts` pins heavy libraries into named vendor chunks
  (`three`, `recharts`, `framer-motion`, `supabase`). An advertiser who never
  opens a chart never downloads recharts, and shipping app code does not
  invalidate the vendor cache.

## 4. Database

Indexes exist for every hot filter/sort observed in `pg_stat_statements`:
`events(campaign_id, created_at)`, `tracking_sessions(tid)`,
`campaigns(advertiser_id, status)`, `package_orders`, `switch_offer_orders`,
`wallet_transactions`.

Conventions:

- No `select("*")` in new code — list the columns you render.
- Every list query is bounded (`.range()` / `.limit()`); Supabase caps at 1000
  rows and silently truncating is a data bug, not a performance one.
- Money and status transitions happen in `SECURITY DEFINER` RPCs, never in
  client-side updates. Column guard triggers reject privileged writes made
  through the `authenticated` role.

To find the next thing worth optimising, use the slow-query tooling and read
the plan with `EXPLAIN (ANALYZE, BUFFERS)` before adding an index.

## 5. Server-side caching — `supabase/functions/_shared/cache.ts`

Cache-aside over an interface. The default provider is per-isolate memory:
free, no ops burden, correct enough for short TTLs.

Currently cached: `api_keys` by key (the hottest lookup in the database, and a
mapping that is static for the life of the key, 60s TTL).

Never cache per-user or financial data — keys are shared across all callers of
an isolate.

Redis is **not** used, and at current volume it should not be. When the memory
cache is measurably insufficient (multi-region isolates thrashing, TTLs you
need longer than a deploy), implement `CacheProvider` against Upstash or a
managed Redis and call `setCacheProvider()` at boot. No call site changes.

## 6. Rate limiting — `supabase/functions/_shared/rate-limit.ts`

Public endpoints (`track`, `track-session`, `track-conversion`, `track-ping`,
`ext-track`, `offerwall`, `detect-offer`) are guarded per IP through a
Postgres-backed counter (`consume_rate_limit`).

- Postgres, not Redis: edge isolates scale independently so in-memory counters
  are wrong; the counter table is tiny and self-pruning.
- **Fails open.** A limiter outage returns "allowed" — RLS and validation are
  still behind it. Availability beats a perfect limit.
- Budgets live in `RateLimits`. Tune those constants, not the handlers.

## 7. Portability to DigitalOcean

| Concern       | Today                     | To move                                        |
| ------------- | ------------------------- | ---------------------------------------------- |
| Static assets | Vercel                    | Any static host / App Platform. Pure SPA build. |
| Rewrites      | `vercel.json`             | Equivalent nginx/App Platform routes.           |
| Data access   | `repository.ts`           | Reimplement that module against the new API.    |
| Functions     | Supabase Edge (Deno)      | Deno Deploy or a container; shared helpers are dependency-free. |
| Cache / limit | Interfaces + Postgres     | Provide new implementations, no handler edits.  |
| Secrets       | Supabase function secrets | See `.env.example` for the full list.           |

Nothing in the frontend imports a Vercel API, and nothing outside
`repository.ts` imports the Supabase client for data reads. That is what keeps
the exit cost low — keep it that way.

## 8. Secrets

`.env.example` documents both tiers. Anything prefixed `VITE_` is compiled into
the browser bundle and must never be a secret; the Supabase publishable key is
public by design and RLS is the protection. `SUPABASE_SERVICE_ROLE_KEY` and
`INTERNAL_TASK_SECRET` are server-only and must never reach client code.
