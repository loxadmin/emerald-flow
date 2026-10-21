-- Add placement_fee to wallet_transactions type check
ALTER TABLE public.wallet_transactions DROP CONSTRAINT IF EXISTS wallet_transactions_type_check;
ALTER TABLE public.wallet_transactions ADD CONSTRAINT wallet_transactions_type_check
CHECK (type = ANY (ARRAY['funding','charge','activation','refund','escrow','package_escrow','escrow_topup','offer_escrow','switch_offer_escrow','offline_commission','sale_commission','manual_conversion','manual_adjustment','placement_fee']));

-- Helper function or inline calculation:
-- If campaign/package cost <= 500 then placement fee is $5; above 500 is $10.

-- 1. purchase_package_v2
CREATE OR REPLACE FUNCTION public.purchase_package_v2(_package_id uuid, _units integer, _duration_days integer, _selected_milestone_ids uuid[], _platform text, _links text[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _user uuid := auth.uid();
  _pkg record;
  _wallet record;
  _total numeric := 0;
  _placement_fee numeric := 0;
  _grand_total numeric := 0;
  _order_id uuid;
  _links_count integer := COALESCE(array_length(_links,1),0);
  _sel_count integer := COALESCE(array_length(_selected_milestone_ids,1),0);
  _invalid_count integer;
  _has_flat boolean;
  _has_commission boolean;
  _needs_duration boolean;
  _effective_duration integer;
  _breakdown jsonb;
  _commission_reserve_per_user numeric := 1;
  _allowed_platforms text[] := ARRAY['mobile','web','youtube','spotify','instagram','tiktok'];
BEGIN
  SELECT * INTO _pkg FROM ad_packages WHERE id = _package_id AND is_active = true;
  IF NOT FOUND THEN RAISE EXCEPTION 'Package not found'; END IF;

  IF NOT advertiser_can_use_package(_user, _package_id) THEN
    RAISE EXCEPTION 'Package not available for your category';
  END IF;

  IF _units < _pkg.min_units OR _units > _pkg.max_units THEN
    RAISE EXCEPTION 'Units must be between % and %', _pkg.min_units, _pkg.max_units;
  END IF;

  IF NOT (_platform = ANY(_allowed_platforms)) OR NOT (_platform = ANY(_pkg.platform_support)) THEN
    RAISE EXCEPTION 'Invalid platform for this package';
  END IF;

  IF _platform = 'web' THEN
    IF _links_count <> 1 THEN RAISE EXCEPTION 'Web-app orders require exactly 1 link'; END IF;
    IF NOT EXISTS (
      SELECT 1 FROM advertiser_websites
      WHERE advertiser_id = _user AND is_verified = true
        AND (domain = _links[1] OR _links[1] ILIKE '%'||domain||'%')
    ) THEN
      RAISE EXCEPTION 'Web link must be one of your verified websites';
    END IF;
  ELSIF _platform = 'mobile' THEN
    IF _links_count < 1 OR _links_count > 2 THEN
      RAISE EXCEPTION 'Mobile orders require 1 or 2 app links';
    END IF;
  ELSE
    IF _links_count <> 1 THEN
      RAISE EXCEPTION 'This platform requires exactly 1 link';
    END IF;
  END IF;

  IF _sel_count = 0 THEN RAISE EXCEPTION 'Select at least one milestone'; END IF;

  SELECT COUNT(*) INTO _invalid_count
  FROM unnest(_selected_milestone_ids) AS sid
  WHERE NOT EXISTS (
    SELECT 1 FROM package_milestones
    WHERE package_id = _pkg.id AND milestone_id = sid
  );
  IF _invalid_count > 0 THEN RAISE EXCEPTION 'Invalid milestone selection'; END IF;

  IF _platform = 'mobile' THEN
    IF NOT EXISTS (
      SELECT 1 FROM milestones m
      WHERE m.slug = 'app_install' AND m.id = ANY(_selected_milestone_ids)
    ) AND EXISTS (
      SELECT 1 FROM package_milestones pm JOIN milestones m ON m.id = pm.milestone_id
      WHERE pm.package_id = _pkg.id AND m.slug = 'app_install'
    ) THEN
      RAISE EXCEPTION 'App Install is required for mobile-app orders';
    END IF;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM milestones m
    WHERE m.id = ANY(_selected_milestone_ids) AND m.requires_duration = true
  ) INTO _needs_duration;

  IF _needs_duration THEN
    IF _duration_days IS NULL OR _duration_days <= 0 THEN
      RAISE EXCEPTION 'Duration is required for engagement/transaction milestones';
    END IF;
    IF NOT (_duration_days = ANY(_pkg.duration_options)) THEN
      RAISE EXCEPTION 'Invalid duration';
    END IF;
    _effective_duration := _duration_days;
  ELSE
    _effective_duration := NULL;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM package_milestones
    WHERE package_id = _pkg.id
      AND milestone_id = ANY(_selected_milestone_ids)
      AND pricing_type = 'flat'
  ) INTO _has_flat;

  SELECT EXISTS (
    SELECT 1 FROM package_milestones
    WHERE package_id = _pkg.id
      AND milestone_id = ANY(_selected_milestone_ids)
      AND pricing_type = 'commission_pct'
  ) INTO _has_commission;

  SELECT COALESCE(SUM(
    pm.price_usd * _units *
    CASE WHEN m.requires_duration THEN COALESCE(_effective_duration, 1) ELSE 1 END
  ), 0)
  INTO _total
  FROM package_milestones pm
  JOIN milestones m ON m.id = pm.milestone_id
  WHERE pm.package_id = _pkg.id
    AND pm.milestone_id = ANY(_selected_milestone_ids)
    AND pm.pricing_type = 'flat';

  IF NOT _has_flat THEN
    IF NOT _has_commission THEN
      RAISE EXCEPTION 'Select at least one milestone with pricing';
    END IF;
    _total := _units * _commission_reserve_per_user;
  END IF;

  SELECT jsonb_agg(jsonb_build_object(
    'milestone_id', pm.milestone_id,
    'name', m.name,
    'slug', m.slug,
    'step_order', pm.step_order,
    'pricing_type', pm.pricing_type,
    'price_usd', pm.price_usd,
    'commission_pct', pm.commission_pct,
    'requires_duration', m.requires_duration,
    'included_in_escrow', pm.pricing_type = 'flat' OR NOT _has_flat
  ) ORDER BY pm.step_order)
  INTO _breakdown
  FROM package_milestones pm
  JOIN milestones m ON m.id = pm.milestone_id
  WHERE pm.package_id = _pkg.id
    AND pm.milestone_id = ANY(_selected_milestone_ids);

  IF _total <= 0 THEN RAISE EXCEPTION 'Escrow total must be greater than zero'; END IF;

  _placement_fee := CASE WHEN _total <= 500 THEN 5.00 ELSE 10.00 END;
  _grand_total := _total + _placement_fee;

  SELECT id, balance INTO _wallet FROM wallets WHERE advertiser_id = _user FOR UPDATE;
  IF NOT FOUND OR _wallet.balance < _grand_total THEN
    RAISE EXCEPTION 'Insufficient wallet balance';
  END IF;

  UPDATE wallets SET balance = balance - _grand_total, updated_at = now() WHERE id = _wallet.id;

  INSERT INTO wallet_transactions(wallet_id, amount, type, status, description)
  VALUES (_wallet.id, _total, 'package_escrow', 'completed', 'Escrow: package ' || _pkg.name);

  INSERT INTO wallet_transactions(wallet_id, amount, type, status, description)
  VALUES (_wallet.id, _placement_fee, 'placement_fee', 'completed', 'Placement fee: package ' || _pkg.name);

  INSERT INTO package_orders(
    advertiser_id, package_id, package_name, unit_label, units,
    unit_price_usd, duration_days, total_amount_usd, app_links,
    payment_method, status, platform, selected_milestone_ids, milestone_breakdown
  )
  VALUES (
    _user, _pkg.id, _pkg.name, CASE WHEN _needs_duration THEN 'user/day' ELSE 'user' END, _units,
    (_total/NULLIF(_units,0)), COALESCE(_effective_duration, 0), _total, _links,
    'wallet', 'pending_review', _platform, _selected_milestone_ids, _breakdown
  )
  RETURNING id INTO _order_id;

  RETURN jsonb_build_object('success', true, 'order_id', _order_id, 'total', _total, 'placement_fee', _placement_fee);
END;
$function$;

-- 2. purchase_swift_trial
CREATE OR REPLACE FUNCTION public.purchase_swift_trial(
  _package_id uuid, _variant text, _platform text, _links text[]
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _user uuid := auth.uid();
  _pkg record; _wallet record;
  _units integer; _unit_price numeric; _total numeric;
  _placement_fee numeric := 0; _grand_total numeric := 0;
  _actions jsonb := '[]'::jsonb; _order_id uuid;
  _links_count integer := COALESCE(array_length(_links,1),0);
  _allowed text[] := ARRAY['mobile','web','youtube','spotify','instagram','tiktok'];
  _days integer;
BEGIN
  IF _user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _variant NOT IN ('standard','churn') THEN RAISE EXCEPTION 'Unknown trial type'; END IF;

  SELECT * INTO _pkg FROM ad_packages WHERE id=_package_id AND is_active=true AND package_type='swift';
  IF NOT FOUND THEN RAISE EXCEPTION 'Package not found'; END IF;
  IF NOT advertiser_can_use_package(_user,_package_id) THEN
    RAISE EXCEPTION 'Package not available for your category'; END IF;
  IF swift_package_used(_user,_package_id) THEN
    RAISE EXCEPTION 'You have already used this package'; END IF;

  _units := GREATEST(1, CASE WHEN _variant='churn' THEN _pkg.swift_churn_units ELSE _pkg.swift_trial_units END);
  _days  := GREATEST(1, _pkg.swift_trial_free_days);

  IF NOT (_platform = ANY(_allowed)) OR NOT (_platform = ANY(_pkg.platform_support)) THEN
    RAISE EXCEPTION 'Invalid platform for this package'; END IF;

  IF _platform = 'web' THEN
    IF _links_count <> 1 THEN RAISE EXCEPTION 'Web orders require exactly 1 link'; END IF;
    IF NOT EXISTS (SELECT 1 FROM advertiser_websites WHERE advertiser_id=_user AND is_verified=true
      AND (domain=_links[1] OR _links[1] ILIKE '%'||domain||'%'))
      THEN RAISE EXCEPTION 'Web link must be one of your verified websites'; END IF;
  ELSIF _platform = 'mobile' THEN
    IF _links_count < 1 OR _links_count > 2 THEN RAISE EXCEPTION 'Mobile orders require 1 or 2 app links'; END IF;
  ELSE
    IF _links_count <> 1 THEN RAISE EXCEPTION 'This platform requires exactly 1 link'; END IF;
  END IF;

  _unit_price := COALESCE(
    swift_unit_price(_package_id, _units),
    (SELECT price_per_user_usd FROM swift_price_tiers WHERE package_id=_package_id ORDER BY min_units ASC LIMIT 1)
  );
  IF _unit_price IS NULL THEN RAISE EXCEPTION 'This package has no pricing yet'; END IF;

  IF _variant='churn' THEN
    _unit_price := round(_unit_price * (1 - LEAST(90, GREATEST(0, _pkg.swift_churn_discount_pct))/100.0), 2);
  END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'key', a.slug, 'action_id', a.id, 'name', a.name,
    'price_per_user_per_day', 0, 'source','preset','status','approved'
  ) ORDER BY a.sort_order), '[]'::jsonb)
  INTO _actions
  FROM swift_package_actions spa
  JOIN swift_daily_actions a ON a.id = spa.action_id AND a.is_active = true
  WHERE spa.package_id = _package_id;

  _total := round(_unit_price * _units, 2);
  IF _total <= 0 THEN RAISE EXCEPTION 'Trial total must be greater than zero'; END IF;

  _placement_fee := CASE WHEN _total <= 500 THEN 5.00 ELSE 10.00 END;
  _grand_total := _total + _placement_fee;

  SELECT id, balance INTO _wallet FROM wallets WHERE advertiser_id=_user FOR UPDATE;
  IF NOT FOUND OR _wallet.balance < _grand_total THEN RAISE EXCEPTION 'Insufficient wallet balance'; END IF;

  UPDATE wallets SET balance = balance - _grand_total, updated_at=now() WHERE id=_wallet.id;

  INSERT INTO wallet_transactions(wallet_id, amount, type, status, description)
  VALUES (_wallet.id, _total, 'package_escrow','completed','Escrow: swift trial '||_pkg.name);

  INSERT INTO wallet_transactions(wallet_id, amount, type, status, description)
  VALUES (_wallet.id, _placement_fee, 'placement_fee','completed','Placement fee: swift trial '||_pkg.name);

  INSERT INTO package_orders(
    advertiser_id, package_id, package_name, unit_label, units, unit_price_usd,
    duration_days, total_amount_usd, app_links, payment_method, status, platform,
    package_type, swift_actions, swift_base_price_usd, is_trial, trial_variant
  ) VALUES (
    _user, _pkg.id, _pkg.name||' (trial)', 'user/day', _units, _unit_price,
    _days, _total, _links, 'wallet', 'pending_review',
    _platform, 'swift', _actions, _unit_price, true, _variant
  ) RETURNING id INTO _order_id;

  IF _variant='churn' THEN
    UPDATE swift_churn_feedback SET converted = true
    WHERE advertiser_id=_user AND package_id=_package_id AND converted=false;
  END IF;

  RETURN jsonb_build_object('success', true, 'order_id', _order_id, 'total', _total,
    'placement_fee', _placement_fee, 'units', _units, 'unit_price', _unit_price, 'free_days', _days);
END; $$;

-- 3. purchase_swift_package
CREATE OR REPLACE FUNCTION public.purchase_swift_package(
  _package_id uuid, _units integer, _duration_days integer, _action_ids uuid[],
  _custom jsonb, _platform text, _links text[]
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _user uuid := auth.uid();
  _pkg record; _wallet record;
  _unit_price numeric; _base numeric; _daily numeric; _total numeric;
  _placement_fee numeric := 0; _grand_total numeric := 0;
  _actions jsonb := '[]'::jsonb; _c jsonb; _order_id uuid;
  _links_count integer := COALESCE(array_length(_links,1),0);
  _allowed text[] := ARRAY['mobile','web','youtube','spotify','instagram','tiktok'];
  _has_custom boolean := false;
BEGIN
  IF _user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO _pkg FROM ad_packages WHERE id=_package_id AND is_active=true AND package_type='swift';
  IF NOT FOUND THEN RAISE EXCEPTION 'Package not found'; END IF;
  IF NOT advertiser_can_use_package(_user,_package_id) THEN
    RAISE EXCEPTION 'Package not available for your category'; END IF;
  IF swift_package_used(_user,_package_id) THEN
    RAISE EXCEPTION 'You have already used this package'; END IF;
  IF _units < GREATEST(_pkg.min_units,10) OR _units > _pkg.max_units THEN
    RAISE EXCEPTION 'Users must be between % and %', GREATEST(_pkg.min_units,10), _pkg.max_units; END IF;
  IF NOT (_platform = ANY(_allowed)) OR NOT (_platform = ANY(_pkg.platform_support)) THEN
    RAISE EXCEPTION 'Invalid platform for this package'; END IF;
  IF _duration_days IS NULL OR _duration_days <= 0 OR NOT (_duration_days = ANY(_pkg.duration_options)) THEN
    RAISE EXCEPTION 'Invalid duration'; END IF;

  IF _platform = 'web' THEN
    IF _links_count <> 1 THEN RAISE EXCEPTION 'Web orders require exactly 1 link'; END IF;
    IF NOT EXISTS (SELECT 1 FROM advertiser_websites WHERE advertiser_id=_user AND is_verified=true
      AND (domain=_links[1] OR _links[1] ILIKE '%'||domain||'%'))
      THEN RAISE EXCEPTION 'Web link must be one of your verified websites'; END IF;
  ELSIF _platform = 'mobile' THEN
    IF _links_count < 1 OR _links_count > 2 THEN RAISE EXCEPTION 'Mobile orders require 1 or 2 app links'; END IF;
  ELSE
    IF _links_count <> 1 THEN RAISE EXCEPTION 'This platform requires exactly 1 link'; END IF;
  END IF;

  _unit_price := swift_unit_price(_package_id, _units);
  IF _unit_price IS NULL THEN RAISE EXCEPTION 'No price range covers % users', _units; END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'key', a.slug, 'action_id', a.id, 'name', a.name,
    'price_per_user_per_day', COALESCE(spa.price_override_usd, a.price_per_user_per_day),
    'source','preset','status','approved'
  ) ORDER BY a.sort_order), '[]'::jsonb)
  INTO _actions
  FROM swift_package_actions spa
  JOIN swift_daily_actions a ON a.id = spa.action_id AND a.is_active = true
  WHERE spa.package_id = _package_id AND spa.action_id = ANY(COALESCE(_action_ids, ARRAY[]::uuid[]));

  IF COALESCE(array_length(_action_ids,1),0) <> jsonb_array_length(_actions) THEN
    RAISE EXCEPTION 'One or more daily actions are not available on this package'; END IF;

  FOR _c IN SELECT * FROM jsonb_array_elements(COALESCE(_custom,'[]'::jsonb)) LOOP
    IF COALESCE(btrim(_c->>'name'),'') = '' THEN RAISE EXCEPTION 'Custom deliverable needs a description'; END IF;
    IF COALESCE((_c->>'price_per_user_per_day')::numeric, -1) < 0 THEN
      RAISE EXCEPTION 'Custom deliverable needs a proposed price'; END IF;
    _has_custom := true;
    _actions := _actions || jsonb_build_array(jsonb_build_object(
      'key','custom_'||md5(_c->>'name'),
      'name', btrim(_c->>'name'),
      'price_per_user_per_day', round((_c->>'price_per_user_per_day')::numeric, 2),
      'source','custom','status','proposed'
    ));
  END LOOP;

  IF jsonb_array_length(_actions) = 0 THEN RAISE EXCEPTION 'Pick at least one daily deliverable'; END IF;

  _base  := round(_unit_price * _units, 2);
  _daily := round(swift_actions_daily_rate(_actions) * _units * _duration_days, 2);
  _total := _base + _daily;
  IF _total <= 0 THEN RAISE EXCEPTION 'Escrow total must be greater than zero'; END IF;

  _placement_fee := CASE WHEN _total <= 500 THEN 5.00 ELSE 10.00 END;
  _grand_total := _total + _placement_fee;

  SELECT id, balance INTO _wallet FROM wallets WHERE advertiser_id=_user FOR UPDATE;
  IF NOT FOUND OR _wallet.balance < _grand_total THEN RAISE EXCEPTION 'Insufficient wallet balance'; END IF;

  UPDATE wallets SET balance = balance - _grand_total, updated_at=now() WHERE id=_wallet.id;

  INSERT INTO wallet_transactions(wallet_id, amount, type, status, description)
  VALUES (_wallet.id, _total, 'package_escrow','completed','Escrow: swift package '||_pkg.name);

  INSERT INTO wallet_transactions(wallet_id, amount, type, status, description)
  VALUES (_wallet.id, _placement_fee, 'placement_fee','completed','Placement fee: swift package '||_pkg.name);

  INSERT INTO package_orders(
    advertiser_id, package_id, package_name, unit_label, units, unit_price_usd,
    duration_days, total_amount_usd, app_links, payment_method, status, platform,
    package_type, swift_actions, swift_base_price_usd
  ) VALUES (
    _user, _pkg.id, _pkg.name, 'user/day', _units, _unit_price,
    _duration_days, _total, _links, 'wallet', 'pending_review',
    _platform, 'swift', _actions, _unit_price
  ) RETURNING id INTO _order_id;

  RETURN jsonb_build_object('success', true, 'order_id', _order_id, 'total', _total,
    'placement_fee', _placement_fee, 'base', _base, 'daily', _daily, 'unit_price', _unit_price);
END; $$;

-- 4. purchase_switch_offer
CREATE OR REPLACE FUNCTION public.purchase_switch_offer(_offer_id uuid, _target_link text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _user uuid := auth.uid();
  _offer record;
  _wallet record;
  _comp_name text;
  _order_id uuid;
  _total numeric := 0;
  _placement_fee numeric := 0;
  _grand_total numeric := 0;
BEGIN
  IF _user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO _offer FROM public.switch_offers WHERE id = _offer_id AND is_active = true;
  IF NOT FOUND THEN RAISE EXCEPTION 'Offer not available'; END IF;
  IF _offer.target_link_required AND COALESCE(trim(_target_link), '') = '' THEN
    RAISE EXCEPTION 'Target link is required';
  END IF;

  _total := _offer.flat_price_usd;
  _placement_fee := CASE WHEN _total <= 500 THEN 5.00 ELSE 10.00 END;
  _grand_total := _total + _placement_fee;

  SELECT id, balance INTO _wallet FROM public.wallets WHERE advertiser_id = _user FOR UPDATE;
  IF NOT FOUND OR _wallet.balance < _grand_total THEN
    RAISE EXCEPTION 'Insufficient wallet balance';
  END IF;
  SELECT name INTO _comp_name FROM public.competitor_apps WHERE id = _offer.competitor_app_id;

  UPDATE public.wallets
    SET balance = balance - _grand_total, updated_at = now()
    WHERE id = _wallet.id;

  INSERT INTO public.wallet_transactions(wallet_id, amount, type, status, description)
  VALUES (_wallet.id, _total, 'switch_offer_escrow', 'completed',
          'Escrow: switch offer ' || _offer.title);

  INSERT INTO public.wallet_transactions(wallet_id, amount, type, status, description)
  VALUES (_wallet.id, _placement_fee, 'placement_fee', 'completed',
          'Placement fee: switch offer ' || _offer.title);

  INSERT INTO public.switch_offer_orders(
    advertiser_id, offer_id, offer_title, competitor_app_id, competitor_app_name,
    batch_size, flat_price_usd, target_link
  )
  VALUES (_user, _offer.id, _offer.title, _offer.competitor_app_id, _comp_name,
          _offer.batch_size, _offer.flat_price_usd, _target_link)
  RETURNING id INTO _order_id;

  RETURN jsonb_build_object('success', true, 'order_id', _order_id, 'total', _total, 'placement_fee', _placement_fee);
END; $$;

-- 5. purchase_roast_boost
CREATE OR REPLACE FUNCTION public.purchase_roast_boost(_platform text, _page_url text, _followers int, _days int, _offer jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _user uuid := auth.uid(); _sub text; _p record; _w record;
  _fc numeric; _dc numeric; _total numeric;
  _placement_fee numeric := 0; _grand_total numeric := 0;
  _id uuid;
BEGIN
  IF _user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT advertiser_subtype::text INTO _sub FROM public.advertiser_categories
    WHERE advertiser_id = _user AND advertiser_subtype IS NOT NULL ORDER BY created_at DESC LIMIT 1;
  IF _sub IS NULL THEN RAISE EXCEPTION 'Choose your advertiser category first'; END IF;
  SELECT * INTO _p FROM public.roast_boost_pricing WHERE subtype = _sub AND is_active;
  IF NOT FOUND THEN RAISE EXCEPTION 'Roast and Boost is not available for your category yet'; END IF;
  IF NOT (_platform = ANY(_p.platforms)) THEN RAISE EXCEPTION 'This platform is not available for your category'; END IF;
  IF _page_url IS NULL OR _page_url !~* '^https?://' OR length(_page_url) > 500 THEN RAISE EXCEPTION 'Enter a valid page link'; END IF;
  IF _followers IS NULL OR _followers < _p.min_followers OR _followers > 1000000 THEN RAISE EXCEPTION 'Followers must be at least %', _p.min_followers; END IF;
  IF _days IS NULL OR _days < GREATEST(_p.min_days,3) OR _days > 365 THEN RAISE EXCEPTION 'Duration must be at least % days', GREATEST(_p.min_days,3); END IF;
  IF COALESCE(_offer->>'url','') = '' AND COALESCE(trim(_offer->>'text'),'') = '' THEN RAISE EXCEPTION 'Upload an offer image or video, or write a text offer'; END IF;
  IF length(COALESCE(_offer->>'text','')) > 500 THEN RAISE EXCEPTION 'Text offer is too long'; END IF;

  _fc := round(_followers::numeric / 1000 * _p.price_per_1000, 2);
  _dc := round(_followers::numeric * _days * _p.daily_fee_per_user, 2);
  _total := _fc + _dc;
  _placement_fee := CASE WHEN _total <= 500 THEN 5.00 ELSE 10.00 END;
  _grand_total := _total + _placement_fee;

  SELECT id, balance INTO _w FROM public.wallets WHERE advertiser_id = _user FOR UPDATE;
  IF NOT FOUND OR _w.balance < _grand_total THEN RAISE EXCEPTION 'Insufficient wallet balance'; END IF;

  UPDATE public.wallets SET balance = balance - _grand_total, updated_at = now() WHERE id = _w.id;

  INSERT INTO public.wallet_transactions(wallet_id, amount, type, status, description)
    VALUES (_w.id, _total, 'package_escrow', 'completed', 'Escrow: Roast and Boost (' || _platform || ')');

  INSERT INTO public.wallet_transactions(wallet_id, amount, type, status, description)
    VALUES (_w.id, _placement_fee, 'placement_fee', 'completed', 'Placement fee: Roast and Boost (' || _platform || ')');

  INSERT INTO public.roast_boost_orders(advertiser_id, subtype, platform, page_url, followers, days, price_per_1000, daily_fee_per_user,
    follower_cost, daily_cost, total_cost, escrow_balance, offer_media_url, offer_media_path, offer_media_type, offer_text)
  VALUES (_user, _sub, _platform, _page_url, _followers, _days, _p.price_per_1000, _p.daily_fee_per_user,
    _fc, _dc, _total, _total, NULLIF(_offer->>'url',''), NULLIF(_offer->>'path',''), NULLIF(_offer->>'type',''), NULLIF(trim(_offer->>'text'),''))
  RETURNING id INTO _id;

  RETURN jsonb_build_object('success', true, 'order_id', _id, 'total', _total, 'placement_fee', _placement_fee);
END $$;

-- 6. submit_offline_offer
CREATE OR REPLACE FUNCTION public.submit_offline_offer(_offer_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _offer record;
  _wallet record;
  _fee numeric;
  _placement_fee numeric;
  _grand_total numeric;
BEGIN
  SELECT id, advertiser_id, status, submission_fee INTO _offer
  FROM offline_offers WHERE id = _offer_id;
  IF NOT FOUND OR _offer.advertiser_id <> _user_id THEN
    RAISE EXCEPTION 'Offer not found';
  END IF;
  _fee := _offer.submission_fee;
  _placement_fee := CASE WHEN _fee <= 500 THEN 5.00 ELSE 10.00 END;
  _grand_total := _fee + _placement_fee;

  SELECT id, balance INTO _wallet FROM wallets WHERE advertiser_id = _user_id FOR UPDATE;
  IF NOT FOUND OR _wallet.balance < _grand_total THEN
    RAISE EXCEPTION 'Insufficient wallet balance';
  END IF;

  UPDATE wallets SET balance = balance - _grand_total, updated_at = now() WHERE id = _wallet.id;

  INSERT INTO wallet_transactions(wallet_id, amount, type, status, description)
  VALUES (_wallet.id, _fee, 'offer_escrow','completed','Escrow for offline offer submission');

  INSERT INTO wallet_transactions(wallet_id, amount, type, status, description)
  VALUES (_wallet.id, _placement_fee, 'placement_fee','completed','Placement fee for offline offer submission');

  RETURN jsonb_build_object('success', true, 'fee', _fee, 'placement_fee', _placement_fee);
END;
$$;
