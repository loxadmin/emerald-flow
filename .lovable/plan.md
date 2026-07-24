# Offline LOI & Consumer Demand Reservation System

Replaces the current Offline verification/offers flow with a Letter of Intent–based reservation system. Advertisers reserve future customers, sign a digital LOI, wait for Karbali to reach their threshold, then launch campaigns targeting real migration opportunities.

## 1. Database changes (single migration)

New tables:
- `company_signature` (singleton, admin-only): signature_path, company_name, rep_name, rep_position
- `letters_of_intent`: advertiser_id, agreement_id (unique, e.g. `KRB-LOI-000123`), company_name, website, business_email, contact_person, job_title, phone, country, products (text[]), customer_goal (int), duration_days, custom_duration_text, campaign_goal, custom_goal_text, notes, advertiser_signature_path, karbali_signature_path_snapshot, karbali_rep_name_snapshot, karbali_rep_position_snapshot, pdf_path, status enum (`pending_admin_approval` → `approved` → `threshold_reached` → `campaign_launched`; plus `rejected`), current_progress (int, default 0), threshold_reached_at, admin_notes, generated_at, approved_at
- `migration_opportunities`: current_brand, target_brand, current_brand_logo_path, target_brand_logo_path, eligible_users (int), completion_rate (numeric), estimated_duration_days (int), estimated_cost_usd, is_active — admin-managed, shown at campaign-creation step

Extend `advertiser_categories.advertiser_type` to keep `offline` but skip wallet activation gating for offline users in app code (no schema change needed there).

New storage bucket `loi-documents` (private) for advertiser signatures, transparent signatures, and generated PDFs.

RLS:
- Advertisers: select/insert own LOI, no update once submitted; select own signature files.
- Admins: full access to LOIs, migration_opportunities, company_signature.
- Public: none.

RPCs:
- `submit_letter_of_intent(...)` — inserts LOI in `pending_admin_approval` (advertiser cannot download PDF yet).
- `approve_letter_of_intent(_loi_id)` — admin-only, sets `approved`, timestamps.
- `mark_threshold_reached(_loi_id)` — admin-only, flips status and triggers notification.
- `update_loi_progress(_loi_id, _current)` — admin-only manual bump.

## 2. Edge functions

- `process-signature`: accepts uploaded signature file, removes near-white background (server-side pixel threshold via a small canvas polyfill or pure PNG parse using `deno-canvas`), returns transparent PNG stored in `loi-documents/{advertiser_id}/signatures/`.
- `generate-loi-pdf`: uses `pdf-lib` (Deno esm) to render LOI with Karbali logo, company signature (from `company_signature` snapshot), agreement ID, all fields, and advertiser signature. Stores at `loi-documents/{advertiser_id}/loi/{agreement_id}.pdf`. Called after admin approval; also re-called if signatures change.
- `notify` reused: add `loi_submitted`, `loi_approved`, `threshold_reached` templates.

## 3. Admin UI

- `AdminCompanySignature.tsx` (`/admin/signature`) — upload signature PNG, set company name/rep/position (writes singleton row).
- Replace `AdminOffline.tsx` with `AdminLettersOfIntent.tsx` (`/admin/loi`):
  - Metrics: Total LOIs, Pending, Completed, Reserved demand (sum customer_goal), Thresholds reached.
  - Table: company, products, requested users, campaign goal, status, agreement ID, actions (approve, view PDF, mark threshold reached, edit progress).
- `AdminMigrationOpportunities.tsx` (`/admin/migration-opportunities`) — CRUD for migration pool cards used at campaign creation.

## 4. Advertiser UI

- Replace `OfflineVerification.tsx` + `OfflineOffers.tsx` + `OfflineOrders.tsx` with:
  - `OfflineLOI.tsx` (`/offline/loi`) — multi-step form: company info (with domain-vs-email validator), products (chip input), customer goal, duration (30/60/90/custom), campaign goal (options + custom), notes, signature upload panel with instructions. On submit → calls `process-signature` → `submit_letter_of_intent` → shows "pending approval" state.
  - `OfflineLOIStatus.tsx` (`/offline/loi/status`) — timeline: Generated → Approved → Threshold Reached → Campaign Launched, live progress bar, PDF download button (disabled until admin approves).
  - `OfflineCampaignLaunch.tsx` (`/offline/campaign`) — visible only when status = `threshold_reached`; renders migration opportunity cards from `migration_opportunities`, multi-select, then routes into campaign creation prefilled with the selected migrations.

## 5. Routing/auth changes

- `App.tsx`: remove `/offline/verify`, `/offline/offers`, `/offline/orders` in favor of `/offline/loi`, `/offline/loi/status`, `/offline/campaign`; add admin routes.
- Update `RequireCampaignType` and offline redirects to point to `/offline/loi`.
- Offline advertisers: skip $25 wallet activation gating (auth/dashboard gates check `advertiserType === 'offline'` and bypass wallet check until threshold reached).

## 6. Cleanup

Keep legacy tables (`business_verifications`, `offline_offers`, `offline_orders`) intact to avoid data loss but remove UI entry points and nav links. A follow-up migration can drop them after user confirms.

## Technical notes

- Signature background removal: `process-signature` reads the image with `Image` from `https://deno.land/x/imagescript`, walks pixels, sets alpha=0 where R,G,B > 235. Works for PNG/JPEG; PDFs are rejected with a clear message (or first-page rasterized via `pdf-lib` render — v2).
- PDF: `pdf-lib` with Helvetica; embed logo from `public/favicon.svg` rasterized, embed both signature PNGs. Store agreement_id as `KRB-LOI-` + zero-padded sequence from a Postgres sequence.
- Email domain check: extract host from website, ensure business_email endsWith the registrable domain (strip `www.`); reject free providers list (`gmail.com`, `yahoo.com`, `outlook.com`, `hotmail.com`, `icloud.com`, `protonmail.com`).
- Migration opportunities are admin-curated for v1 (auto-growth from user preferences deferred).