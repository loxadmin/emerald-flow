
# Offline Ads Category

A new advertiser vertical for businesses that sell offline (oil & gas, distributors, etc.). They don't connect a website — they upload a CAC business doc, get verified, fund their wallet, create offers, then admin manually relays orders that they accept and fulfill.

---

## 1. Category & Signup

- Add a new category **"Offline Ads"** (active, not partnership) to the `categories` table.
- Add new advertiser subtypes for the signup dropdown: **Oil & Gas** and **Distributor**, both routed to `advertiser_type = 'offline'`.
- Add new `advertiser_type` enum value `'offline'`.
- Signup remains open to any email (corporate or Gmail) — relax the business-domain check for offline subtypes only.

## 2. Business Verification (replaces website verification)

New table `business_verifications`:
- `advertiser_id`, `document_url`, `document_type` (CAC / business license), `status` (pending / approved / rejected), `admin_notes`, `reviewed_by`, `reviewed_at`.
- New storage bucket `business-documents` (private, RLS: owner can upload/read own, admins read all).
- Until approved, the advertiser dashboard shows **only** the upload card — no campaigns, wallet actions, etc.
- Admin panel gets an "Offline Verifications" page to approve/reject with notes; rejected → user can re-upload.

## 3. Wallet Activation

- Reuse existing wallet activation flow with a per-category fee setting `category_activation_fee:offline` (default $35, admin-editable in settings).
- Wallet must be activated before offer creation is unlocked.

## 4. Offer Creation (instead of campaigns)

New table `offline_offers`:
- `advertiser_id`, `product_name`, `description`
- `moq_value` (number), `moq_unit` (`liter` | `kg` | `piece`)
- `state` (one of 36 Nigerian states + FCT, seeded as a constant), `business_address`, `business_phone`, `business_email`
- `submission_fee` (snapshot, default $100), `status` (pending / approved / rejected), `admin_notes`
- timestamps

Submission flow:
- On submit, $100 moves wallet → escrow (new `wallet_transactions` row type `offer_escrow`).
- Admin approves → escrow deducted (kept by platform). Admin rejects → refunded to wallet.
- Admin-editable setting `offline_offer_submission_fee` (default $100).

## 5. Orders (admin-initiated)

New table `offline_orders`:
- `offer_id`, `advertiser_id`, `buyer_name`, `buyer_phone`, `buyer_email`, `quantity`, `unit_price`, `total_amount`
- `commission_rate` (snapshot, default 0.5%), `commission_amount`
- `status`: `pending_acceptance` → `accepted` → `fulfilled_by_advertiser` → `confirmed_by_admin` (or `expired` / `rejected`)
- `accept_deadline` (12h from creation), `fulfill_deadline` (12h from acceptance)
- timestamps + `notification_sent_at`

Lifecycle:
1. Admin creates a pending order → email + SMS notification to advertiser.
2. Advertiser has 12h to **Accept**. On accept, `commission = total × 0.5%` is deducted from wallet → platform. If wallet < commission, must top up first.
3. After accept, advertiser has 12h to click **Order Fulfilled**.
4. Admin reviews fulfillment → marks **Confirmed**.
5. Cron job expires orders past their deadlines.

Admin-editable setting `offline_commission_rate` (default 0.005) and `offline_min_wallet_balance` (default $300, enforced before accepting orders).

## 6. SMS notifications

- Add `RESEND_API_KEY` is already present for email. For SMS, we'll need an SMS provider — I'll use a simple Twilio-style edge function stub and ask you for credentials (Twilio SID/Token) when you're ready to wire real sending. Email will work immediately.

## 7. Admin UI additions

- **Offline Verifications**: list pending docs, view, approve/reject.
- **Offline Offers**: list pending offers, approve/reject (handles escrow).
- **Offline Orders**: create pending orders for any approved offer, mark fulfillment as confirmed.
- Settings: edit activation fee, submission fee, commission rate, min balance.

## 8. Advertiser UI additions

- Dashboard gating: doc upload → wallet activation → offers → orders.
- **Offers** page: create offer form (product, MOQ + unit, state dropdown, address, contact), list with status.
- **Orders** page: pending / accepted / fulfilled tabs, Accept and Fulfilled buttons with countdown timers.

---

## Technical notes

- New enum value `'offline'` added to `advertiser_type`.
- New tables: `business_verifications`, `offline_offers`, `offline_orders`. All with RLS (owner read/write own, admin manage all).
- New storage bucket `business-documents` with owner-folder RLS.
- New edge function `offline-orders` for state transitions (accept / fulfill / admin-create / admin-confirm) so wallet deductions and escrow stay server-side.
- Reuse existing wallet activation + escrow patterns.
- Pg_cron job to expire stale orders every 5 min.

---

## Questions before I build

1. **SMS provider**: do you already have Twilio (or another SMS provider) credentials, or should I scaffold the SMS code and you'll add credentials later? Email notifications will work immediately either way.
2. **Currency**: offers, orders, and the $100/$300/$35 thresholds — should these be in USD (matching the rest of the platform) and converted to NGN at display time using the existing `usd_to_ngn_rate` setting? I'll assume yes unless you say otherwise.
3. **Order pricing**: when admin creates a pending order, do they enter `total_amount` directly, or `quantity × unit_price`? I'll use `quantity × unit_price` (admin enters both) unless you prefer just a single total.

Once you confirm, I'll run the migration and build everything end-to-end.
