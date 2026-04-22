INSERT INTO public.admin_settings (key, value, description)
VALUES ('admin_whatsapp_number', '+2348000000000', 'Admin WhatsApp number (E.164) advertisers send their verification code to')
ON CONFLICT (key) DO NOTHING;

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
  'min_price_per_download','min_price_per_signup','min_price_per_purchase',
  'admin_whatsapp_number'
]));