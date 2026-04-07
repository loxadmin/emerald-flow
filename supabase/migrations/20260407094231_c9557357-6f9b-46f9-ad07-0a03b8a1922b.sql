
-- Add active_payment_gateway setting and flutterwave keys to admin_settings
INSERT INTO public.admin_settings (key, value, description)
VALUES 
  ('active_payment_gateway', 'paystack', 'Active payment gateway (paystack or flutterwave)'),
  ('flutterwave_public_key', 'FLWPUBK_TEST-SANDBOXDEMOKEY-X', 'Flutterwave public API key'),
  ('flutterwave_secret_key', 'FLWSECK_TEST-SANDBOXDEMOKEY-X', 'Flutterwave secret API key')
ON CONFLICT (key) DO NOTHING;

-- Add flutterwave fields to wallets table
ALTER TABLE public.wallets 
  ADD COLUMN IF NOT EXISTS flutterwave_psa_reference text,
  ADD COLUMN IF NOT EXISTS flutterwave_barter_id text,
  ADD COLUMN IF NOT EXISTS flutterwave_nuban text,
  ADD COLUMN IF NOT EXISTS flutterwave_bank_name text;
