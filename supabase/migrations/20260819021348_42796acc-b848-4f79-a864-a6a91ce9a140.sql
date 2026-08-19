-- 1. Exact currency storage (no floats, no sub-cent drift)
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT * FROM (VALUES
      ('wallets','balance'),('wallet_transactions','amount'),('transactions','amount'),
      ('withdrawal_requests','amount_usd'),
      ('affiliates','balance_usd'),('affiliates','locked_bonus_usd'),('affiliates','signup_bonus_usd'),
      ('affiliates','cycle_campaign_value_usd'),
      ('affiliate_withdrawals','amount_usd'),('affiliate_earnings','amount_usd'),
      ('affiliate_referrals','bonus_usd'),('affiliate_referrals','campaign_value_usd'),
      ('affiliate_referrals','commission_usd'),('affiliate_referrals','first_deposit_usd'),
      ('campaigns','budget_remaining'),('campaigns','extra_escrow_buffer'),('campaigns','total_cost'),
      ('campaigns','price_download'),('campaigns','price_signup'),('campaigns','price_purchase'),
      ('package_orders','escrow_spent_usd'),('package_orders','refunded_usd'),
      ('package_orders','total_amount_usd'),('package_orders','unit_price_usd'),
      ('package_order_deliveries','charged_usd'),('package_order_deliveries','total_txn_amount'),
      ('package_milestones','price_usd'),('ad_packages','unit_price_usd'),
      ('switch_offers','flat_price_usd'),('switch_offer_orders','flat_price_usd'),
      ('switch_order_metrics','total_txn_amount'),
      ('offline_orders','total_amount'),('offline_orders','unit_price'),('offline_orders','commission_amount'),
      ('offline_offers','submission_fee'),
      ('events','amount'),('manual_events','purchase_amount'),('manual_events','total_deducted'),
      ('offerwall_interactions','charge_amount'),('creative_campaigns','placement_fee')
    ) AS t(tbl, col)
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name=r.tbl AND column_name=r.col
        AND (data_type <> 'numeric' OR numeric_scale IS DISTINCT FROM 2)
    ) THEN
      EXECUTE format(
        'ALTER TABLE public.%I ALTER COLUMN %I TYPE numeric(14,2) USING round(%I::numeric, 2)',
        r.tbl, r.col, r.col);
    END IF;
  END LOOP;
END $$;

-- 2. Non-negative money invariants
ALTER TABLE public.wallets DROP CONSTRAINT IF EXISTS wallets_balance_non_negative;
ALTER TABLE public.wallets ADD CONSTRAINT wallets_balance_non_negative CHECK (balance >= 0) NOT VALID;

ALTER TABLE public.affiliates DROP CONSTRAINT IF EXISTS affiliates_balance_non_negative;
ALTER TABLE public.affiliates ADD CONSTRAINT affiliates_balance_non_negative CHECK (balance_usd >= 0) NOT VALID;

ALTER TABLE public.campaigns DROP CONSTRAINT IF EXISTS campaigns_escrow_non_negative;
ALTER TABLE public.campaigns ADD CONSTRAINT campaigns_escrow_non_negative CHECK (budget_remaining >= 0) NOT VALID;

ALTER TABLE public.withdrawal_requests DROP CONSTRAINT IF EXISTS withdrawal_requests_amount_positive;
ALTER TABLE public.withdrawal_requests ADD CONSTRAINT withdrawal_requests_amount_positive CHECK (amount_usd > 0) NOT VALID;

ALTER TABLE public.affiliate_withdrawals DROP CONSTRAINT IF EXISTS affiliate_withdrawals_amount_positive;
ALTER TABLE public.affiliate_withdrawals ADD CONSTRAINT affiliate_withdrawals_amount_positive CHECK (amount_usd > 0) NOT VALID;

ALTER TABLE public.withdrawal_requests ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;
ALTER TABLE public.withdrawal_requests ADD COLUMN IF NOT EXISTS reviewed_by uuid;
ALTER TABLE public.withdrawal_requests ADD COLUMN IF NOT EXISTS admin_notes text;
ALTER TABLE public.affiliate_withdrawals ADD COLUMN IF NOT EXISTS reviewed_by uuid;

-- 3. Race-safe, idempotent money movements
CREATE OR REPLACE FUNCTION public.topup_campaign_escrow(_campaign_id uuid, _amount numeric)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE
  _user_id uuid := auth.uid();
  _campaign record;
  _wallet record;
  _amt numeric := round(COALESCE(_amount,0), 2);
  _new_balance numeric;
  _new_escrow numeric;
BEGIN
  IF _user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _amt <= 0 THEN RAISE EXCEPTION 'Amount must be greater than zero'; END IF;

  SELECT id, name, status, budget_remaining INTO _campaign
  FROM public.campaigns WHERE id = _campaign_id AND advertiser_id = _user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Campaign not found'; END IF;
  IF _campaign.status NOT IN ('active','paused','pending') THEN
    RAISE EXCEPTION 'Cannot top up an ended or completed campaign';
  END IF;

  SELECT id, balance INTO _wallet FROM public.wallets WHERE advertiser_id = _user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Wallet not found'; END IF;
  IF _wallet.balance < _amt THEN RAISE EXCEPTION 'Insufficient wallet balance'; END IF;

  _new_balance := _wallet.balance - _amt;
  _new_escrow  := round(COALESCE(_campaign.budget_remaining,0) + _amt, 2);

  UPDATE public.wallets SET balance = _new_balance, updated_at = now() WHERE id = _wallet.id;
  INSERT INTO public.wallet_transactions (wallet_id, amount, type, status, description)
  VALUES (_wallet.id, _amt, 'escrow_topup', 'completed', 'Escrow top-up for campaign: ' || _campaign.name);

  UPDATE public.campaigns
  SET budget_remaining = _new_escrow,
      status = CASE WHEN status = 'paused' THEN 'active'::campaign_status ELSE status END
  WHERE id = _campaign_id;

  RETURN jsonb_build_object('success', true, 'new_escrow', _new_escrow, 'wallet_balance', _new_balance);
END; $function$;

CREATE OR REPLACE FUNCTION public.refund_campaign_escrow(_campaign_id uuid)
RETURNS numeric LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE
  _user_id uuid := auth.uid();
  _campaign record;
  _wallet record;
  _refund numeric;
BEGIN
  SELECT id, name, budget_remaining, is_draft INTO _campaign
  FROM public.campaigns
  WHERE id = _campaign_id
    AND (advertiser_id = _user_id OR public.has_role(_user_id, 'admin'::app_role))
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Campaign not found or not owned by user'; END IF;

  _refund := round(GREATEST(COALESCE(_campaign.budget_remaining,0), 0), 2);
  IF _campaign.is_draft OR _refund <= 0 THEN RETURN 0; END IF;

  SELECT id, balance INTO _wallet FROM public.wallets WHERE advertiser_id = _user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Wallet not found'; END IF;

  -- Release escrow first so the same funds can never be refunded twice
  UPDATE public.campaigns SET budget_remaining = 0 WHERE id = _campaign_id;

  UPDATE public.wallets SET balance = balance + _refund, updated_at = now() WHERE id = _wallet.id;
  INSERT INTO public.wallet_transactions (wallet_id, amount, type, status, description)
  VALUES (_wallet.id, _refund, 'refund', 'completed', 'Refund from deleted campaign: ' || _campaign.name);

  RETURN _refund;
END; $function$;

CREATE OR REPLACE FUNCTION public.finalize_package_order(_order_id uuid)
RETURNS numeric LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE
  _order record;
  _wallet record;
  _refund numeric;
BEGIN
  SELECT * INTO _order FROM package_orders WHERE id = _order_id FOR UPDATE;
  IF NOT FOUND OR _order.refunded_at IS NOT NULL THEN RETURN 0; END IF;
  IF _order.status NOT IN ('completed','ended','cancelled') THEN RETURN 0; END IF;

  _refund := round(GREATEST(COALESCE(_order.total_amount_usd,0) - COALESCE(_order.escrow_spent_usd,0), 0), 2);

  UPDATE package_orders
    SET refunded_usd = _refund, refunded_at = now(), updated_at = now()
    WHERE id = _order_id;

  IF _refund > 0 THEN
    SELECT id INTO _wallet FROM wallets WHERE advertiser_id = _order.advertiser_id FOR UPDATE;
    IF FOUND THEN
      UPDATE wallets SET balance = balance + _refund, updated_at = now() WHERE id = _wallet.id;
      INSERT INTO wallet_transactions(wallet_id, amount, type, status, description)
      VALUES (_wallet.id, _refund, 'refund', 'completed', 'Unused escrow refund: ' || _order.package_name);
    END IF;
  END IF;

  RETURN _refund;
END; $function$;

-- 4. Withdrawals now reserve funds at request time
CREATE OR REPLACE FUNCTION public.request_withdrawal(_amount numeric, _method text, _destination jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE
  _user uuid := auth.uid();
  _wallet record;
  _amt numeric := round(COALESCE(_amount,0), 2);
  _req_id uuid;
BEGIN
  IF _user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _amt <= 0 THEN RAISE EXCEPTION 'Amount must be greater than zero'; END IF;
  IF _method IS NULL OR length(trim(_method)) = 0 THEN RAISE EXCEPTION 'Method is required'; END IF;

  SELECT id, balance INTO _wallet FROM public.wallets WHERE advertiser_id = _user FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Wallet not found'; END IF;
  IF _amt > COALESCE(_wallet.balance, 0) THEN
    RAISE EXCEPTION 'Amount exceeds available wallet balance (escrow funds cannot be withdrawn)';
  END IF;

  UPDATE public.wallets SET balance = balance - _amt, updated_at = now() WHERE id = _wallet.id;
  INSERT INTO public.wallet_transactions (wallet_id, amount, type, status, description)
  VALUES (_wallet.id, _amt, 'withdrawal_hold', 'completed', 'Funds held for withdrawal request');

  INSERT INTO public.withdrawal_requests(advertiser_id, amount_usd, method, destination)
  VALUES (_user, _amt, _method, COALESCE(_destination, '{}'::jsonb))
  RETURNING id INTO _req_id;

  RETURN jsonb_build_object('success', true, 'id', _req_id);
END; $function$;

CREATE OR REPLACE FUNCTION public.review_withdrawal_request(_request_id uuid, _approve boolean, _notes text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE
  _req record;
  _wallet record;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN RAISE EXCEPTION 'Admin only'; END IF;

  SELECT * INTO _req FROM public.withdrawal_requests WHERE id = _request_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Request not found'; END IF;
  IF _req.status <> 'pending' THEN RAISE EXCEPTION 'Request already reviewed'; END IF;

  UPDATE public.withdrawal_requests
    SET status = CASE WHEN _approve THEN 'paid' ELSE 'rejected' END,
        reviewed_at = now(), reviewed_by = auth.uid(), admin_notes = _notes
    WHERE id = _request_id;

  IF NOT _approve THEN
    SELECT id INTO _wallet FROM public.wallets WHERE advertiser_id = _req.advertiser_id FOR UPDATE;
    IF FOUND THEN
      UPDATE public.wallets SET balance = balance + _req.amount_usd, updated_at = now() WHERE id = _wallet.id;
      INSERT INTO public.wallet_transactions (wallet_id, amount, type, status, description)
      VALUES (_wallet.id, _req.amount_usd, 'withdrawal_refund', 'completed', 'Rejected withdrawal returned to wallet');
    END IF;
  END IF;

  RETURN jsonb_build_object('success', true);
END; $function$;

CREATE OR REPLACE FUNCTION public.review_affiliate_withdrawal(_withdrawal_id uuid, _approve boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE _w record;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN RAISE EXCEPTION 'Admin only'; END IF;

  SELECT * INTO _w FROM public.affiliate_withdrawals WHERE id = _withdrawal_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Request not found'; END IF;
  IF _w.status <> 'pending' THEN RAISE EXCEPTION 'Request already reviewed'; END IF;

  UPDATE public.affiliate_withdrawals
    SET status = CASE WHEN _approve THEN 'paid' ELSE 'rejected' END,
        reviewed_at = now(), reviewed_by = auth.uid()
    WHERE id = _withdrawal_id;

  IF NOT _approve THEN
    UPDATE public.affiliates
      SET balance_usd = balance_usd + _w.amount_usd, updated_at = now()
      WHERE id = _w.affiliate_id;
  END IF;

  RETURN jsonb_build_object('success', true);
END; $function$;

-- 5. Race-safe admin wallet credit (replaces read-modify-write in edge function)
CREATE OR REPLACE FUNCTION public.admin_credit_wallet(_wallet_id uuid, _amount numeric, _description text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE
  _wallet record;
  _amt numeric := round(COALESCE(_amount,0), 2);
  _new numeric;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN RAISE EXCEPTION 'Admin only'; END IF;
  IF _amt <= 0 THEN RAISE EXCEPTION 'Amount must be greater than zero'; END IF;

  SELECT id, balance, is_activated INTO _wallet FROM public.wallets WHERE id = _wallet_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Wallet not found'; END IF;

  _new := round(_wallet.balance + _amt, 2);
  UPDATE public.wallets
    SET balance = _new, is_activated = true, updated_at = now()
    WHERE id = _wallet_id;

  INSERT INTO public.wallet_transactions (wallet_id, amount, type, status, description, reference)
  VALUES (_wallet_id, _amt, 'admin_topup', 'completed',
          COALESCE(_description, 'Admin top-up'), 'admin-' || auth.uid()::text || '-' || extract(epoch from now())::bigint);

  RETURN jsonb_build_object('success', true, 'new_balance', _new);
END; $function$;

REVOKE ALL ON FUNCTION public.admin_credit_wallet(uuid, numeric, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_credit_wallet(uuid, numeric, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.review_withdrawal_request(uuid, boolean, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.review_affiliate_withdrawal(uuid, boolean) TO authenticated, service_role;