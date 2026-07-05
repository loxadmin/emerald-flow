
-- 1. Milestones catalog
CREATE TABLE public.milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  default_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.milestones TO authenticated;
GRANT ALL ON public.milestones TO service_role;
ALTER TABLE public.milestones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone auth can read milestones" ON public.milestones
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage milestones" ON public.milestones
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role));
CREATE TRIGGER trg_milestones_updated BEFORE UPDATE ON public.milestones
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.milestones (name, slug, description, default_order) VALUES
  ('App install', 'app_install', 'User installs the app', 10),
  ('Signup',      'signup',      'User creates an account', 20),
  ('KYC',         'kyc',         'User completes identity/KYC', 30),
  ('Engagement',  'engagement',  'Daily active engagement', 40),
  ('Deposit',     'deposit',     'User makes a deposit', 50),
  ('Sale',        'sale',        'User completes a purchase', 60)
ON CONFLICT (slug) DO NOTHING;

-- 2. ad_packages: add columns
ALTER TABLE public.ad_packages
  ADD COLUMN IF NOT EXISTS duration_options integer[] NOT NULL DEFAULT '{30}',
  ADD COLUMN IF NOT EXISTS platform_support text[] NOT NULL DEFAULT '{mobile,web}';

ALTER TABLE public.ad_packages
  ALTER COLUMN unit_price_usd DROP NOT NULL,
  ALTER COLUMN unit_label     DROP NOT NULL,
  ALTER COLUMN duration_days  DROP NOT NULL;

-- 3. package_milestones
CREATE TABLE public.package_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id uuid NOT NULL REFERENCES public.ad_packages(id) ON DELETE CASCADE,
  milestone_id uuid NOT NULL REFERENCES public.milestones(id) ON DELETE RESTRICT,
  step_order integer NOT NULL DEFAULT 0,
  price_usd numeric NOT NULL CHECK (price_usd >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (package_id, milestone_id)
);
GRANT SELECT ON public.package_milestones TO authenticated;
GRANT ALL ON public.package_milestones TO service_role;
ALTER TABLE public.package_milestones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone auth reads package milestones" ON public.package_milestones
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage package milestones" ON public.package_milestones
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role));
CREATE TRIGGER trg_pkg_ms_updated BEFORE UPDATE ON public.package_milestones
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. package_orders
ALTER TABLE public.package_orders
  ADD COLUMN IF NOT EXISTS platform text,
  ADD COLUMN IF NOT EXISTS target_milestone_id uuid REFERENCES public.milestones(id),
  ADD COLUMN IF NOT EXISTS milestone_breakdown jsonb;

-- 5. Category-scope helper (uses correct column: advertiser_id)
CREATE OR REPLACE FUNCTION public.advertiser_can_use_package(_user uuid, _package_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.ad_packages p
    LEFT JOIN public.advertiser_categories ac ON ac.advertiser_id = _user
    LEFT JOIN public.categories c ON c.id = ac.category_id
    WHERE p.id = _package_id
      AND (
        (p.category_id IS NOT NULL AND ac.category_id = p.category_id)
        OR
        (p.category_id IS NULL AND p.category_group_id IS NOT NULL
          AND c.group_id = p.category_group_id)
      )
  );
$$;

-- 6. Tighten ad_packages SELECT policy
DROP POLICY IF EXISTS "Anyone can view active packages" ON public.ad_packages;
DROP POLICY IF EXISTS "Anyone auth can view packages" ON public.ad_packages;
DROP POLICY IF EXISTS "Authenticated can view active packages" ON public.ad_packages;
CREATE POLICY "Scoped active package reads" ON public.ad_packages
  FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(),'admin'::app_role)
    OR (is_active = true AND public.advertiser_can_use_package(auth.uid(), id))
  );

-- 7. New RPC
CREATE OR REPLACE FUNCTION public.purchase_package_v2(
  _package_id uuid,
  _units integer,
  _duration_days integer,
  _target_milestone_id uuid,
  _platform text,
  _links text[]
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _user uuid := auth.uid();
  _pkg record;
  _wallet record;
  _target_order integer;
  _total numeric;
  _order_id uuid;
  _links_count integer := COALESCE(array_length(_links,1),0);
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

  SELECT step_order INTO _target_order
  FROM package_milestones
  WHERE package_id = _pkg.id AND milestone_id = _target_milestone_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Target milestone not in package'; END IF;

  SELECT COALESCE(SUM(pm.price_usd),0) * _units,
         jsonb_agg(jsonb_build_object(
            'milestone_id', pm.milestone_id,
            'name', m.name,
            'step_order', pm.step_order,
            'price_usd', pm.price_usd,
            'included', true
         ) ORDER BY pm.step_order)
  INTO _total, _breakdown
  FROM package_milestones pm
  JOIN milestones m ON m.id = pm.milestone_id
  WHERE pm.package_id = _pkg.id AND pm.step_order <= _target_order;

  IF _total IS NULL OR _total <= 0 THEN
    RAISE EXCEPTION 'Package has no priced milestones';
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
    payment_method, status, platform, target_milestone_id, milestone_breakdown
  )
  VALUES (
    _user, _pkg.id, _pkg.name, 'user', _units,
    (_total/NULLIF(_units,0)), _duration_days, _total, _links,
    'wallet', 'pending_review', _platform, _target_milestone_id, _breakdown
  )
  RETURNING id INTO _order_id;

  RETURN jsonb_build_object('success', true, 'order_id', _order_id, 'total', _total);
END;
$$;
