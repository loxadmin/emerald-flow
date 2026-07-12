
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
BEGIN
  SELECT * INTO _pkg FROM ad_packages WHERE id = _package_id AND is_active = true;
  IF NOT FOUND THEN RAISE EXCEPTION 'Package not found'; END IF;

  IF NOT advertiser_can_use_package(_user, _package_id) THEN
    RAISE EXCEPTION 'Package not available for your category';
  END IF;

  IF _units < _pkg.min_units OR _units > _pkg.max_units THEN
    RAISE EXCEPTION 'Units must be between % and %', _pkg.min_units, _pkg.max_units;
  END IF;

  IF _platform NOT IN ('mobile','web') OR NOT (_platform = ANY(_pkg.platform_support)) THEN
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
  ELSE
    IF _links_count < 1 OR _links_count > 2 THEN
      RAISE EXCEPTION 'Mobile orders require 1 or 2 app links';
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

  -- Per-milestone escrow: flat one-time * users, duration-based * users * days
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

  SELECT id, balance INTO _wallet FROM wallets WHERE advertiser_id = _user;
  IF NOT FOUND OR _wallet.balance < _total THEN
    RAISE EXCEPTION 'Insufficient wallet balance';
  END IF;

  UPDATE wallets SET balance = balance - _total, updated_at = now() WHERE id = _wallet.id;
  INSERT INTO wallet_transactions(wallet_id, amount, type, status, description)
  VALUES (_wallet.id, _total, 'package_escrow', 'completed', 'Escrow: package ' || _pkg.name);

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

  RETURN jsonb_build_object('success', true, 'order_id', _order_id, 'total', _total);
END;
$function$;
