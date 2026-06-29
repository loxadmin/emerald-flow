# Ad Packages (Ad Templates)

Admin-created, pre-priced ad templates that advertisers buy in one click instead of building a full campaign. Each template targets a category or subcategory, has a fixed unit (e.g. daily user), price per unit, duration, and a min/max range the advertiser can choose from.

---

## 1. Data model

New table `ad_packages` (admin-managed):
- `name`, `description`, `image_url`
- `category_group_id` (Engagement / Performance / Commerce) and optional `category_id` (subcategory like Fintech)
- `mode` (`online` | `offline`) — defaults to `online`
- `unit_label` (e.g. "daily user", "install", "transacting user")
- `unit_price_usd` (e.g. 1.20)
- `min_units`, `max_units` (e.g. 500 → 10,000)
- `duration_days` (e.g. 30)
- `max_links` (default 3)
- `discount_pct` (optional, for display)
- `is_active`, `sort_order`, timestamps

New table `package_orders` (advertiser purchases):
- `advertiser_id`, `package_id` (snapshot of name/unit/price kept too)
- `units`, `unit_price_usd`, `duration_days`, `total_amount_usd`
- `app_links` (text[] up to 3)
- `payment_method` (`wallet` | `paystack`), `payment_reference`
- `status`: `pending_payment` → `pending_review` → `approved` → `active` → `completed` (or `rejected`, `refunded`)
- `admin_notes`, `reviewed_by`, `reviewed_at`, `starts_at`, `ends_at`
- timestamps

RLS:
- `ad_packages`: anyone authenticated can SELECT active ones; only admins write.
- `package_orders`: owner reads/inserts own; admin reads/updates all.

RPC `purchase_package_with_wallet(_package_id, _units, _links[])` — validates, deducts wallet → escrow, creates order in `pending_review`.

## 2. Admin UI — `/admin/packages`

New page `AdminPackages.tsx`:
- Table of all packages with toggle active, edit, delete.
- Create/Edit dialog: pick group + optional subcategory, unit label, unit price, min/max units, duration, max links, description, image.
- Orders tab: list `pending_review` package orders → Approve / Reject (with notes). Approve sets `status=active`, `starts_at=now()`, `ends_at=now()+duration`.

Add link in `AdminLayout` sidebar.

## 3. Advertiser UI

New page `/packages` (`Packages.tsx`):
- Lists active packages filtered to the advertiser's group/subcategory (Engagement-only advertisers see Engagement packages, etc.).
- Each card shows: name, unit, price/unit, duration, range, sample total.
- "Buy" button → opens `PackageCheckout` dialog.

`PackageCheckout` dialog:
- Slider/input to pick units (min–max), live total calculation.
- Up to 3 app link inputs (validated URLs).
- Payment choice: **Wallet** (if balance ≥ total) or **Paystack** (calls existing `paystack-wallet` flow with a `package_order_id` metadata).
- On wallet pay → call RPC → success → order in pending review.
- On Paystack pay → create order in `pending_payment` → redirect; `paystack-webhook` marks paid and moves to `pending_review`.

New page `/packages/orders` (`PackageOrders.tsx`): advertiser sees their package orders, status, dates, links.

Add "Ad Packages" link in `DashboardLayout` sidebar (above Create Campaign).

## 4. Paystack webhook update

Extend `supabase/functions/paystack-webhook` to recognize `package_order_id` in metadata: on `charge.success` mark that order paid and `status=pending_review` (no wallet credit).

## 5. AI assistant

Add a small intent in `assistant-nlp.ts` so "packages", "ad templates", "buy package" navigates to `/packages`.

---

## Technical notes

- All money in USD, displayed in NGN using existing `usd_to_ngn_rate` setting.
- Package orders do not create rows in `campaigns` — they are their own track. Admin fulfills them off-platform / manually attaches to campaigns later (out of scope here).
- Escrow on wallet purchase uses a new `wallet_transactions.type = 'package_escrow'`. Rejection refunds via RPC `refund_package_order`.
- Cron (reuse existing scheduler) marks `active` → `completed` when `ends_at < now()`.

## Open questions

1. Should rejected Paystack-paid orders refund to the **wallet** or back to the card? (Default: credit to wallet — simpler.)
2. Should packages be visible to **all** advertisers regardless of category, or strictly filtered to their group? (Default: strictly filtered, with an "All packages" toggle.)
3. Do you want a featured/discount badge on certain packages on the listing page? (Default: yes, using `discount_pct`.)
