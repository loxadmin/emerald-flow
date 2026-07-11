CREATE OR REPLACE FUNCTION public.karbali_subtype_to_type(_subtype text)
RETURNS public.advertiser_type
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN _subtype IN ('musician', 'youtuber', 'social_media_creator') THEN 'engagement'::public.advertiser_type
    WHEN _subtype IN ('app', 'website', 'fintech') THEN 'performance'::public.advertiser_type
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
    WHEN _subtype IN ('musician', 'youtuber', 'social_media_creator', 'app', 'website', 'fintech', 'ecommerce', 'online_vendor', 'realtor', 'food_beverage', 'household_items', 'telecom', 'oil_gas')
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
    WHEN _subtype IN ('app', 'website', 'fintech') THEN 'performance'
    WHEN _subtype IN ('ecommerce', 'online_vendor', 'realtor', 'service', 'real_estate') THEN 'commerce'
    WHEN _subtype IN ('food_beverage', 'household_items', 'distributor') THEN 'daily_essentials'
    WHEN _subtype IN ('telecom', 'oil_gas') THEN 'mainstream'
    ELSE NULL
  END
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  selected_subtype_text text;
  selected_subtype public.advertiser_subtype;
  selected_type public.advertiser_type;
  selected_group_slug text;
  selected_category_id uuid;
  selected_status text;
BEGIN
  selected_subtype_text := NULLIF(NEW.raw_user_meta_data->>'advertiser_subtype', '');
  selected_subtype := public.karbali_normalize_subtype(selected_subtype_text);
  selected_type := public.karbali_subtype_to_type(selected_subtype_text);
  selected_group_slug := public.karbali_subtype_to_group_slug(selected_subtype_text);

  INSERT INTO public.profiles (id, email, full_name, company_name, website, terms_accepted_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NULLIF(NEW.raw_user_meta_data->>'company_name', ''),
    NULLIF(NEW.raw_user_meta_data->>'website', ''),
    NULLIF(NEW.raw_user_meta_data->>'terms_accepted_at', '')::timestamptz
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    company_name = EXCLUDED.company_name,
    website = EXCLUDED.website,
    terms_accepted_at = COALESCE(public.profiles.terms_accepted_at, EXCLUDED.terms_accepted_at);

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;

  IF selected_subtype IS NOT NULL AND selected_type IS NOT NULL AND selected_group_slug IS NOT NULL THEN
    SELECT c.id, CASE WHEN c.is_active THEN 'active' ELSE 'waiting_list' END
      INTO selected_category_id, selected_status
    FROM public.categories c
    JOIN public.category_groups g ON g.id = c.group_id
    WHERE g.slug = selected_group_slug
    ORDER BY CASE
      WHEN c.name IN ('Engagement Ads', 'Performance Ads', 'Commerce Ads', 'Daily Essentials Ads', 'Mainstream Ads') THEN 0
      ELSE 1
    END, c.created_at
    LIMIT 1;

    IF selected_category_id IS NOT NULL THEN
      INSERT INTO public.advertiser_categories (advertiser_id, category_id, status, advertiser_type, advertiser_subtype)
      VALUES (NEW.id, selected_category_id, selected_status, selected_type, selected_subtype)
      ON CONFLICT (advertiser_id) DO UPDATE SET
        advertiser_type = COALESCE(public.advertiser_categories.advertiser_type, EXCLUDED.advertiser_type),
        advertiser_subtype = COALESCE(public.advertiser_categories.advertiser_subtype, EXCLUDED.advertiser_subtype),
        category_id = CASE
          WHEN public.advertiser_categories.advertiser_subtype IS NULL THEN EXCLUDED.category_id
          ELSE public.advertiser_categories.category_id
        END;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

WITH user_meta AS (
  SELECT
    u.id AS user_id,
    public.karbali_normalize_subtype(NULLIF(u.raw_user_meta_data->>'advertiser_subtype', '')) AS normalized_subtype,
    public.karbali_subtype_to_type(NULLIF(u.raw_user_meta_data->>'advertiser_subtype', '')) AS normalized_type,
    public.karbali_subtype_to_group_slug(NULLIF(u.raw_user_meta_data->>'advertiser_subtype', '')) AS group_slug,
    NULLIF(u.raw_user_meta_data->>'terms_accepted_at', '')::timestamptz AS terms_at
  FROM auth.users u
), mapped AS (
  SELECT
    um.user_id,
    um.normalized_subtype,
    um.normalized_type,
    c.id AS category_id,
    CASE WHEN c.is_active THEN 'active' ELSE 'waiting_list' END AS status,
    um.terms_at
  FROM user_meta um
  JOIN public.category_groups g ON g.slug = um.group_slug
  JOIN LATERAL (
    SELECT c.*
    FROM public.categories c
    WHERE c.group_id = g.id
    ORDER BY CASE
      WHEN c.name IN ('Engagement Ads', 'Performance Ads', 'Commerce Ads', 'Daily Essentials Ads', 'Mainstream Ads') THEN 0
      ELSE 1
    END, c.created_at
    LIMIT 1
  ) c ON true
  WHERE um.normalized_subtype IS NOT NULL AND um.normalized_type IS NOT NULL
)
INSERT INTO public.advertiser_categories (advertiser_id, category_id, status, advertiser_type, advertiser_subtype)
SELECT user_id, category_id, status, normalized_type, normalized_subtype
FROM mapped
ON CONFLICT (advertiser_id) DO UPDATE SET
  advertiser_type = COALESCE(public.advertiser_categories.advertiser_type, EXCLUDED.advertiser_type),
  advertiser_subtype = COALESCE(public.advertiser_categories.advertiser_subtype, EXCLUDED.advertiser_subtype),
  category_id = CASE
    WHEN public.advertiser_categories.advertiser_subtype IS NULL THEN EXCLUDED.category_id
    ELSE public.advertiser_categories.category_id
  END;

WITH user_terms AS (
  SELECT u.id AS user_id, NULLIF(u.raw_user_meta_data->>'terms_accepted_at', '')::timestamptz AS terms_at
  FROM auth.users u
  WHERE NULLIF(u.raw_user_meta_data->>'terms_accepted_at', '') IS NOT NULL
)
UPDATE public.profiles p
SET terms_accepted_at = COALESCE(p.terms_accepted_at, ut.terms_at)
FROM user_terms ut
WHERE p.id = ut.user_id;

GRANT EXECUTE ON FUNCTION public.karbali_subtype_to_type(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.karbali_normalize_subtype(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.karbali_subtype_to_group_slug(text) TO authenticated, service_role;