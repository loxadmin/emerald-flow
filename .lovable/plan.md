# Ad Packages v2.2 + Category Enforcement + AI Mode Default

Four independent workstreams. All can ship in one pass.

---

## 1. Duration & daily-user rules per milestone type

**Rule:** duration and "per-day" pacing only apply to milestones that are ongoing/recurring. One-time acquisition milestones just deliver `N users` total, no timeline.

| Milestone | Duration applies? | Delivery unit |
| --- | --- | --- |
| App Install | No | total users |
| Sign Up | No | total users |
| KYC | No | total users |
| Deposit | No | total users |
| **Engagement** | **Yes** | users / day |
| **Transaction (Sale)** | **Yes** | users / day + txn amount + txn id |

Add `requires_duration boolean` to `milestones` (seed: true only for `engagement`, `transaction`, `sale`).

**Advertiser buy dialog (`Packages.tsx`):**
- Compute `needsDuration = selectedMs.some(m => m.requires_duration)`.
- Only render the Duration selector and "daily users" hint when `needsDuration` is true.
- For non-duration orders, label the units field "Users" (total). For duration orders, keep "Users / day".
- Order total = `units × price` (non-duration) OR `units × duration_days × price` (duration).

**`purchase_package_v2` RPC:** accept `_duration_days` as nullable. If any selected milestone `requires_duration`, require it; otherwise ignore/set NULL. Recompute escrow accordingly.

---

## 2. Manual delivery pipeline for package orders

Mirrors the existing manual campaign events flow.

**New table `package_order_deliveries`:**
```
id, order_id, milestone_id, delivery_date (date),
users_delivered int default 0,
csv_url text null,                -- for transaction uploads
txn_rows jsonb null,              -- [{user_ref, txn_id, amount_usd}]
total_txn_amount numeric null,
delivered_by uuid, created_at
```
Admin RPC `record_package_delivery(_order_id, _milestone_id, _date, _users, _txn_rows jsonb)` — validates admin, upserts by (order, milestone, date). For non-duration milestones, `date = order.starts_at::date` and only one row is allowed per milestone (cumulative users). For duration milestones, one row per (milestone, day).

**Admin UI:** new `AdminPackageDelivery.tsx` page (linked from `PackageOrders`/AdminPackages order row). Shows per-milestone entry:
- Engagement/App Install/Signup/KYC/Deposit → number input "users delivered".
- Transaction → CSV upload (`user_ref, txn_id, amount_usd`), parsed client-side, previewed, submitted as jsonb.

**Advertiser UI (`PackageOrders.tsx`):** for each order add "Delivery" section:
- Non-duration milestones: `X / target users delivered`.
- Duration milestones: daily table (date, users delivered) + running total.
- Transaction milestone: table of (user, txn id, amount) + total amount.

---

## 3. Strict category enforcement on ad packages

**Bug:** `advertiser_can_use_package` currently accepts `p.category_id IS NULL AND p.category_group_id IS NULL` implicitly nowhere — but the UI in `Packages.tsx` likely lists all `is_active` packages without filtering, or the RPC allows fallthrough. Also, packages tied to a `category_group_id` leak across sibling categories.

**Fixes:**
- `Packages.tsx` list query: filter `.eq('category_id', advertiserCategoryId)` OR `.eq('category_group_id', advertiserGroupId)` — never show unmatched packages.
- Tighten `advertiser_can_use_package`: require the advertiser to have an approved `advertiser_categories` row AND either an exact category match OR (group match AND package has no `category_id`). Reject if advertiser has no category.
- Admin package creator (`AdminPackages.tsx`): require exactly one of category OR category group (already true — enforce with a check constraint on `ad_packages`).
- Also gate the buy RPC by re-checking `advertiser_can_use_package` (already there) and add a UI toast when the advertiser opens a package URL they don't qualify for.

Note: allowing multiple milestones per package already works — no change needed beyond confirming the AdminPackages editor lets admin add/remove any subset of milestones (it does).

---

## 4. AI mode as default + smarter first question

**`ai-mode.tsx`:** change the initial state — if `localStorage[STORAGE_KEY]` is unset for a newly signed-in advertiser, default to `true` and persist. Existing users who explicitly turned it off keep their choice.

**Sign-in/sign-up flow:** in `auth.tsx` (or wherever post-auth redirect lives), set `ai_mode = "1"` on first successful auth if the key was never set.

**AI first-question copy (`KarbaliAssistant.tsx` / `assistant-nlp.ts` / `AiMode.tsx`):**
Instead of "Do you want Performance / Engagement / Commerce?", the assistant fetches the advertiser's category → looks up that category's **subcategories** (e.g. Mobile Gaming → "App installs", "In-app signups", "First deposits"; Streaming → "Subscribers", "Watch-time engagement"; Website → "Signups", "Newsletter opt-ins") and asks:

> "What are you trying to get? Pick one:"

rendered as a **clickable dropdown / select** of subcategory-driven goals, not a paragraph of buttons. Selecting an option routes to the matching campaign flow with the goal prefilled.

Goals are derived from `categories.name` + a new `categories.goal_options text[]` column (seeded per existing category). If empty, fall back to the three ad types.

---

## Technical summary

**DB migration (single):**
- `ALTER TABLE milestones ADD COLUMN requires_duration boolean DEFAULT false;` + seed engagement/sale/transaction = true.
- `ALTER TABLE categories ADD COLUMN goal_options text[] DEFAULT '{}';` + seed common goals.
- `CREATE TABLE package_order_deliveries(...)` + GRANTs + RLS (advertiser reads own, admin all).
- Replace `advertiser_can_use_package` with stricter version.
- Replace `purchase_package_v2` to make `_duration_days` optional.
- New `record_package_delivery` RPC (admin only).

**Frontend:**
- `src/pages/Packages.tsx` — conditional duration UI, category-filtered list, updated total calc.
- `src/pages/AdminPackages.tsx` — no functional change beyond confirming milestone multi-select works.
- `src/pages/PackageOrders.tsx` — delivery section.
- `src/pages/AdminPackageDelivery.tsx` — NEW.
- `src/lib/ai-mode.tsx` — default true for new users.
- `src/components/KarbaliAssistant.tsx` + `src/lib/assistant-nlp.ts` — subcategory-driven goal dropdown as first question.

**Out of scope:** wiring real conversion pipelines to auto-fill deliveries; that stays manual admin entry per your spec.

Approve and I'll ship the migration + all four UI workstreams in one pass.
