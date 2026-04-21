
-- 1. Admin 2FA codes table
CREATE TABLE IF NOT EXISTS public.admin_2fa_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  code_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_admin_2fa_user_active ON public.admin_2fa_codes (user_id, expires_at);
ALTER TABLE public.admin_2fa_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage own 2fa codes"
  ON public.admin_2fa_codes
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id AND has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (auth.uid() = user_id AND has_role(auth.uid(), 'admin'::app_role));

-- 2. Track verified 2FA sessions (per access_token jti) — simpler: use sessionStorage on client
--    Skipping a session table; we'll set a per-tab sessionStorage flag after verification.

-- 3. Seed admin-configurable global min price floors
INSERT INTO public.admin_settings (key, value, description)
VALUES
  ('min_price_per_download', '0.50', 'Global minimum advertiser price per download event (USD)'),
  ('min_price_per_signup', '0.50', 'Global minimum advertiser price per signup event (USD)'),
  ('min_price_per_purchase', '1.00', 'Global minimum advertiser price per purchase event (USD)')
ON CONFLICT (key) DO NOTHING;

-- 4. Allow advertisers to read the new min-price floors via the existing
--    "Authenticated can read public settings" policy — recreate it to include the new keys.
DROP POLICY IF EXISTS "Authenticated can read public settings" ON public.admin_settings;
CREATE POLICY "Authenticated can read public settings"
  ON public.admin_settings
  FOR SELECT
  TO authenticated
  USING (key = ANY (ARRAY[
    'maintenance_mode','activation_fee_usd','usd_to_ngn_rate','manual_mode_enabled',
    'active_payment_gateway','platform_name','platform_url',
    'price_per_download','price_per_signup','price_per_purchase',
    'ad_placement_fee','external_referral_fee','external_referral_min_balance',
    'min_price_per_download','min_price_per_signup','min_price_per_purchase'
  ]));

-- 5. Mark admin-created advertisers (optional flag for display)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS created_by_admin boolean NOT NULL DEFAULT false;
