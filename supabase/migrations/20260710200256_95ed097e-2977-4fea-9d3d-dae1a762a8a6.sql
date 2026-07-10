
-- Target ad packages strictly by advertiser subtype(s)
ALTER TABLE public.ad_packages
  ADD COLUMN IF NOT EXISTS advertiser_subtypes advertiser_subtype[] NOT NULL DEFAULT '{}';

-- Backfill existing packages from their group so nothing goes dark
UPDATE public.ad_packages p
SET advertiser_subtypes = CASE g.slug
  WHEN 'engagement'       THEN ARRAY['musician','youtuber','social_media_creator']::advertiser_subtype[]
  WHEN 'performance'      THEN ARRAY['app','website','fintech']::advertiser_subtype[]
  WHEN 'commerce'         THEN ARRAY['ecommerce','online_vendor','realtor']::advertiser_subtype[]
  WHEN 'daily_essentials' THEN ARRAY['food_beverage','household_items']::advertiser_subtype[]
  WHEN 'mainstream'       THEN ARRAY['telecom','oil_gas']::advertiser_subtype[]
  ELSE '{}'::advertiser_subtype[]
END
FROM public.category_groups g
WHERE p.category_group_id = g.id
  AND (p.advertiser_subtypes IS NULL OR array_length(p.advertiser_subtypes,1) IS NULL);

-- Strict subtype-based eligibility check
CREATE OR REPLACE FUNCTION public.advertiser_can_use_package(_user uuid, _package_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.ad_packages p
    JOIN public.advertiser_categories ac ON ac.advertiser_id = _user
    WHERE p.id = _package_id
      AND p.is_active = true
      AND ac.advertiser_subtype IS NOT NULL
      AND ac.advertiser_subtype = ANY(p.advertiser_subtypes)
  );
$$;
