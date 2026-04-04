-- Category change requests table
CREATE TABLE public.category_change_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_id uuid NOT NULL,
  current_category_id uuid NOT NULL,
  requested_category_id uuid NOT NULL,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.category_change_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Advertisers can view own requests" ON public.category_change_requests
  FOR SELECT TO authenticated USING (auth.uid() = advertiser_id);
CREATE POLICY "Advertisers can insert own requests" ON public.category_change_requests
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = advertiser_id);
CREATE POLICY "Admins can manage all requests" ON public.category_change_requests
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Advertiser websites table (multiple websites per advertiser)
CREATE TABLE public.advertiser_websites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_id uuid NOT NULL,
  domain text NOT NULL,
  is_verified boolean NOT NULL DEFAULT false,
  otp_code text,
  otp_expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(advertiser_id, domain)
);

ALTER TABLE public.advertiser_websites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own websites" ON public.advertiser_websites
  FOR SELECT TO authenticated USING (auth.uid() = advertiser_id);
CREATE POLICY "Users can insert own websites" ON public.advertiser_websites
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = advertiser_id);
CREATE POLICY "Users can update own websites" ON public.advertiser_websites
  FOR UPDATE TO authenticated USING (auth.uid() = advertiser_id);
CREATE POLICY "Admins can manage all websites" ON public.advertiser_websites
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Add website_id and is_draft to campaigns
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS website_id uuid;
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS is_draft boolean NOT NULL DEFAULT false;

-- Migrate existing profile websites as verified websites
INSERT INTO public.advertiser_websites (advertiser_id, domain, is_verified)
SELECT p.id, p.website, true
FROM public.profiles p
WHERE p.website IS NOT NULL AND p.website != ''
ON CONFLICT (advertiser_id, domain) DO NOTHING;