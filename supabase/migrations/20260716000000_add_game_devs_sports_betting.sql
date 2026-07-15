ALTER TYPE public.advertiser_subtype ADD VALUE IF NOT EXISTS 'game_developers';
ALTER TYPE public.advertiser_subtype ADD VALUE IF NOT EXISTS 'sports_betting';

CREATE OR REPLACE FUNCTION public.karbali_subtype_to_type(_subtype text)
RETURNS public.advertiser_type
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN _subtype IN ('musician', 'youtuber', 'social_media_creator') THEN 'engagement'::public.advertiser_type
    WHEN _subtype IN ('app', 'website', 'fintech', 'game_developers', 'sports_betting') THEN 'performance'::public.advertiser_type
    WHEN _subtype IN ('ecommerce', 'online_vendor', 'realtor', 'service', 'real_estate') THEN 'commerce'::public.advertiser_type
    WHEN _subtype IN ('food_beverage', 'household_items', 'telecom', 'oil_gas', 'distributor') THEN 'offline'::public.advertiser_type
    ELSE NULL::public.advertiser_type
  END
$$;

CREATE OR REPLACE FUNCTION public.karbali_normalize_subtype(_subtype text)
RETURNS public.advertiser_subtype
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN _subtype IN ('musician', 'youtuber', 'social_media_creator', 'app', 'website', 'fintech', 'ecommerce', 'online_vendor', 'realtor', 'food_beverage', 'household_items', 'telecom', 'oil_gas', 'game_developers', 'sports_betting')
      THEN _subtype::public.advertiser_subtype
    WHEN _subtype = 'service' THEN 'online_vendor'::public.advertiser_subtype
    WHEN _subtype = 'real_estate' THEN 'realtor'::public.advertiser_subtype
    WHEN _subtype = 'distributor' THEN 'household_items'::public.advertiser_subtype
    ELSE NULL::public.advertiser_subtype
  END
$$;

CREATE OR REPLACE FUNCTION public.karbali_subtype_to_group_slug(_subtype text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN _subtype IN ('musician', 'youtuber', 'social_media_creator') THEN 'engagement'
    WHEN _subtype IN ('app', 'website', 'fintech', 'game_developers', 'sports_betting') THEN 'performance'
    WHEN _subtype IN ('ecommerce', 'online_vendor', 'realtor', 'service', 'real_estate') THEN 'commerce'
    WHEN _subtype IN ('food_beverage', 'household_items', 'distributor') THEN 'daily_essentials'
    WHEN _subtype IN ('telecom', 'oil_gas') THEN 'mainstream'
    ELSE NULL
  END
$$;

-- Update existing performance packages in ad_packages to allow the new performance subtypes
UPDATE public.ad_packages p
SET advertiser_subtypes = ARRAY['app','website','fintech','game_developers','sports_betting']::public.advertiser_subtype[]
FROM public.category_groups g
WHERE p.category_group_id = g.id
  AND g.slug = 'performance';
