ALTER TABLE public.ad_packages
  ADD COLUMN IF NOT EXISTS swift_trial_units integer NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS swift_trial_free_days integer NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS swift_churn_units integer NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS swift_churn_discount_pct numeric(5,2) NOT NULL DEFAULT 20;

ALTER TABLE public.package_orders
  ADD COLUMN IF NOT EXISTS is_trial boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS trial_variant text;

CREATE TABLE IF NOT EXISTS public.swift_churn_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_id uuid NOT NULL,
  package_id uuid NOT NULL REFERENCES public.ad_packages(id) ON DELETE CASCADE,
  reason text NOT NULL,
  note text,
  offer_shown boolean NOT NULL DEFAULT true,
  converted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.swift_churn_feedback TO authenticated;
GRANT ALL ON public.swift_churn_feedback TO service_role;

ALTER TABLE public.swift_churn_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own churn feedback insert" ON public.swift_churn_feedback;
CREATE POLICY "own churn feedback insert" ON public.swift_churn_feedback
  FOR INSERT TO authenticated WITH CHECK (advertiser_id = auth.uid());

DROP POLICY IF EXISTS "own or admin churn feedback read" ON public.swift_churn_feedback;
CREATE POLICY "own or admin churn feedback read" ON public.swift_churn_feedback
  FOR SELECT TO authenticated
  USING (advertiser_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

CREATE INDEX IF NOT EXISTS idx_churn_feedback_pkg ON public.swift_churn_feedback(package_id, created_at DESC);

-- one swift package per advertiser, ever
CREATE OR REPLACE FUNCTION public.swift_package_used(_user uuid, _package_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM package_orders
    WHERE advertiser_id = _user AND package_id = _package_id
      AND package_type = 'swift'
      AND status NOT IN ('rejected','refunded')
  )
$$;

CREATE OR REPLACE FUNCTION public.purchase_swift_trial(
  _package_id uuid, _variant text, _platform text, _links text[]
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _user uuid := auth.uid();
  _pkg record; _wallet record;
  _units integer; _unit_price numeric; _total numeric;
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

  -- all package deliverables, free for the trial days
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

  SELECT id, balance INTO _wallet FROM wallets WHERE advertiser_id=_user FOR UPDATE;
  IF NOT FOUND OR _wallet.balance < _total THEN RAISE EXCEPTION 'Insufficient wallet balance'; END IF;

  UPDATE wallets SET balance = balance - _total, updated_at=now() WHERE id=_wallet.id;
  INSERT INTO wallet_transactions(wallet_id, amount, type, status, description)
  VALUES (_wallet.id, _total, 'package_escrow','completed','Escrow: swift trial '||_pkg.name);

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
    'units', _units, 'unit_price', _unit_price, 'free_days', _days);
END; $$;

-- block reuse on the standard swift purchase too
CREATE OR REPLACE FUNCTION public.purchase_swift_package(
  _package_id uuid, _units integer, _duration_days integer, _action_ids uuid[],
  _custom jsonb, _platform text, _links text[]
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _user uuid := auth.uid();
  _pkg record; _wallet record;
  _unit_price numeric; _base numeric; _daily numeric; _total numeric;
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

  SELECT id, balance INTO _wallet FROM wallets WHERE advertiser_id=_user FOR UPDATE;
  IF NOT FOUND OR _wallet.balance < _total THEN RAISE EXCEPTION 'Insufficient wallet balance'; END IF;

  UPDATE wallets SET balance = balance - _total, updated_at=now() WHERE id=_wallet.id;
  INSERT INTO wallet_transactions(wallet_id, amount, type, status, description)
  VALUES (_wallet.id, _total, 'package_escrow','completed','Escrow: swift package '||_pkg.name);

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
    'base', _base, 'daily', _daily, 'unit_price', _unit_price);
END; $$;