-- Migration to update record_swift_delivery to handle accumulation, same day deliverables, txn_rows and engagement_metrics

-- Ensure swift_action_key and necessary fields are present on package_order_deliveries
ALTER TABLE public.package_order_deliveries
  ADD COLUMN IF NOT EXISTS swift_action_key text,
  ADD COLUMN IF NOT EXISTS engagement_metrics jsonb,
  ADD COLUMN IF NOT EXISTS charged_usd numeric NOT NULL DEFAULT 0;

-- Create unique index or constraint on (order_id, swift_action_key, delivery_date) if not present
CREATE UNIQUE INDEX IF NOT EXISTS package_order_deliveries_swift_key_idx
  ON public.package_order_deliveries (order_id, swift_action_key, delivery_date)
  WHERE swift_action_key IS NOT NULL;

CREATE OR REPLACE FUNCTION public.record_swift_delivery(
  _order_id uuid,
  _action_key text,
  _delivery_date date,
  _users_delivered integer,
  _notes text DEFAULT NULL,
  _txn_rows jsonb DEFAULT NULL,
  _engagement_metrics jsonb DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _order record;
  _rate numeric := 0;
  _existing_users integer := 0;
  _new_total_users integer := 0;
  _prev_charged numeric := 0;
  _charge numeric := 0;
  _delta numeric := 0;
  _remaining numeric := 0;
  _total_txn numeric := NULL;
  _action jsonb;
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT * INTO _order FROM package_orders WHERE id = _order_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;

  -- Determine rate per user for this action
  IF _action_key = 'acquisition' THEN
    _rate := COALESCE(_order.swift_base_price_usd, 0);
  ELSE
    SELECT a INTO _action
    FROM jsonb_array_elements(COALESCE(_order.swift_actions, '[]'::jsonb)) a
    WHERE a->>'key' = _action_key
    LIMIT 1;
    IF _action IS NOT NULL THEN
      _rate := COALESCE((_action->>'price_per_user_per_day')::numeric, 0);
    END IF;
  END IF;

  -- Calculate transaction volume total if _txn_rows provided
  IF _txn_rows IS NOT NULL AND jsonb_array_length(_txn_rows) > 0 THEN
    SELECT COALESCE(SUM((r->>'amount_usd')::numeric), 0) INTO _total_txn
    FROM jsonb_array_elements(_txn_rows) r;
  END IF;

  -- Check existing delivery for this order, action key, and delivery date
  SELECT users_delivered, charged_usd INTO _existing_users, _prev_charged
  FROM package_order_deliveries
  WHERE order_id = _order_id
    AND swift_action_key = _action_key
    AND delivery_date = COALESCE(_delivery_date, CURRENT_DATE);

  _existing_users := COALESCE(_existing_users, 0);
  _prev_charged := COALESCE(_prev_charged, 0);

  -- Same day entries accumulate
  _new_total_users := _existing_users + GREATEST(_users_delivered, 0);

  -- Charge calculation
  _charge := round((_new_total_users * _rate)::numeric, 2);
  _remaining := GREATEST(COALESCE(_order.total_amount_usd, 0) - COALESCE(_order.escrow_spent_usd, 0) + _prev_charged, 0);
  IF _charge > _remaining THEN
    _charge := _remaining;
  END IF;
  _delta := _charge - _prev_charged;

  IF _existing_users > 0 THEN
    UPDATE package_order_deliveries
    SET users_delivered = _new_total_users,
        charged_usd = _charge,
        notes = COALESCE(_notes, notes),
        txn_rows = CASE WHEN _txn_rows IS NOT NULL THEN _txn_rows ELSE txn_rows END,
        total_txn_amount = CASE WHEN _total_txn IS NOT NULL THEN _total_txn ELSE total_txn_amount END,
        engagement_metrics = CASE WHEN _engagement_metrics IS NOT NULL THEN _engagement_metrics ELSE engagement_metrics END,
        delivered_by = auth.uid(),
        updated_at = now()
    WHERE order_id = _order_id
      AND swift_action_key = _action_key
      AND delivery_date = COALESCE(_delivery_date, CURRENT_DATE);
  ELSE
    INSERT INTO package_order_deliveries (
      order_id, swift_action_key, delivery_date, users_delivered,
      charged_usd, notes, txn_rows, total_txn_amount, engagement_metrics, delivered_by
    )
    VALUES (
      _order_id, _action_key, COALESCE(_delivery_date, CURRENT_DATE), GREATEST(_users_delivered, 0),
      _charge, _notes, _txn_rows, _total_txn, _engagement_metrics, auth.uid()
    );
  END IF;

  UPDATE package_orders
  SET escrow_spent_usd = GREATEST(COALESCE(escrow_spent_usd, 0) + _delta, 0),
      updated_at = now()
  WHERE id = _order_id;

  RETURN jsonb_build_object('success', true, 'users_delivered', _new_total_users, 'charged', _charge, 'spent_delta', _delta);
END; $$;
