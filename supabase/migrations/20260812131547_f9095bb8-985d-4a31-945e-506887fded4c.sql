CREATE TABLE public.switch_order_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL UNIQUE REFERENCES public.switch_offer_orders(id) ON DELETE CASCADE,
  users_switched integer NOT NULL DEFAULT 0,
  signups integer NOT NULL DEFAULT 0,
  kyc_completed integer NOT NULL DEFAULT 0,
  profiles_created integer NOT NULL DEFAULT 0,
  deposits_count integer NOT NULL DEFAULT 0,
  txn_rows jsonb,
  total_txn_amount numeric NOT NULL DEFAULT 0,
  notes text,
  delivered_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.switch_order_metrics TO authenticated;
GRANT ALL ON public.switch_order_metrics TO service_role;

ALTER TABLE public.switch_order_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Advertisers view own switch metrics"
ON public.switch_order_metrics FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.switch_offer_orders o
  WHERE o.id = switch_order_metrics.order_id AND o.advertiser_id = auth.uid()
));

CREATE POLICY "Admins manage switch metrics"
ON public.switch_order_metrics FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_switch_order_metrics_updated_at
BEFORE UPDATE ON public.switch_order_metrics
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.record_switch_metrics(
  _order_id uuid,
  _users_switched integer,
  _signups integer,
  _kyc_completed integer,
  _profiles_created integer,
  _deposits_count integer,
  _txn_rows jsonb,
  _notes text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _order record;
  _total numeric := 0;
  _rows integer := 0;
  _delivered integer := GREATEST(COALESCE(_users_switched, 0), 0);
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT * INTO _order FROM switch_offer_orders WHERE id = _order_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;

  IF _txn_rows IS NOT NULL THEN
    SELECT COALESCE(SUM((r->>'amount_usd')::numeric), 0), count(*)
      INTO _total, _rows
    FROM jsonb_array_elements(_txn_rows) r;
  END IF;

  IF COALESCE(_deposits_count, 0) > 0 AND _rows = 0 THEN
    RAISE EXCEPTION 'Upload a transaction CSV to back the deposit count';
  END IF;

  IF _rows > 0 AND _rows < COALESCE(_deposits_count, 0) THEN
    RAISE EXCEPTION 'Transaction CSV has % rows but you reported % deposits', _rows, _deposits_count;
  END IF;

  INSERT INTO switch_order_metrics(
    order_id, users_switched, signups, kyc_completed, profiles_created,
    deposits_count, txn_rows, total_txn_amount, notes, delivered_by
  )
  VALUES (
    _order_id, _delivered, GREATEST(COALESCE(_signups,0),0), GREATEST(COALESCE(_kyc_completed,0),0),
    GREATEST(COALESCE(_profiles_created,0),0), GREATEST(COALESCE(_deposits_count,0),0),
    _txn_rows, _total, _notes, auth.uid()
  )
  ON CONFLICT (order_id) DO UPDATE SET
    users_switched = EXCLUDED.users_switched,
    signups = EXCLUDED.signups,
    kyc_completed = EXCLUDED.kyc_completed,
    profiles_created = EXCLUDED.profiles_created,
    deposits_count = EXCLUDED.deposits_count,
    txn_rows = EXCLUDED.txn_rows,
    total_txn_amount = EXCLUDED.total_txn_amount,
    notes = EXCLUDED.notes,
    delivered_by = EXCLUDED.delivered_by,
    updated_at = now();

  UPDATE switch_offer_orders
    SET users_delivered = _delivered,
        status = CASE
          WHEN status = 'cancelled' THEN status
          WHEN _delivered >= batch_size THEN 'completed'
          WHEN _delivered > 0 THEN 'delivering'
          ELSE status END,
        completed_at = CASE WHEN _delivered >= batch_size THEN COALESCE(completed_at, now()) ELSE completed_at END,
        admin_notes = COALESCE(_notes, admin_notes),
        updated_at = now()
    WHERE id = _order_id;

  RETURN jsonb_build_object('success', true, 'delivered', _delivered, 'txn_total', _total, 'txn_count', _rows);
END;
$$;