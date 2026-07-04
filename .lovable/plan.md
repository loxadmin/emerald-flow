# Ad Packages v2 + Category enforcement

Rebuild the packages system around admin-managed milestones with strict category scoping, and lock the whole app so advertisers can only interact with their own category.

## 1. New concept: milestones

New table `milestones` (global catalog, admin-managed):
- `name` (e.g. "App install", "Signup", "KYC", "Engagement", "Deposit", "Sale")
- `slug`, `description`, `default_order` (int), `is_active`

New table `package_milestones` (per-package pricing + order):
- `package_id`, `milestone_id`, `step_order` (int), `price_usd`
- Unique on (package_id, milestone_id)

**Pricing math (locked from your answer):** advertiser picks target milestone X. Total = `units × SUM(price of every milestone in the package with step_order ≤ X.step_order)`. Duration is delivery window only, not a multiplier.

New admin page `/admin/milestones` — full CRUD.

## 2. `ad_packages` restructure

Add:
- `duration_options` int[] (e.g. `{30,60,90,365}`) — advertiser picks one at checkout
- `platform_support` text[] (e.g. `{mobile,web}`) — controls the platform toggle

Drop from active use (kept nullable for back-compat, unused by new UI):
- `unit_price_usd`, `unit_label`, `duration_days`, `discount_pct`

Keep: name, description, category_group_id, category_id, min_units, max_units, is_active, sort_order.

`max_links` becomes derived: web = 1, mobile = 2.

Every package MUST have a `category_group_id`. Subcategory optional.

## 3. `package_orders` restructure

Add columns:
- `platform` (`mobile` | `web`)
- `target_milestone_id` (which milestone the advertiser is buying up to)
- `duration_days` (already exists — now user-selected from `duration_options`)
- `milestone_breakdown` jsonb — snapshot `[{name, price, included:true}, …]` for admin review + advertiser receipt

`app_links` rules enforced by RPC:
- `web` → exactly 1 link, and it must exist in `advertiser_websites` for this user with `verified=true`
- `mobile` → 1 or 2 links

## 4. New RPC `purchase_package_v2`

Signature: `(_package_id, _units, _duration_days, _target_milestone_id, _platform, _links[])`

Validates:
1. Package active
2. Advertiser has a category in `advertiser_categories` matching package's `category_group_id` (and `category_id` if set) — otherwise reject "Package not available for your category"
3. Units in [min, max]
4. `_duration_days` ∈ `duration_options`
5. `_platform` ∈ `platform_support`
6. Links match platform rules; web link is verified for this advertiser
7. Target milestone belongs to package
8. Computes total = units × sum(prices where step_order ≤ target.step_order)
9. Deducts wallet → escrow → inserts order with `milestone_breakdown` snapshot, status `pending_review`

Old `purchase_package_with_wallet` kept but no longer wired to UI (safe to drop later).

## 5. Admin UI changes

**`/admin/milestones` (new):** table with add/edit/delete/toggle-active, drag-free numeric `default_order`.

**`/admin/packages` (rewrite of form):**
- Remove: unit label, unit price, duration_days, discount, max_links
- Add: duration options multi-checkbox (30/60/90/180/365 + custom), platform support checkboxes (mobile/web), milestones section — pick from global list, set `step_order` and `price_usd` per row
- Orders tab: show `platform`, `target_milestone`, and the milestone breakdown snapshot alongside total

## 6. Advertiser UI changes

**`/packages`:** server-side filtered by advertiser's category group + (subcategory if package has one). No "show all" escape hatch.

**Checkout dialog (rewritten):**
1. Platform toggle (only shows platforms the package supports)
2. Duration select (from package's duration_options)
3. Units input (min–max)
4. Target milestone select — shows ordered list with cumulative price; picking one auto-includes everything before it (grayed with checkmarks)
5. Link inputs — for web: dropdown of the advertiser's verified sites (blocked with "Verify a website first →" if none); for mobile: 1–2 free-text URL inputs
6. Live total = units × sum(prices up to selected milestone). Duration shown as "Delivered over D days"
7. Pay from wallet / Paystack

## 7. Category enforcement across the app

Root cause: nothing checks the advertiser's `advertiser_categories` before offering other flows.

Fix in these surfaces:
- **`CategorySelection` / `CampaignRouter` / `CreateCampaign`:** on mount, load the user's `advertiser_categories`. Only show/allow their own group's create flow. Deep links to a mismatched create page redirect back with a toast.
- **`DashboardLayout` sidebar:** hide "Websites" for anyone whose only groups are Engagement (websites are for Performance/Commerce tracking). Same rule hides "Offline offers" for non-Commerce, keep as-is if already correct.
- **`KarbaliAssistant` + `assistant-nlp.ts`:** intent handlers for "create engagement/performance/commerce ad" first check the user's groups; wrong-group intent replies "That's outside your category — you're set up for X" and offers to switch (link to category change request flow, already exists).
- **`/packages`:** server-filtered as above; no client-side "all" toggle.

## 8. Technical notes

- New migration: `milestones`, `package_milestones`, alter `ad_packages` (add duration_options, platform_support), alter `package_orders` (add platform, target_milestone_id, milestone_breakdown), RPC `purchase_package_v2`, updated `review_package_order` (no change needed to signature).
- All money still USD, displayed via existing NGN rate.
- Advertiser category scope helper: new SQL function `advertiser_can_use_package(_user, _package)` returning boolean — reused by RPC and by a `SELECT` RLS policy on `ad_packages` so the packages list is filtered at the DB layer.
- Seed a default milestone catalog: App install, Signup, KYC, Engagement, Deposit, Sale (default_order 10,20,30,40,50,60).

## Files touched

New: `supabase/migrations/…_packages_v2.sql`, `src/pages/AdminMilestones.tsx`
Rewrite: `src/pages/AdminPackages.tsx`, `src/pages/Packages.tsx`
Update: `src/pages/PackageOrders.tsx` (show platform + target milestone), `src/components/AdminLayout.tsx` (add Milestones link), `src/components/DashboardLayout.tsx` (hide Websites for Engagement-only), `src/App.tsx` (route for /admin/milestones), `src/pages/CategorySelection.tsx`, `src/pages/CampaignRouter.tsx`, `src/pages/CreateCampaign.tsx`, `src/components/KarbaliAssistant.tsx`, `src/lib/assistant-nlp.ts`

## Out of scope for this pass

- Migrating any existing package_orders created under the old pricing model (there shouldn't be real ones yet; old rows keep their historical fields).
- Milestone completion tracking / payout automation — orders still fulfill off-platform for now.