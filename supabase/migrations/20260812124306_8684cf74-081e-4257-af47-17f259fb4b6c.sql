
ALTER TABLE public.package_order_deliveries
  ADD COLUMN IF NOT EXISTS engagement_metrics jsonb,
  ADD COLUMN IF NOT EXISTS fresh_users integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS charged_usd numeric NOT NULL DEFAULT 0;

ALTER TABLE public.package_orders
  ADD COLUMN IF NOT EXISTS escrow_spent_usd numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS refunded_usd numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS refunded_at timestamptz;

-- Unit price for a milestone inside an order (from milestone_breakdown snapshot)
CREATE OR REPLACE FUNCTION public.package_order_milestone_price(_order_id uuid, _milestone_id uuid)
RETURNS numeric
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((
    SELECT (b->>'price_usd')::numeric
    FROM public.package_orders o,
         jsonb_array_elements(COALESCE(o.milestone_breakdown, '[]'::jsonb)) b
    WHERE o.id = _order_id
      AND (b->>'milestone_id')::uuid = _milestone_id
      AND COALESCE(b->>'pricing_type','flat') = 'flat'
    LIMIT 1
  ), 0);
$$;

CREATE OR REPLACE FUNCTION public.record_package_delivery(
  _order_id uuid, _milestone_id uuid, _delivery_date date, _users_delivered integer,
  _txn_rows jsonb, _notes text, _competitor_breakdown jsonb DEFAULT NULL::jsonb,
  _engagement_metrics jsonb DEFAULT NULL::jsonb, _fresh_users integer DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _order record;
  _ms record;
  _date date;
  _total numeric;
  _price numeric;
  _prev numeric := 0;
  _charge numeric := 0;
  _delta numeric := 0;
  _remaining numeric;
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
    SELECT COALESCE(SUM((r->>'amount_usd')::numeric), 0) INTO _total
    FROM jsonb_array_elements(_txn_rows) r;
  END IF;

  -- escrow charge for this delivery row
  _price := public.package_order_milestone_price(_order_id, _milestone_id);
  _charge := round((GREATEST(_users_delivered, 0) * _price)::numeric, 2);

  SELECT COALESCE(charged_usd, 0) INTO _prev
  FROM package_order_deliveries
  WHERE order_id = _order_id AND milestone_id = _milestone_id AND delivery_date = _date;

  _prev := COALESCE(_prev, 0);
  _remaining := GREATEST(COALESCE(_order.total_amount_usd,0) - COALESCE(_order.escrow_spent_usd,0) + _prev, 0);
  IF _charge > _remaining THEN
    _charge := _remaining;
  END IF;
  _delta := _charge - _prev;

  INSERT INTO package_order_deliveries(
    order_id, milestone_id, delivery_date, users_delivered,
    txn_rows, total_txn_amount, notes, delivered_by, competitor_breakdown,
    engagement_metrics, fresh_users, charged_usd
  )
  VALUES (_order_id, _milestone_id, _date, GREATEST(_users_delivered, 0),
          _txn_rows, _total, _notes, auth.uid(), _competitor_breakdown,
          _engagement_metrics, GREATEST(COALESCE(_fresh_users,0), 0), _charge)
  ON CONFLICT (order_id, milestone_id, delivery_date)
  DO UPDATE SET
    users_delivered = EXCLUDED.users_delivered,
    txn_rows = EXCLUDED.txn_rows,
    total_txn_amount = EXCLUDED.total_txn_amount,
    notes = EXCLUDED.notes,
    delivered_by = EXCLUDED.delivered_by,
    competitor_breakdown = EXCLUDED.competitor_breakdown,
    engagement_metrics = EXCLUDED.engagement_metrics,
    fresh_users = EXCLUDED.fresh_users,
    charged_usd = EXCLUDED.charged_usd,
    updated_at = now();

  UPDATE package_orders
    SET escrow_spent_usd = GREATEST(COALESCE(escrow_spent_usd,0) + _delta, 0),
        updated_at = now()
    WHERE id = _order_id;

  RETURN jsonb_build_object('success', true, 'charged', _charge, 'spent_delta', _delta);
END; $$;

-- Refund unused escrow when a package order finishes
CREATE OR REPLACE FUNCTION public.finalize_package_order(_order_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _order record;
  _wallet record;
  _refund numeric;
BEGIN
  SELECT * INTO _order FROM package_orders WHERE id = _order_id;
  IF NOT FOUND OR _order.refunded_at IS NOT NULL THEN RETURN 0; END IF;
  IF _order.status NOT IN ('completed','ended','cancelled') THEN RETURN 0; END IF;

  _refund := round(GREATEST(COALESCE(_order.total_amount_usd,0) - COALESCE(_order.escrow_spent_usd,0), 0)::numeric, 2);

  IF _refund > 0 THEN
    SELECT id INTO _wallet FROM wallets WHERE advertiser_id = _order.advertiser_id;
    IF FOUND THEN
      UPDATE wallets SET balance = balance + _refund, updated_at = now() WHERE id = _wallet.id;
      INSERT INTO wallet_transactions(wallet_id, amount, type, status, description)
      VALUES (_wallet.id, _refund, 'refund', 'completed',
              'Unused escrow refund: ' || _order.package_name);
    END IF;
  END IF;

  UPDATE package_orders
    SET refunded_usd = _refund, refunded_at = now(), updated_at = now()
    WHERE id = _order_id;

  RETURN _refund;
END; $$;

CREATE OR REPLACE FUNCTION public.trg_package_order_finalize()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IN ('completed','ended','cancelled')
     AND COALESCE(OLD.status,'') <> NEW.status
     AND NEW.refunded_at IS NULL THEN
    PERFORM public.finalize_package_order(NEW.id);
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS package_order_finalize ON public.package_orders;
CREATE TRIGGER package_order_finalize
AFTER UPDATE OF status ON public.package_orders
FOR EACH ROW EXECUTE FUNCTION public.trg_package_order_finalize();

-- Duration-based orders end when the duration elapses (refund handled by trigger)
CREATE OR REPLACE FUNCTION public.complete_expired_package_orders()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _count integer;
BEGIN
  WITH u AS (
    UPDATE package_orders SET status='completed', updated_at=now()
    WHERE status='active' AND ends_at IS NOT NULL AND now() > ends_at
    RETURNING 1
  ) SELECT count(*) INTO _count FROM u;
  RETURN _count;
END; $$;

-- Non-duration orders close as soon as every selected milestone hits its target
CREATE OR REPLACE FUNCTION public.maybe_complete_package_order(_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _order record;
  _pending integer;
  _has_duration boolean;
BEGIN
  SELECT * INTO _order FROM public.package_orders WHERE id = _order_id;
  IF NOT FOUND OR _order.status <> 'active' THEN RETURN; END IF;
  IF _order.selected_milestone_ids IS NULL OR array_length(_order.selected_milestone_ids, 1) IS NULL THEN RETURN; END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.milestones
    WHERE id = ANY(_order.selected_milestone_ids) AND requires_duration = true
  ) INTO _has_duration;

  -- duration-based orders run their full term; they close via complete_expired_package_orders
  IF _has_duration THEN RETURN; END IF;

  SELECT count(*) INTO _pending
  FROM unnest(_order.selected_milestone_ids) AS mid
  WHERE COALESCE((
    SELECT sum(d.users_delivered) FROM public.package_order_deliveries d
    WHERE d.order_id = _order_id AND d.milestone_id = mid
  ), 0) < _order.units;

  IF _pending = 0 THEN
    UPDATE public.package_orders SET status = 'completed', updated_at = now() WHERE id = _order_id;
  END IF;
END; $$;
