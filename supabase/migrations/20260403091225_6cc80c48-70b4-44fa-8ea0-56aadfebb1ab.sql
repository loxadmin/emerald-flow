
-- Add partnership flag to categories
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS is_partnership boolean NOT NULL DEFAULT false;

-- Create external referral programs table
CREATE TABLE IF NOT EXISTS public.external_referral_programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  advertiser_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  referral_guide text NOT NULL DEFAULT '',
  compensation_structure text NOT NULL DEFAULT '',
  registration_link text NOT NULL DEFAULT '',
  admin_referral_code text,
  admin_referral_link text,
  activation_fee_paid boolean NOT NULL DEFAULT false,
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.external_referral_programs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all external referral programs"
  ON public.external_referral_programs FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Advertisers can view own external referral programs"
  ON public.external_referral_programs FOR SELECT TO authenticated
  USING (auth.uid() = advertiser_id);

CREATE POLICY "Advertisers can insert own external referral programs"
  ON public.external_referral_programs FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = advertiser_id);

CREATE POLICY "Advertisers can update own external referral programs"
  ON public.external_referral_programs FOR UPDATE TO authenticated
  USING (auth.uid() = advertiser_id);

-- Add external_referral_fee admin setting
INSERT INTO public.admin_settings (key, value, description) VALUES
  ('external_referral_fee', '50.00', 'Fee to activate external referral program (USD)'),
  ('external_referral_min_balance', '200.00', 'Minimum wallet balance for external referral program (USD)')
ON CONFLICT (key) DO NOTHING;
