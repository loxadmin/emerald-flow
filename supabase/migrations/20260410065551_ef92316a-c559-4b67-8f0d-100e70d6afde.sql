
-- Advertiser type enums
CREATE TYPE public.advertiser_type AS ENUM ('engagement', 'performance', 'commerce');
CREATE TYPE public.advertiser_subtype AS ENUM ('musician', 'youtuber', 'app', 'website', 'ecommerce', 'service', 'real_estate');

-- Add type columns to advertiser_categories
ALTER TABLE public.advertiser_categories 
  ADD COLUMN advertiser_type public.advertiser_type,
  ADD COLUMN advertiser_subtype public.advertiser_subtype;

-- Add ad_type to campaigns
ALTER TABLE public.campaigns
  ADD COLUMN ad_type public.advertiser_type DEFAULT 'performance';

-- Creative campaigns table (for engagement ads: musicians & youtubers)
CREATE TABLE public.creative_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  advertiser_id UUID NOT NULL,
  media_type TEXT NOT NULL CHECK (media_type IN ('music', 'video')),
  media_link TEXT NOT NULL,
  transcription TEXT,
  transcription_confirmed BOOLEAN DEFAULT false,
  rate_per_interaction NUMERIC NOT NULL DEFAULT 0.20,
  min_interactions INTEGER NOT NULL DEFAULT 1000,
  placement_fee NUMERIC NOT NULL DEFAULT 10,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.creative_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view own creative campaigns"
  ON public.creative_campaigns FOR SELECT
  USING (auth.uid() = advertiser_id);

CREATE POLICY "Owners can create creative campaigns"
  ON public.creative_campaigns FOR INSERT
  WITH CHECK (auth.uid() = advertiser_id);

CREATE POLICY "Owners can update own creative campaigns"
  ON public.creative_campaigns FOR UPDATE
  USING (auth.uid() = advertiser_id);

CREATE POLICY "Admins can manage all creative campaigns"
  ON public.creative_campaigns FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Campaign questions table (auto-generated for engagement ads)
CREATE TABLE public.campaign_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  correct_answer BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.campaign_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view questions for active campaigns"
  ON public.campaign_questions FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage all questions"
  ON public.campaign_questions FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Offerwall interactions (tracks listener/viewer answers)
CREATE TABLE public.offerwall_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.campaign_questions(id) ON DELETE CASCADE,
  external_user_id TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL,
  attempt_number INTEGER NOT NULL DEFAULT 1,
  points_earned NUMERIC NOT NULL DEFAULT 0,
  charge_amount NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.offerwall_interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all interactions"
  ON public.offerwall_interactions FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role can insert interactions"
  ON public.offerwall_interactions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Owners can view own campaign interactions"
  ON public.offerwall_interactions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM campaigns WHERE campaigns.id = offerwall_interactions.campaign_id AND campaigns.advertiser_id = auth.uid()
  ));

-- Update existing categories to map to new types
-- We'll seed the 3 main ad types as top-level categories
INSERT INTO public.categories (name, description, is_active, is_partnership) VALUES
  ('Engagement Ads', 'For creatives: Musicians & YouTubers. Earn per listener/viewer through interactive offerwalls.', true, false),
  ('Performance Ads', 'For App & Website owners. Track downloads, signups, and purchases.', true, false),
  ('Commerce Ads', 'For E-commerce & Real Estate vendors. Track sales with flat fee + commission.', true, false)
ON CONFLICT DO NOTHING;
