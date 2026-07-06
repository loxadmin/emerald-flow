# Ad Packages v2.1 — Selectable Milestones + Commission Sales

## What changes

1. **Advertisers choose which milestones they want** (per order), instead of the current "cumulative up-to-target" model. Someone running an engagement-only campaign for a streaming/gaming app can pick just `App Install + Engagement` and skip KYC / Signup.
2. **Mobile apps must include `App Install`.** It's the only mandatory milestone for `platform = mobile`. Web apps have no mandatory milestone (they land on a verified website — install doesn't apply).
3. **New global milestone: `Transaction`** (between Deposit and Sale). Admin catalog seeds it.
4. **`Sale` is commission-based, not fixed.** Admin sets a percentage (e.g. `5%`) instead of a per-user USD price. Commission is charged from the wallet per confirmed sale event, so it is NOT included in the upfront escrow total. All other milestones stay fixed `$/user`.

## Database

**`milestones`** — seed `Transaction` (order 55, between Deposit=50 and Sale=60). Add `is_commission_based boolean default false`; mark `sale` row `true`.

**`package_milestones`** — add `pricing_type text default 'flat'` (`'flat'` or `'commission_pct'`) and `commission_pct numeric` (nullable, 0–100). Keep `price_usd` nullable for commission rows. Constraint: exactly one of `price_usd` (flat) or `commission_pct` (commission) is set.

**`package_orders`** — add `selected_milestone_ids uuid[]` (the milestones the advertiser opted into for this order). `milestone_breakdown` jsonb keeps the priced snapshot including commission entries flagged `pricing_type: 'commission_pct'` with `commission_pct` value and `included_in_escrow: false`.

**`purchase_package_v2`** — new signature:
```
(_package_id, _units, _duration_days, _selected_milestone_ids uuid[], _platform, _links)
```
- Validate every id ∈ package's milestones.
- If `_platform = 'mobile'`, require the `app_install` milestone in the selection (look up by slug).
- Reject empty selection.
- Escrow total = `_units × SUM(price_usd)` over selected FLAT milestones only. Commission rows are recorded in the breakdown but not charged upfront.
- If only commission milestones selected → reject ("select at least one flat milestone to fund escrow").

**New RPC `charge_sale_commission(_order_id, _sale_amount_usd)`** — called by admin/edge function when a confirmed sale event lands. Looks up the order's commission_pct, deducts `sale_amount × pct/100` from wallet, records a `sale_commission` wallet transaction.

## Admin UI (`AdminPackages.tsx`)

Milestone editor row gets a "Pricing type" toggle:
- **Flat** → number input `$ / user` (current behavior).
- **Commission %** → number input `%` (only allowed on milestones flagged `is_commission_based`, i.e. `Sale`).

## Advertiser UI (`Packages.tsx`)

Replace the single "target milestone" radio with a **checkbox list of the package's milestones**:
- Mobile: `App Install` checkbox is checked & disabled (locked on).
- Each row shows either `+$X.XX/user` (flat) or `X% per sale — charged from wallet after each confirmed sale` (commission).
- Live total shows `units × SUM(selected flat prices)` and, if any commission row is selected, a note: "Plus X% commission per sale, deducted from your wallet as sales are confirmed."
- Reject purchase if only commission rows selected.

## Order detail (`PackageOrders.tsx`)

Breakdown lists selected milestones only. Commission rows show `X% per sale` badge instead of a total. Add a "Sales commission charged" running total pulled from `wallet_transactions` where `type = 'sale_commission'` and description references the order id.

## Out of scope for this change
- The event pipeline that fires `charge_sale_commission` on real sales (would hook off existing conversion tracking; can be a follow-up when we wire package orders into the tracker).
- Migrating existing orders — old orders keep their `target_milestone_id` and cumulative pricing; only new orders use `selected_milestone_ids`.

Approve and I'll ship the migration + UI in one pass.
