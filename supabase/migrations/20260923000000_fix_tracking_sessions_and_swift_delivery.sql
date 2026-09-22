-- Migration to fix tracking_sessions unique constraint race conditions and record_swift_delivery RPC 404

-- 1. Create atomic upsert_tracking_session function using PostgreSQL ON CONFLICT (tid)
CREATE OR REPLACE FUNCTION public.upsert_tracking_session(
  _tid text,
  _campaign_id uuid DEFAULT NULL,
  _advertiser_id uuid DEFAULT NULL,
  _referral_code text DEFAULT NULL,
  _referral_id uuid DEFAULT NULL,
  _first_seen_at timestamptz DEFAULT NULL,
  _last_seen_at timestamptz DEFAULT NULL,
  _metadata jsonb DEFAULT NULL
)
RETURNS public.tracking_sessions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _result public.tracking_sessions;
  _now timestamptz := now();
BEGIN
  INSERT INTO public.tracking_sessions (
    tid,
    campaign_id,
    advertiser_id,
    referral_code,
    referral_id,
    first_seen_at,
    last_seen_at,
    metadata
  )
  VALUES (
    _tid,
    _campaign_id,
    _advertiser_id,
    _referral_code,
    _referral_id,
    COALESCE(_first_seen_at, _now),
    COALESCE(_last_seen_at, _now),
    COALESCE(_metadata, '{}'::jsonb)
  )
  ON CONFLICT (tid) DO UPDATE SET
    campaign_id = COALESCE(public.tracking_sessions.campaign_id, EXCLUDED.campaign_id),
    advertiser_id = COALESCE(public.tracking_sessions.advertiser_id, EXCLUDED.advertiser_id),
    referral_code = COALESCE(public.tracking_sessions.referral_code, EXCLUDED.referral_code),
    referral_id = COALESCE(public.tracking_sessions.referral_id, EXCLUDED.referral_id),
    last_seen_at = EXCLUDED.last_seen_at,
    metadata = COALESCE(public.tracking_sessions.metadata, '{}'::jsonb) || EXCLUDED.metadata
  RETURNING * INTO _result;

  RETURN _result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_tracking_session TO anon, authenticated, service_role;

-- 2. Ensure record_swift_delivery is defined and accessible for PostgREST RPC
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
  _target_date date := COALESCE(_delivery_date, CURRENT_DATE);
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
    AND delivery_date = _target_date;

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
      AND delivery_date = _target_date;
  ELSE
    INSERT INTO package_order_deliveries (
      order_id, swift_action_key, delivery_date, users_delivered,
      charged_usd, notes, txn_rows, total_txn_amount, engagement_metrics, delivered_by
    )
    VALUES (
      _order_id, _action_key, _target_date, GREATEST(_users_delivered, 0),
      _charge, _notes, _txn_rows, _total_txn, _engagement_metrics, auth.uid()
    );
  END IF;

  UPDATE package_orders
  SET escrow_spent_usd = GREATEST(COALESCE(escrow_spent_usd, 0) + _delta, 0),
      updated_at = now()
  WHERE id = _order_id;

  RETURN jsonb_build_object('success', true, 'users_delivered', _new_total_users, 'charged', _charge, 'spent_delta', _delta);
END; $$;

-- Overloaded variant accepting _delivery_date as text for PostgREST parameter matching flexibility
CREATE OR REPLACE FUNCTION public.record_swift_delivery(
  _order_id uuid,
  _action_key text,
  _delivery_date text,
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
BEGIN
  RETURN public.record_swift_delivery(
    _order_id,
    _action_key,
    CASE
      WHEN _delivery_date IS NULL OR trim(_delivery_date) = '' THEN CURRENT_DATE
      ELSE _delivery_date::date
    END,
    _users_delivered,
    _notes,
    _txn_rows,
    _engagement_metrics
  );
END; $$;

GRANT EXECUTE ON FUNCTION public.record_swift_delivery(uuid, text, date, integer, text, jsonb, jsonb) TO authenticated, service_role, anon;
GRANT EXECUTE ON FUNCTION public.record_swift_delivery(uuid, text, text, integer, text, jsonb, jsonb) TO authenticated, service_role, anon;

NOTIFY pgrst, 'reload schema';
