-- Allow authenticated users to read public pricing settings (not secret API keys)
DROP POLICY IF EXISTS "Anyone can read maintenance mode" ON public.admin_settings;

CREATE POLICY "Authenticated can read public settings"
ON public.admin_settings
FOR SELECT
TO authenticated
USING (key IN (
  'maintenance_mode',
  'activation_fee_usd',
  'usd_to_ngn_rate',
  'manual_mode_enabled',
  'active_payment_gateway',
  'platform_name',
  'platform_url',
  'price_per_download',
  'price_per_signup',
  'price_per_purchase',
  'ad_placement_fee',
  'external_referral_fee',
  'external_referral_min_balance'
));