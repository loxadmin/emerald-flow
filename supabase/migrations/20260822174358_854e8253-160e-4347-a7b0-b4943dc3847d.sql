
-- 1. Webhook idempotency log -------------------------------------------------
CREATE TABLE IF NOT EXISTS public.webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  event_id text NOT NULL,
  event_type text,
  reference text,
  payload jsonb,
  status text NOT NULL DEFAULT 'received',
  error text,
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS webhook_events_provider_event_idx
  ON public.webhook_events (provider, event_id);
CREATE INDEX IF NOT EXISTS webhook_events_created_idx ON public.webhook_events (created_at DESC);

GRANT SELECT ON public.webhook_events TO authenticated;
GRANT ALL ON public.webhook_events TO service_role;
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view webhook events" ON public.webhook_events;
CREATE POLICY "Admins can view webhook events" ON public.webhook_events
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP TRIGGER IF EXISTS webhook_events_updated_at ON public.webhook_events;
CREATE TRIGGER webhook_events_updated_at BEFORE UPDATE ON public.webhook_events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Balance invariants -------------------------------------------------------
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'wallets_balance_non_negative') THEN
    ALTER TABLE public.wallets ADD CONSTRAINT wallets_balance_non_negative CHECK (balance >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'campaigns_budget_remaining_non_negative') THEN
    ALTER TABLE public.campaigns ADD CONSTRAINT campaigns_budget_remaining_non_negative CHECK (budget_remaining >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'package_orders_escrow_bounds') THEN
    ALTER TABLE public.package_orders ADD CONSTRAINT package_orders_escrow_bounds
      CHECK (COALESCE(escrow_spent_usd,0) >= 0
         AND COALESCE(refunded_usd,0) >= 0
         AND COALESCE(escrow_spent_usd,0) + COALESCE(refunded_usd,0) <= COALESCE(total_amount_usd,0) + 0.01);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'wallet_transactions_amount_positive') THEN
    ALTER TABLE public.wallet_transactions ADD CONSTRAINT wallet_transactions_amount_positive CHECK (amount >= 0);
  END IF;
END $$;

-- 3. Ledger direction ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.wallet_txn_direction(_type text)
RETURNS integer LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE WHEN _type IN ('funding','activation','refund','admin_topup','withdrawal_refund','bonus')
              THEN 1 ELSE -1 END
$$;

-- 4. Idempotent webhook credit ------------------------------------------------
CREATE OR REPLACE FUNCTION public.process_payment_webhook(
  _provider text,
  _event_id text,
  _event_type text,
  _reference text,
  _is_activation boolean DEFAULT false,
  _payload jsonb DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _inserted uuid;
  _tx record;
  _wallet record;
  _new numeric;
  _activation boolean;
BEGIN
  IF _provider IS NULL OR _event_id IS NULL THEN
    RAISE EXCEPTION 'provider and event_id are required';
  END IF;

  INSERT INTO public.webhook_events (provider, event_id, event_type, reference, payload)
  VALUES (_provider, _event_id, _event_type, _reference, _payload)
  ON CONFLICT (provider, event_id) DO NOTHING
  RETURNING id INTO _inserted;

  IF _inserted IS NULL THEN
    RETURN jsonb_build_object('duplicate', true, 'credited', false);
  END IF;

  IF _reference IS NULL THEN
    UPDATE public.webhook_events SET status='ignored', processed_at=now() WHERE id=_inserted;
    RETURN jsonb_build_object('duplicate', false, 'credited', false, 'reason', 'no_reference');
  END IF;

  SELECT * INTO _tx FROM public.wallet_transactions
    WHERE reference = _reference ORDER BY created_at DESC LIMIT 1 FOR UPDATE;

  IF NOT FOUND THEN
    UPDATE public.webhook_events SET status='unmatched', processed_at=now() WHERE id=_inserted;
    RETURN jsonb_build_object('duplicate', false, 'credited', false, 'reason', 'tx_not_found');
  END IF;

  IF _tx.status <> 'pending' THEN
    UPDATE public.webhook_events SET status='already_processed', processed_at=now() WHERE id=_inserted;
    RETURN jsonb_build_object('duplicate', false, 'credited', false, 'reason', 'tx_not_pending');
  END IF;

  SELECT * INTO _wallet FROM public.wallets WHERE id = _tx.wallet_id FOR UPDATE;
  IF NOT FOUND THEN
    UPDATE public.webhook_events SET status='unmatched', processed_at=now() WHERE id=_inserted;
    RETURN jsonb_build_object('duplicate', false, 'credited', false, 'reason', 'wallet_not_found');
  END IF;

  _activation := COALESCE(_is_activation, false) OR _tx.type = 'activation';
  _new := round(_wallet.balance + _tx.amount, 2);

  UPDATE public.wallet_transactions SET status='completed' WHERE id = _tx.id;
  UPDATE public.wallets
    SET balance = _new,
        is_activated = CASE WHEN _activation THEN true ELSE is_activated END,
        updated_at = now()
    WHERE id = _wallet.id;

  IF _activation THEN
    UPDATE public.advertiser_categories SET status='active'
      WHERE advertiser_id = _wallet.advertiser_id AND status='waiting_list';
  END IF;

  UPDATE public.webhook_events SET status='processed', processed_at=now() WHERE id=_inserted;

  RETURN jsonb_build_object('duplicate', false, 'credited', true, 'wallet_id', _wallet.id,
                            'advertiser_id', _wallet.advertiser_id, 'amount', _tx.amount,
                            'new_balance', _new, 'activation', _activation, 'tx_id', _tx.id);
END $$;

REVOKE ALL ON FUNCTION public.process_payment_webhook(text,text,text,text,boolean,jsonb) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.process_payment_webhook(text,text,text,text,boolean,jsonb) TO service_role;

-- 5. Reconciliation reports ---------------------------------------------------
CREATE OR REPLACE FUNCTION public.reconcile_wallets()
RETURNS TABLE (
  wallet_id uuid, advertiser_id uuid, email text,
  balance numeric, ledger_balance numeric, drift numeric,
  credits numeric, debits numeric, txn_count bigint
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN RAISE EXCEPTION 'Not authorized'; END IF;
  RETURN QUERY
  SELECT w.id, w.advertiser_id, p.email,
         round(w.balance,2),
         round(COALESCE(l.ledger,0),2),
         round(w.balance - COALESCE(l.ledger,0),2),
         round(COALESCE(l.credits,0),2),
         round(COALESCE(l.debits,0),2),
         COALESCE(l.cnt,0)
  FROM public.wallets w
  LEFT JOIN public.profiles p ON p.id = w.advertiser_id
  LEFT JOIN LATERAL (
    SELECT SUM(public.wallet_txn_direction(t.type) * t.amount) AS ledger,
           SUM(CASE WHEN public.wallet_txn_direction(t.type) = 1 THEN t.amount ELSE 0 END) AS credits,
           SUM(CASE WHEN public.wallet_txn_direction(t.type) = -1 THEN t.amount ELSE 0 END) AS debits,
           COUNT(*) AS cnt
    FROM public.wallet_transactions t
    WHERE t.wallet_id = w.id AND t.status = 'completed'
  ) l ON true
  ORDER BY abs(w.balance - COALESCE(l.ledger,0)) DESC, w.created_at DESC;
END $$;

CREATE OR REPLACE FUNCTION public.reconcile_daily(_from date DEFAULT (CURRENT_DATE - 30), _to date DEFAULT CURRENT_DATE)
RETURNS TABLE (day date, credits numeric, debits numeric, net numeric, txn_count bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN RAISE EXCEPTION 'Not authorized'; END IF;
  RETURN QUERY
  SELECT d::date,
         round(COALESCE(SUM(CASE WHEN public.wallet_txn_direction(t.type)=1 THEN t.amount END),0),2),
         round(COALESCE(SUM(CASE WHEN public.wallet_txn_direction(t.type)=-1 THEN t.amount END),0),2),
         round(COALESCE(SUM(public.wallet_txn_direction(t.type)*t.amount),0),2),
         COUNT(t.id)
  FROM generate_series(_from, _to, interval '1 day') d
  LEFT JOIN public.wallet_transactions t
    ON t.created_at >= d AND t.created_at < d + interval '1 day' AND t.status='completed'
  GROUP BY d
  ORDER BY d DESC;
END $$;

CREATE OR REPLACE FUNCTION public.reconcile_escrow()
RETURNS TABLE (
  kind text, entity_id uuid, name text, status text, advertiser_email text,
  escrowed numeric, consumed numeric, refunded numeric, remaining numeric, drift numeric
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN RAISE EXCEPTION 'Not authorized'; END IF;
  RETURN QUERY
  SELECT 'campaign'::text, c.id, c.name, c.status::text, p.email,
         round(COALESCE(c.total_cost,0),2),
         round(GREATEST(COALESCE(c.total_cost,0) - COALESCE(c.budget_remaining,0),0),2),
         0::numeric,
         round(COALESCE(c.budget_remaining,0),2),
         round(COALESCE(c.budget_remaining,0) - COALESCE(c.total_cost,0),2)
  FROM public.campaigns c
  LEFT JOIN public.profiles p ON p.id = c.advertiser_id
  WHERE COALESCE(c.is_draft,false) = false
    AND COALESCE(c.budget_remaining,0) > COALESCE(c.total_cost,0) + 0.01

  UNION ALL

  SELECT 'campaign_ok'::text, c.id, c.name, c.status::text, p.email,
         round(COALESCE(c.total_cost,0),2),
         round(GREATEST(COALESCE(c.total_cost,0) - COALESCE(c.budget_remaining,0),0),2),
         0::numeric,
         round(COALESCE(c.budget_remaining,0),2),
         0::numeric
  FROM public.campaigns c
  LEFT JOIN public.profiles p ON p.id = c.advertiser_id
  WHERE COALESCE(c.is_draft,false) = false
    AND COALESCE(c.budget_remaining,0) <= COALESCE(c.total_cost,0) + 0.01

  UNION ALL

  SELECT CASE WHEN COALESCE(o.escrow_spent_usd,0) + COALESCE(o.refunded_usd,0) > COALESCE(o.total_amount_usd,0) + 0.01
              THEN 'package' ELSE 'package_ok' END,
         o.id, o.package_name, o.status, p.email,
         round(COALESCE(o.total_amount_usd,0),2),
         round(COALESCE(o.escrow_spent_usd,0),2),
         round(COALESCE(o.refunded_usd,0),2),
         round(GREATEST(COALESCE(o.total_amount_usd,0) - COALESCE(o.escrow_spent_usd,0) - COALESCE(o.refunded_usd,0),0),2),
         round(COALESCE(o.escrow_spent_usd,0) + COALESCE(o.refunded_usd,0) - COALESCE(o.total_amount_usd,0),2)
  FROM public.package_orders o
  LEFT JOIN public.profiles p ON p.id = o.advertiser_id;
END $$;

GRANT EXECUTE ON FUNCTION public.reconcile_wallets() TO authenticated;
GRANT EXECUTE ON FUNCTION public.reconcile_daily(date,date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reconcile_escrow() TO authenticated;

-- 6. Financial invariant self-test -------------------------------------------
CREATE OR REPLACE FUNCTION public.run_financial_selftest()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _results jsonb := '[]'::jsonb;
  _wallet record;
  _order record;
  _eid text := 'selftest-' || gen_random_uuid()::text;
  _r jsonb;
  _ok boolean;
  _def text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN RAISE EXCEPTION 'Not authorized'; END IF;

  -- Overdraw protection (rolled back)
  SELECT id, balance INTO _wallet FROM public.wallets ORDER BY created_at LIMIT 1;
  IF FOUND THEN
    _ok := false;
    BEGIN
      UPDATE public.wallets SET balance = balance - (balance + 1000) WHERE id = _wallet.id;
      RAISE EXCEPTION 'SELFTEST_ROLLBACK';
    EXCEPTION
      WHEN check_violation THEN _ok := true;
      WHEN OTHERS THEN _ok := false;
    END;
    _results := _results || jsonb_build_object('name','Wallet cannot be overdrawn','passed',_ok);
  ELSE
    _results := _results || jsonb_build_object('name','Wallet cannot be overdrawn','passed',null,'note','no wallets');
  END IF;

  -- Escrow overspend protection (rolled back)
  SELECT id, total_amount_usd INTO _order FROM public.package_orders ORDER BY created_at LIMIT 1;
  IF FOUND THEN
    _ok := false;
    BEGIN
      UPDATE public.package_orders
        SET escrow_spent_usd = COALESCE(total_amount_usd,0) + 500 WHERE id = _order.id;
      RAISE EXCEPTION 'SELFTEST_ROLLBACK';
    EXCEPTION
      WHEN check_violation THEN _ok := true;
      WHEN OTHERS THEN _ok := false;
    END;
    _results := _results || jsonb_build_object('name','Package escrow cannot be overspent','passed',_ok);
  ELSE
    _results := _results || jsonb_build_object('name','Package escrow cannot be overspent','passed',null,'note','no orders');
  END IF;

  -- Duplicate webhook protection (rolled back)
  _ok := false;
  BEGIN
    PERFORM public.process_payment_webhook('selftest', _eid, 'test', NULL, false, NULL);
    SELECT public.process_payment_webhook('selftest', _eid, 'test', NULL, false, NULL) INTO _r;
    _ok := COALESCE((_r->>'duplicate')::boolean, false);
    RAISE EXCEPTION 'SELFTEST_ROLLBACK';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM <> 'SELFTEST_ROLLBACK' THEN _ok := false; END IF;
  END;
  _results := _results || jsonb_build_object('name','Duplicate webhooks are rejected','passed',_ok);

  -- Row-lock coverage on money functions
  FOR _def IN SELECT unnest(ARRAY['process_payment_webhook','admin_credit_wallet','finalize_package_order','refund_campaign_escrow'])
  LOOP
    SELECT position('FOR UPDATE' in pg_get_functiondef(p.oid)) > 0 INTO _ok
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = _def LIMIT 1;
    _results := _results || jsonb_build_object('name', _def || ' locks rows (FOR UPDATE)', 'passed', COALESCE(_ok,false));
  END LOOP;

  -- Negative ledger amounts blocked
  _ok := false;
  BEGIN
    INSERT INTO public.wallet_transactions (wallet_id, amount, type, status, description)
    VALUES (COALESCE(_wallet.id, gen_random_uuid()), -5, 'funding', 'completed', 'selftest');
    RAISE EXCEPTION 'SELFTEST_ROLLBACK';
  EXCEPTION
    WHEN check_violation THEN _ok := true;
    WHEN OTHERS THEN _ok := false;
  END;
  _results := _results || jsonb_build_object('name','Negative ledger amounts blocked','passed',_ok);

  RETURN jsonb_build_object('ran_at', now(), 'results', _results);
END $$;

GRANT EXECUTE ON FUNCTION public.run_financial_selftest() TO authenticated;
