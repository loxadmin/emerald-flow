
-- 1) Milestones: which ones require duration/daily pacing
ALTER TABLE public.milestones
  ADD COLUMN IF NOT EXISTS requires_duration boolean NOT NULL DEFAULT false;

UPDATE public.milestones
  SET requires_duration = true
  WHERE slug IN ('engagement','sale','transaction');

-- 2) Categories: per-category goal options for AI assistant dropdown
ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS goal_options text[] NOT NULL DEFAULT '{}';

-- 3) Package order deliveries (manual admin fulfillment)
CREATE TABLE IF NOT EXISTS public.package_order_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.package_orders(id) ON DELETE CASCADE,
  milestone_id uuid NOT NULL REFERENCES public.milestones(id) ON DELETE RESTRICT,
  delivery_date date NOT NULL DEFAULT CURRENT_DATE,
  users_delivered integer NOT NULL DEFAULT 0,
  txn_rows jsonb NULL,
  total_txn_amount numeric NULL,
  notes text NULL,
  delivered_by uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (order_id, milestone_id, delivery_date)
);

GRANT SELECT ON public.package_order_deliveries TO authenticated;
GRANT ALL ON public.package_order_deliveries TO service_role;

ALTER TABLE public.package_order_deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Advertisers see own deliveries"
  ON public.package_order_deliveries FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.package_orders o
      WHERE o.id = order_id AND o.advertiser_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Admins manage deliveries"
  ON public.package_order_deliveries FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_pod_updated
  BEFORE UPDATE ON public.package_order_deliveries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4) Stricter package eligibility: reject when advertiser has no active category row
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
    LEFT JOIN public.categories c ON c.id = ac.category_id
    WHERE p.id = _package_id
      AND ac.category_id IS NOT NULL
      AND (
        (p.category_id IS NOT NULL AND ac.category_id = p.category_id)
        OR
        (p.category_id IS NULL AND p.category_group_id IS NOT NULL
          AND c.group_id = p.category_group_id)
      )
  );
$$;

-- 5) purchase_package_v2: duration optional depending on selected milestones
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
AS $$
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
  _needs_duration boolean;
  _effective_duration integer;
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
    ) THEN
      RAISE EXCEPTION 'App Install is required for mobile-app orders';
    END IF;
  END IF;

  -- Any selected milestone that requires duration?
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
  IF NOT _has_flat THEN
    RAISE EXCEPTION 'Select at least one flat-priced milestone to fund the campaign';
  END IF;

  -- Escrow: users × SUM(flat prices). Duration doesn't multiply (units already means daily or total).
  SELECT COALESCE(SUM(pm.price_usd),0) * _units
  INTO _total
  FROM package_milestones pm
  WHERE pm.package_id = _pkg.id
    AND pm.milestone_id = ANY(_selected_milestone_ids)
    AND pm.pricing_type = 'flat';

  -- For duration-based orders, escrow scales by days too
  IF _needs_duration THEN
    _total := _total * _effective_duration;
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
    'included_in_escrow', pm.pricing_type = 'flat'
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
$$;

-- 6) Admin RPC: record manual delivery
CREATE OR REPLACE FUNCTION public.record_package_delivery(
  _order_id uuid,
  _milestone_id uuid,
  _delivery_date date,
  _users_delivered integer,
  _txn_rows jsonb,
  _notes text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _order record;
  _ms record;
  _date date;
  _total numeric;
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT * INTO _order FROM package_orders WHERE id = _order_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;

  IF NOT (_milestone_id = ANY(_order.selected_milestone_ids)) THEN
    RAISE EXCEPTION 'Milestone not part of this order';
  END IF;

  SELECT * INTO _ms FROM milestones WHERE id = _milestone_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Milestone not found'; END IF;

  IF _ms.requires_duration THEN
    _date := COALESCE(_delivery_date, CURRENT_DATE);
  ELSE
    _date := COALESCE(_order.starts_at::date, CURRENT_DATE);
  END IF;

  _total := NULL;
  IF _txn_rows IS NOT NULL THEN
    SELECT COALESCE(SUM((r->>'amount_usd')::numeric), 0)
    INTO _total
    FROM jsonb_array_elements(_txn_rows) r;
  END IF;

  INSERT INTO package_order_deliveries(
    order_id, milestone_id, delivery_date, users_delivered,
    txn_rows, total_txn_amount, notes, delivered_by
  )
  VALUES (_order_id, _milestone_id, _date, GREATEST(_users_delivered, 0),
          _txn_rows, _total, _notes, auth.uid())
  ON CONFLICT (order_id, milestone_id, delivery_date)
  DO UPDATE SET
    users_delivered = EXCLUDED.users_delivered,
    txn_rows = EXCLUDED.txn_rows,
    total_txn_amount = EXCLUDED.total_txn_amount,
    notes = EXCLUDED.notes,
    delivered_by = EXCLUDED.delivered_by,
    updated_at = now();

  RETURN jsonb_build_object('success', true);
END;
$$;

-- 7) Seed a few common goal_options for existing categories (name-based heuristic)
UPDATE public.categories
SET goal_options = CASE
  WHEN lower(name) LIKE '%game%' OR lower(name) LIKE '%gaming%' THEN ARRAY['App installs','In-app signups','First deposits','Daily active players']
  WHEN lower(name) LIKE '%stream%' OR lower(name) LIKE '%music%' OR lower(name) LIKE '%video%' OR lower(name) LIKE '%youtube%' THEN ARRAY['Subscribers','Watch-time / views','Followers']
  WHEN lower(name) LIKE '%fintech%' OR lower(name) LIKE '%bank%' OR lower(name) LIKE '%wallet%' THEN ARRAY['App installs','Signups','KYC completions','First deposits','Transactions']
  WHEN lower(name) LIKE '%ecom%' OR lower(name) LIKE '%commerce%' OR lower(name) LIKE '%shop%' OR lower(name) LIKE '%store%' THEN ARRAY['Sales','Signups','Newsletter opt-ins']
  WHEN lower(name) LIKE '%website%' OR lower(name) LIKE '%blog%' OR lower(name) LIKE '%news%' THEN ARRAY['Signups','Newsletter opt-ins','Page engagement']
  WHEN lower(name) LIKE '%app%' THEN ARRAY['App installs','Signups','Engagement']
  ELSE ARRAY['Signups','Engagement','Sales']
END
WHERE goal_options = '{}';
