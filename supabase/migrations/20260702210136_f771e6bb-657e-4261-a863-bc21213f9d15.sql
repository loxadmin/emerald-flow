
-- Ad Packages tables
CREATE TABLE public.ad_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  image_url text,
  category_group_id uuid REFERENCES public.category_groups(id) ON DELETE SET NULL,
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  mode text NOT NULL DEFAULT 'online',
  unit_label text NOT NULL DEFAULT 'daily user',
  unit_price_usd numeric NOT NULL CHECK (unit_price_usd > 0),
  min_units integer NOT NULL DEFAULT 500,
  max_units integer NOT NULL DEFAULT 10000,
  duration_days integer NOT NULL DEFAULT 30,
  max_links integer NOT NULL DEFAULT 3,
  discount_pct numeric DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.ad_packages TO authenticated;
GRANT ALL ON public.ad_packages TO service_role;
ALTER TABLE public.ad_packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read active packages" ON public.ad_packages
  FOR SELECT TO authenticated USING (is_active = true OR public.has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Admins manage packages" ON public.ad_packages
  FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));

CREATE TABLE public.package_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_id uuid NOT NULL,
  package_id uuid REFERENCES public.ad_packages(id) ON DELETE SET NULL,
  package_name text NOT NULL,
  unit_label text NOT NULL,
  units integer NOT NULL,
  unit_price_usd numeric NOT NULL,
  duration_days integer NOT NULL,
  total_amount_usd numeric NOT NULL,
  app_links text[] NOT NULL DEFAULT '{}',
  payment_method text NOT NULL,
  payment_reference text,
  status text NOT NULL DEFAULT 'pending_payment',
  admin_notes text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.package_orders TO authenticated;
GRANT ALL ON public.package_orders TO service_role;
ALTER TABLE public.package_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners read own orders" ON public.package_orders
  FOR SELECT TO authenticated USING (advertiser_id = auth.uid() OR public.has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Owners insert own orders" ON public.package_orders
  FOR INSERT TO authenticated WITH CHECK (advertiser_id = auth.uid());
CREATE POLICY "Admins update orders" ON public.package_orders
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_ad_packages_updated BEFORE UPDATE ON public.ad_packages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_package_orders_updated BEFORE UPDATE ON public.package_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Purchase with wallet RPC
CREATE OR REPLACE FUNCTION public.purchase_package_with_wallet(
  _package_id uuid, _units integer, _links text[]
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _user uuid := auth.uid();
  _pkg record;
  _wallet record;
  _total numeric;
  _order_id uuid;
BEGIN
  SELECT * INTO _pkg FROM ad_packages WHERE id = _package_id AND is_active = true;
  IF NOT FOUND THEN RAISE EXCEPTION 'Package not found'; END IF;
  IF _units < _pkg.min_units OR _units > _pkg.max_units THEN
    RAISE EXCEPTION 'Units out of range';
  END IF;
  IF array_length(_links,1) IS NULL OR array_length(_links,1) > _pkg.max_links THEN
    RAISE EXCEPTION 'Provide 1 to % app links', _pkg.max_links;
  END IF;
  _total := _units * _pkg.unit_price_usd;
  SELECT id, balance INTO _wallet FROM wallets WHERE advertiser_id = _user;
  IF NOT FOUND OR _wallet.balance < _total THEN RAISE EXCEPTION 'Insufficient wallet balance'; END IF;

  UPDATE wallets SET balance = balance - _total, updated_at = now() WHERE id = _wallet.id;
  INSERT INTO wallet_transactions(wallet_id, amount, type, status, description)
  VALUES (_wallet.id, _total, 'package_escrow', 'completed', 'Escrow: package ' || _pkg.name);

  INSERT INTO package_orders(advertiser_id, package_id, package_name, unit_label, units,
    unit_price_usd, duration_days, total_amount_usd, app_links, payment_method, status)
  VALUES (_user, _pkg.id, _pkg.name, _pkg.unit_label, _units,
    _pkg.unit_price_usd, _pkg.duration_days, _total, _links, 'wallet', 'pending_review')
  RETURNING id INTO _order_id;

  RETURN jsonb_build_object('success', true, 'order_id', _order_id);
END; $$;

-- Approve / reject by admin
CREATE OR REPLACE FUNCTION public.review_package_order(
  _order_id uuid, _approve boolean, _notes text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _order record;
  _wallet record;
BEGIN
  IF NOT has_role(auth.uid(),'admin'::app_role) THEN RAISE EXCEPTION 'Not authorized'; END IF;
  SELECT * INTO _order FROM package_orders WHERE id = _order_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF _order.status <> 'pending_review' THEN RAISE EXCEPTION 'Order not in review'; END IF;

  IF _approve THEN
    UPDATE package_orders
      SET status='active', admin_notes=_notes, reviewed_by=auth.uid(), reviewed_at=now(),
          starts_at=now(), ends_at = now() + (_order.duration_days || ' days')::interval,
          updated_at=now()
      WHERE id=_order_id;
  ELSE
    -- Refund
    SELECT id INTO _wallet FROM wallets WHERE advertiser_id = _order.advertiser_id;
    IF FOUND THEN
      UPDATE wallets SET balance = balance + _order.total_amount_usd, updated_at=now() WHERE id=_wallet.id;
      INSERT INTO wallet_transactions(wallet_id, amount, type, status, description)
      VALUES (_wallet.id, _order.total_amount_usd, 'refund', 'completed', 'Refund: rejected package order');
    END IF;
    UPDATE package_orders
      SET status='rejected', admin_notes=_notes, reviewed_by=auth.uid(), reviewed_at=now(), updated_at=now()
      WHERE id=_order_id;
  END IF;
  RETURN jsonb_build_object('success', true);
END; $$;

-- Complete expired
CREATE OR REPLACE FUNCTION public.complete_expired_package_orders()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _count integer;
BEGIN
  WITH u AS (
    UPDATE package_orders SET status='completed', updated_at=now()
    WHERE status='active' AND ends_at IS NOT NULL AND now() > ends_at
    RETURNING 1
  ) SELECT count(*) INTO _count FROM u;
  RETURN _count;
END; $$;
