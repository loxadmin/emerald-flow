# Compatibility Audit — Provider Isolation (no code changed)

No files were modified. This is the audit and migration design you asked for.

## A. Actual architecture today

```text
Browser (Vite SPA, React 18, TanStack Query partially adopted)
  ├─ @supabase/supabase-js  → https://dvkoafztquswcqniwcyf.supabase.co
  │     ├─ PostgREST  (direct table reads/writes, RLS enforced)
  │     ├─ Auth       (password login, session in localStorage)
  │     ├─ Storage    (avatars, campaign-media — upload + signed URLs)
  │     └─ Functions  (34 edge functions via functions.invoke)
  └─ advertiser.karbali.com/api/*  → Vercel rewrite → edge functions (tracking only)
```

There is **no application server**. "Backend" in this project means Supabase Edge Functions (Deno). Any `/api/*` boundary must be edge functions fronted by the existing Vercel rewrite layer.

## B. Frontend Supabase surface (measured)

| Surface | Count | Notes |
| --- | --- | --- |
| Files importing the client | 70 | every page + 10 components |
| Distinct tables queried from the browser | 52 | top: campaigns 30, admin_settings 26, profiles 22, events 17, wallets 15 |
| SECURITY DEFINER RPCs called | 20 | escrow, purchases, withdrawals, LOI, deliveries |
| Storage call sites | 13 | avatars, campaign-media, LOI PDFs, signatures |
| `supabase.auth.*` call sites | 25 | signUp, signInWithPassword, getSession, onAuthStateChange, signOut |
| Realtime subscriptions | **0** | nothing to preserve here — removes the biggest risk |

## C. Paystack — already isolated

The browser never talks to the Paystack API. All of it runs server-side in `paystack-wallet`, `paystack-verify`, `paystack-webhook`. The client only calls `functions.invoke("paystack-wallet")` and redirects to the Paystack-hosted checkout URL (that redirect is required by Paystack and cannot be proxied). `PAYSTACK_SECRET_KEY` is not in the bundle. **Nothing to migrate.**

## D. Authentication

Supabase Auth, password grant, session persisted in `localStorage`, refreshed by the SDK, admin role read from `user_roles` via RLS, plus a separate admin 2FA flag. Every PostgREST call and every edge function authorises off that JWT.

Removing Supabase Auth from the browser means minting and refreshing our own session cookie and re-signing a Supabase JWT server-side for every request. That is a rewrite of the security core, and it risks logging out every existing user. **Recommendation: do not move auth.**

## E. What is actually exposed in DevTools

- Supabase origin and table names in request URLs (`profiles?select=id`, `admin_settings?...`).
- `vendor-supabase-*.js` chunk (comes from the `manualChunks` entry in `vite.config.ts`).
- Publishable anon key — public by design; RLS is the protection.

Not exposed: service-role key, Paystack secret, Resend key, `INTERNAL_TASK_SECRET`, database URL. Data-level exposure is already governed by RLS plus the `guard_*_privileged_columns` triggers, so hiding table names is **obfuscation, not an authorisation fix**.

## F. Risk classification

| Item | Risk | Why |
| --- | --- | --- |
| Domain masking of Supabase calls via `/api/*` proxy | LOW | pure transport change |
| Public/read-only reads (site_content, blogs, categories, packages) behind an endpoint | LOW | no auth coupling |
| Authenticated reads (profile, wallet, campaigns, orders) behind endpoints | MEDIUM | needs an adapter per shape; 70 call sites |
| Admin pages (30+ pages, ad-hoc queries and joins) behind `/api/admin/*` | MEDIUM-HIGH | each page has bespoke selects; high regression surface |
| Storage uploads/signed URLs through the backend | MEDIUM-HIGH | streams multi-MB files through a Deno isolate; latency and size limits |
| Moving Supabase Auth behind our own session | **HIGH** | logs users out, rewrites session refresh, admin 2FA and every RLS assumption |
| Dropping `@supabase/supabase-js` from the bundle | **HIGH** | only possible after auth + storage + all 52 tables are migrated |

## G. Honest assessment

Full provider isolation as specified requires reimplementing ~52 tables' worth of queries, 20 RPCs, storage and auth as REST endpoints — effectively touching all 70 frontend files, with no application server to host them. The security gain over the current RLS + trigger + definer-RPC model is mostly obfuscation, and the regression risk to wallets, escrow and admin flows is real.

## H. Proposed migration (smallest safe path)

**Phase 0 — transport masking (LOW risk, big visible win).**
Point the Supabase client's URL at `https://advertiser.karbali.com/api/db` via Vercel rewrites, rename the vendor chunk, and keep the SDK. DevTools then shows first-party URLs instead of `*.supabase.co`. Zero behaviour change, zero query rewrites.

**Phase 1 — read consolidation.** Move public and dashboard reads into a small set of edge endpoints (`/api/content`, `/api/dashboard`, `/api/wallet`) that return exactly the shapes the pages already expect, wired through the existing `repository.ts` seam so pages don't change.

**Phase 2 — admin reads.** `/api/admin/*` endpoints per admin page, one page at a time, verified before the next.

**Phase 3 — writes and RPCs.** Wrap the 20 definer RPCs behind endpoints (they already carry the business logic server-side, so this is a call-site swap).

**Phase 4 — storage.** Backend-issued signed upload URLs; the browser still PUTs the bytes directly (avoids proxying large files).

**Phase 5 — auth.** Only if you still want it after 0–4, and only with a staged cutover plan.

Phases 2–5 remove direct table names; Phase 5 is what finally removes the SDK. Each phase is independently shippable and independently revertible.

## I. Files that would change (Phase 0 only)

- `vite.config.ts` (chunk name)
- `vercel.json` (one rewrite)
- `src/integrations/supabase/client.ts` (base URL)

## J. Files that must not be touched

`supabase/functions/paystack-*`, `manage-campaign`, all `guard_*` triggers and definer RPCs, `src/lib/auth.tsx` (until Phase 5), all migrations.

## K. Recommendation

Approve **Phase 0** now — it eliminates the visible `supabase.co`/`vendor-supabase` footprint you objected to, with no functional risk. Then decide whether Phases 1–4 are worth their regression cost, and treat Phase 5 as a separate project.

No code will be written until you approve.
