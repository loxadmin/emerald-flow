
-- 1. Competitor apps (global admin-managed list)
CREATE TABLE public.competitor_apps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  logo_url text,
  category text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.competitor_apps TO anon, authenticated;
GRANT ALL ON public.competitor_apps TO service_role;
ALTER TABLE public.competitor_apps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public view active competitor apps"
  ON public.competitor_apps FOR SELECT
  USING (is_active = true OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins manage competitor apps"
  ON public.competitor_apps FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER trg_competitor_apps_updated
  BEFORE UPDATE ON public.competitor_apps
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Competitor breakdown on package deliveries
ALTER TABLE public.package_order_deliveries
  ADD COLUMN IF NOT EXISTS competitor_breakdown jsonb;

-- 3. Switch offers (admin-created flat-price offers)
CREATE TABLE public.switch_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  competitor_app_id uuid REFERENCES public.competitor_apps(id) ON DELETE SET NULL,
  advertiser_subtypes public.advertiser_subtype[] NOT NULL DEFAULT '{}',
  platform text NOT NULL DEFAULT 'mobile',
  batch_size integer NOT NULL CHECK (batch_size > 0),
  flat_price_usd numeric NOT NULL CHECK (flat_price_usd >= 0),
  target_link_required boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.switch_offers TO anon, authenticated;
GRANT ALL ON public.switch_offers TO service_role;
ALTER TABLE public.switch_offers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public view active switch offers"
  ON public.switch_offers FOR SELECT
  USING (is_active = true OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins manage switch offers"
  ON public.switch_offers FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER trg_switch_offers_updated
  BEFORE UPDATE ON public.switch_offers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Switch offer orders
CREATE TABLE public.switch_offer_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_id uuid NOT NULL,
  offer_id uuid NOT NULL REFERENCES public.switch_offers(id) ON DELETE RESTRICT,
  offer_title text NOT NULL,
  competitor_app_id uuid,
  competitor_app_name text,
  batch_size integer NOT NULL,
  flat_price_usd numeric NOT NULL,
  target_link text,
  status text NOT NULL DEFAULT 'active',
  users_delivered integer NOT NULL DEFAULT 0,
  admin_notes text,
  starts_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.switch_offer_orders TO authenticated;
GRANT ALL ON public.switch_offer_orders TO service_role;
ALTER TABLE public.switch_offer_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Advertisers view own switch orders"
  ON public.switch_offer_orders FOR SELECT
  USING (advertiser_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins manage all switch orders"
  ON public.switch_offer_orders FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER trg_switch_offer_orders_updated
  BEFORE UPDATE ON public.switch_offer_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Purchase RPC
CREATE OR REPLACE FUNCTION public.purchase_switch_offer(_offer_id uuid, _target_link text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _user uuid := auth.uid();
  _offer record;
  _wallet record;
  _comp_name text;
  _order_id uuid;
BEGIN
  IF _user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO _offer FROM public.switch_offers WHERE id = _offer_id AND is_active = true;
  IF NOT FOUND THEN RAISE EXCEPTION 'Offer not available'; END IF;
  IF _offer.target_link_required AND COALESCE(trim(_target_link), '') = '' THEN
    RAISE EXCEPTION 'Target link is required';
  END IF;
  SELECT id, balance INTO _wallet FROM public.wallets WHERE advertiser_id = _user;
  IF NOT FOUND OR _wallet.balance < _offer.flat_price_usd THEN
    RAISE EXCEPTION 'Insufficient wallet balance';
  END IF;
  SELECT name INTO _comp_name FROM public.competitor_apps WHERE id = _offer.competitor_app_id;

  UPDATE public.wallets
    SET balance = balance - _offer.flat_price_usd, updated_at = now()
    WHERE id = _wallet.id;
  INSERT INTO public.wallet_transactions(wallet_id, amount, type, status, description)
  VALUES (_wallet.id, _offer.flat_price_usd, 'switch_offer_escrow', 'completed',
          'Escrow: switch offer ' || _offer.title);

  INSERT INTO public.switch_offer_orders(
    advertiser_id, offer_id, offer_title, competitor_app_id, competitor_app_name,
    batch_size, flat_price_usd, target_link
  )
  VALUES (_user, _offer.id, _offer.title, _offer.competitor_app_id, _comp_name,
          _offer.batch_size, _offer.flat_price_usd, _target_link)
  RETURNING id INTO _order_id;

  RETURN jsonb_build_object('success', true, 'order_id', _order_id);
END; $$;

-- 6. Extend record_package_delivery to accept competitor breakdown
DROP FUNCTION IF EXISTS public.record_package_delivery(uuid, uuid, date, integer, jsonb, text);

CREATE OR REPLACE FUNCTION public.record_package_delivery(
  _order_id uuid,
  _milestone_id uuid,
  _delivery_date date,
  _users_delivered integer,
  _txn_rows jsonb,
  _notes text,
  _competitor_breakdown jsonb DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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
    txn_rows, total_txn_amount, notes, delivered_by, competitor_breakdown
  )
  VALUES (_order_id, _milestone_id, _date, GREATEST(_users_delivered, 0),
          _txn_rows, _total, _notes, auth.uid(), _competitor_breakdown)
  ON CONFLICT (order_id, milestone_id, delivery_date)
  DO UPDATE SET
    users_delivered = EXCLUDED.users_delivered,
    txn_rows = EXCLUDED.txn_rows,
    total_txn_amount = EXCLUDED.total_txn_amount,
    notes = EXCLUDED.notes,
    delivered_by = EXCLUDED.delivered_by,
    competitor_breakdown = EXCLUDED.competitor_breakdown,
    updated_at = now();

  RETURN jsonb_build_object('success', true);
END; $$;

-- 7. Update switch order fulfillment RPC
CREATE OR REPLACE FUNCTION public.update_switch_order_delivery(
  _order_id uuid, _users_delivered integer, _status text, _notes text
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  UPDATE public.switch_offer_orders
  SET users_delivered = GREATEST(_users_delivered, 0),
      status = COALESCE(_status, status),
      admin_notes = COALESCE(_notes, admin_notes),
      completed_at = CASE WHEN _status = 'completed' THEN now() ELSE completed_at END,
      updated_at = now()
  WHERE id = _order_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;
  RETURN jsonb_build_object('success', true);
END; $$;
