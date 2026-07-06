
-- 1. Milestones: add commission flag, seed Transaction, mark Sale as commission-based
ALTER TABLE public.milestones
  ADD COLUMN IF NOT EXISTS is_commission_based boolean NOT NULL DEFAULT false;

INSERT INTO public.milestones (name, slug, description, default_order, is_active, is_commission_based)
VALUES ('Transaction', 'transaction', 'User completes a transaction in the app', 55, true, false)
ON CONFLICT (slug) DO NOTHING;

UPDATE public.milestones SET is_commission_based = true WHERE slug = 'sale';

-- 2. Package milestones: pricing type + commission percentage
ALTER TABLE public.package_milestones
  ADD COLUMN IF NOT EXISTS pricing_type text NOT NULL DEFAULT 'flat',
  ADD COLUMN IF NOT EXISTS commission_pct numeric;

ALTER TABLE public.package_milestones
  ALTER COLUMN price_usd DROP NOT NULL;

ALTER TABLE public.package_milestones
  DROP CONSTRAINT IF EXISTS package_milestones_pricing_check;
ALTER TABLE public.package_milestones
  ADD CONSTRAINT package_milestones_pricing_check CHECK (
    (pricing_type = 'flat' AND price_usd IS NOT NULL AND price_usd >= 0 AND commission_pct IS NULL)
    OR
    (pricing_type = 'commission_pct' AND commission_pct IS NOT NULL AND commission_pct >= 0 AND commission_pct <= 100 AND price_usd IS NULL)
  );

-- 3. Package orders: selected milestone list (nullable to keep old orders valid)
ALTER TABLE public.package_orders
  ADD COLUMN IF NOT EXISTS selected_milestone_ids uuid[];

-- 4. Replace purchase_package_v2 with selection-based version
DROP FUNCTION IF EXISTS public.purchase_package_v2(uuid, integer, integer, uuid, text, text[]);

CREATE OR REPLACE FUNCTION public.purchase_package_v2(
  _package_id uuid,
  _units integer,
  _duration_days integer,
  _selected_milestone_ids uuid[],
  _platform text,
  _links text[]
) RETURNS jsonb
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
  _breakdown jsonb;
BEGIN
  SELECT * INTO _pkg FROM ad_packages WHERE id = _package_id AND is_active = true;
  IF NOT FOUND THEN RAISE EXCEPTION 'Package not found'; END IF;

  IF NOT advertiser_can_use_package(_user, _package_id) THEN
    RAISE EXCEPTION 'Package not available for your category';
  END IF;

  IF _units < _pkg.min_units OR _units > _pkg.max_units THEN
    RAISE EXCEPTION 'Units must be between % and %', _pkg.min_units, _pkg.max_units;
  END IF;

  IF NOT (_duration_days = ANY(_pkg.duration_options)) THEN
    RAISE EXCEPTION 'Invalid duration';
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

  IF _sel_count = 0 THEN
    RAISE EXCEPTION 'Select at least one milestone';
  END IF;

  -- Every selected id must belong to the package
  SELECT COUNT(*) INTO _invalid_count
  FROM unnest(_selected_milestone_ids) AS sid
  WHERE NOT EXISTS (
    SELECT 1 FROM package_milestones
    WHERE package_id = _pkg.id AND milestone_id = sid
  );
  IF _invalid_count > 0 THEN RAISE EXCEPTION 'Invalid milestone selection'; END IF;

  -- Mobile requires App Install
  IF _platform = 'mobile' THEN
    IF NOT EXISTS (
      SELECT 1 FROM milestones m
      WHERE m.slug = 'app_install' AND m.id = ANY(_selected_milestone_ids)
    ) THEN
      RAISE EXCEPTION 'App Install is required for mobile-app orders';
    END IF;
  END IF;

  -- Must include at least one flat-priced milestone (escrow)
  SELECT EXISTS (
    SELECT 1 FROM package_milestones
    WHERE package_id = _pkg.id
      AND milestone_id = ANY(_selected_milestone_ids)
      AND pricing_type = 'flat'
  ) INTO _has_flat;
  IF NOT _has_flat THEN
    RAISE EXCEPTION 'Select at least one flat-priced milestone to fund the campaign';
  END IF;

  -- Escrow total = units * SUM(flat prices only)
  SELECT COALESCE(SUM(pm.price_usd),0) * _units
  INTO _total
  FROM package_milestones pm
  WHERE pm.package_id = _pkg.id
    AND pm.milestone_id = ANY(_selected_milestone_ids)
    AND pm.pricing_type = 'flat';

  -- Breakdown (flat + commission rows)
  SELECT jsonb_agg(jsonb_build_object(
    'milestone_id', pm.milestone_id,
    'name', m.name,
    'slug', m.slug,
    'step_order', pm.step_order,
    'pricing_type', pm.pricing_type,
    'price_usd', pm.price_usd,
    'commission_pct', pm.commission_pct,
    'included_in_escrow', pm.pricing_type = 'flat'
  ) ORDER BY pm.step_order)
  INTO _breakdown
  FROM package_milestones pm
  JOIN milestones m ON m.id = pm.milestone_id
  WHERE pm.package_id = _pkg.id
    AND pm.milestone_id = ANY(_selected_milestone_ids);

  IF _total <= 0 THEN
    RAISE EXCEPTION 'Escrow total must be greater than zero';
  END IF;

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
    _user, _pkg.id, _pkg.name, 'user', _units,
    (_total/NULLIF(_units,0)), _duration_days, _total, _links,
    'wallet', 'pending_review', _platform, _selected_milestone_ids, _breakdown
  )
  RETURNING id INTO _order_id;

  RETURN jsonb_build_object('success', true, 'order_id', _order_id, 'total', _total);
END;
$function$;

-- 5. Admin-only RPC to charge a per-sale commission from advertiser's wallet
CREATE OR REPLACE FUNCTION public.charge_sale_commission(
  _order_id uuid,
  _sale_amount_usd numeric
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _order record;
  _wallet record;
  _pct numeric;
  _fee numeric;
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF _sale_amount_usd IS NULL OR _sale_amount_usd <= 0 THEN
    RAISE EXCEPTION 'Sale amount must be greater than zero';
  END IF;

  SELECT * INTO _order FROM package_orders WHERE id = _order_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;

  -- Look up sale commission % from the package's milestone config
  SELECT pm.commission_pct INTO _pct
  FROM package_milestones pm
  JOIN milestones m ON m.id = pm.milestone_id
  WHERE pm.package_id = _order.package_id
    AND m.slug = 'sale'
    AND pm.pricing_type = 'commission_pct'
    AND pm.milestone_id = ANY(_order.selected_milestone_ids);

  IF _pct IS NULL THEN
    RAISE EXCEPTION 'This order does not include commission-based sale tracking';
  END IF;

  _fee := round((_sale_amount_usd * _pct / 100)::numeric, 2);

  SELECT id, balance INTO _wallet FROM wallets WHERE advertiser_id = _order.advertiser_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Wallet not found'; END IF;
  IF _wallet.balance < _fee THEN
    RAISE EXCEPTION 'Insufficient wallet balance for sale commission';
  END IF;

  UPDATE wallets SET balance = balance - _fee, updated_at = now() WHERE id = _wallet.id;
  INSERT INTO wallet_transactions(wallet_id, amount, type, status, description)
  VALUES (
    _wallet.id, _fee, 'sale_commission', 'completed',
    'Sale commission (' || _pct || '%) for package order ' || _order_id::text
  );

  RETURN jsonb_build_object('success', true, 'fee', _fee, 'pct', _pct);
END;
$function$;
