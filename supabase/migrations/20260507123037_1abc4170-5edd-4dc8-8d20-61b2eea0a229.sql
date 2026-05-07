-- Allow authenticated users to read per-category activation fee settings
DROP POLICY IF EXISTS "Authenticated can read public settings" ON public.admin_settings;

CREATE POLICY "Authenticated can read public settings"
ON public.admin_settings
FOR SELECT
TO authenticated
USING (
  key = ANY (ARRAY[
    'maintenance_mode','activation_fee_usd','usd_to_ngn_rate','manual_mode_enabled',
    'active_payment_gateway','platform_name','platform_url','price_per_download',
    'price_per_signup','price_per_purchase','ad_placement_fee','external_referral_fee',
    'external_referral_min_balance','min_price_per_download','min_price_per_signup',
    'min_price_per_purchase','admin_whatsapp_number'
  ])
  OR key LIKE 'category_activation_fee:%'
  OR key LIKE 'category_events:%'
);