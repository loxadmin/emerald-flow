
-- ============================================================
-- First $1,000 escrow-spend reward (non-withdrawable campaign credit)
-- ============================================================

-- 1) Wallet accounting columns
ALTER TABLE public.wallets
  ADD COLUMN IF NOT EXISTS bonus_granted_total_usd numeric(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bonus_usd numeric(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS escrow_spent_total_usd numeric(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS first_1k_bonus_granted boolean NOT NULL DEFAULT false;

-- The bonus can never be negative or larger than the balance it sits inside
ALTER TABLE public.wallets DROP CONSTRAINT IF EXISTS wallets_bonus_within_balance;
ALTER TABLE public.wallets ADD CONSTRAINT wallets_bonus_within_balance
  CHECK (bonus_usd >= 0 AND bonus_usd <= GREATEST(balance, 0));

-- Bonus accounting is engine-managed: no client role may write these columns
REVOKE UPDATE (bonus_granted_total_usd, bonus_usd, escrow_spent_total_usd, first_1k_bonus_granted)
  ON public.wallets FROM anon, authenticated;

-- 2) Ledger: allow the 'bonus' type (direction already treats it as a credit)
ALTER TABLE public.wallet_transactions DROP CONSTRAINT IF EXISTS wallet_transactions_type_check;
ALTER TABLE public.wallet_transactions ADD CONSTRAINT wallet_transactions_type_check
CHECK (type = ANY (ARRAY['funding','charge','activation','refund','bonus','escrow','package_escrow',
  'escrow_topup','offer_escrow','switch_offer_escrow','offline_commission','sale_commission',
  'manual_conversion','manual_adjustment','placement_fee']));

-- 3) Central grant: accumulate escrow spend, pay $1,000 bonus once at $1,000
CREATE OR REPLACE FUNCTION public.note_escrow_spend(_advertiser_id uuid, _amount numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  _w record;
  _amt numeric := round(COALESCE(_amount, 0), 2);
  _new_total numeric(14,2);
BEGIN
  IF _advertiser_id IS NULL OR _amt <= 0 THEN RETURN; END IF;
  IF COALESCE(current_setting('app.skip_escrow_spend', true), '') = 'on' THEN RETURN; END IF;

  SELECT id, escrow_spent_total_usd, first_1k_bonus_granted, balance, bonus_usd, bonus_granted_total_usd
  INTO _w
  FROM public.wallets
  WHERE advertiser_id = _advertiser_id
  FOR UPDATE;
  IF NOT FOUND OR _w.first_1k_bonus_granted THEN RETURN; END IF;

  _new_total := round(_w.escrow_spent_total_usd + _amt, 2);

  IF _new_total < 1000 THEN
    UPDATE public.wallets SET escrow_spent_total_usd = _new_total, updated_at = now() WHERE id = _w.id;
    RETURN;
  END IF;

  UPDATE public.wallets
  SET escrow_spent_total_usd = _new_total,
      first_1k_bonus_granted = true,
      bonus_granted_total_usd = round(_w.bonus_granted_total_usd + 1000, 2),
      bonus_usd = round(_w.bonus_usd + 1000, 2),
      balance = round(_w.balance + 1000, 2),
      updated_at = now()
  WHERE id = _w.id;

  INSERT INTO public.wallet_transactions (wallet_id, amount, type, status, description)
  VALUES (_w.id, 1000, 'bonus', 'completed',
    'Reward: first $1,000 of escrow spent (campaign credit, non-withdrawable)');
END;
$function$;
REVOKE ALL ON FUNCTION public.note_escrow_spend(uuid, numeric) FROM public, anon, authenticated;

-- 4) Wallets: bonus is consumed first whenever balance decreases, and never exceeds balance
CREATE OR REPLACE FUNCTION public.wallet_consume_bonus()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF NEW.balance < OLD.balance THEN
    NEW.bonus_usd := GREATEST(round(OLD.bonus_usd - (OLD.balance - NEW.balance), 2), 0::numeric);
  END IF;
  NEW.bonus_usd := LEAST(NEW.bonus_usd, GREATEST(NEW.balance, 0::numeric));
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS wallet_bonus_consume ON public.wallets;
CREATE TRIGGER wallet_bonus_consume
BEFORE UPDATE ON public.wallets
FOR EACH ROW EXECUTE FUNCTION public.wallet_consume_bonus();

-- 5) Escrow-spend counters ------------------------------------------------
-- 5a) Campaigns: real-time ad charges draw down campaign escrow.
--     Refunds zero escrow together with a terminal status (or via the skip
--     flag set inside refund functions), so they are never counted.
CREATE OR REPLACE FUNCTION public.trg_campaign_escrow_spend()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE _delta numeric;
BEGIN
  IF COALESCE(current_setting('app.skip_escrow_spend', true), '') = 'on' THEN RETURN NEW; END IF;
  IF NEW.budget_remaining < OLD.budget_remaining
     AND NEW.status NOT IN ('completed','ended','rejected') THEN
    _delta := round(OLD.budget_remaining - NEW.budget_remaining, 2);
    IF _delta > 0 THEN
      PERFORM public.note_escrow_spend(NEW.advertiser_id, _delta);
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS escrow_spend_campaigns ON public.campaigns;
CREATE TRIGGER escrow_spend_campaigns
AFTER UPDATE ON public.campaigns
FOR EACH ROW EXECUTE FUNCTION public.trg_campaign_escrow_spend();

-- 5b) Package orders (legacy + swift): deliveries accumulate escrow_spent_usd
CREATE OR REPLACE FUNCTION public.trg_package_order_escrow_spend()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE _delta numeric;
BEGIN
  IF NEW.escrow_spent_usd > OLD.escrow_spent_usd THEN
    _delta := round(NEW.escrow_spent_usd - OLD.escrow_spent_usd, 2);
    IF _delta > 0 THEN
      PERFORM public.note_escrow_spend(NEW.advertiser_id, _delta);
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS escrow_spend_package_orders ON public.package_orders;
CREATE TRIGGER escrow_spend_package_orders
AFTER UPDATE OF escrow_spent_usd ON public.package_orders
FOR EACH ROW EXECUTE FUNCTION public.trg_package_order_escrow_spend();

-- 5c) Roast and Boost: released escrow is spend; rejected orders refund, not spend
CREATE OR REPLACE FUNCTION public.trg_roast_boost_escrow_spend()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE _delta numeric;
BEGIN
  IF NEW.escrow_balance < OLD.escrow_balance AND NEW.status <> 'rejected' THEN
    _delta := round(OLD.escrow_balance - NEW.escrow_balance, 2);
    IF _delta > 0 THEN
      PERFORM public.note_escrow_spend(NEW.advertiser_id, _delta);
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS escrow_spend_roast_boost_orders ON public.roast_boost_orders;
CREATE TRIGGER escrow_spend_roast_boost_orders
AFTER UPDATE OF escrow_balance ON public.roast_boost_orders
FOR EACH ROW EXECUTE FUNCTION public.trg_roast_boost_escrow_spend();

-- 5d) Switch offers: the held flat price is spent when the order completes
CREATE OR REPLACE FUNCTION public.trg_switch_order_escrow_spend()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF NEW.status = 'completed' AND OLD.status <> 'completed'
     AND COALESCE(current_setting('app.skip_escrow_spend', true), '') <> 'on'
     AND COALESCE(NEW.flat_price_usd, 0) > 0 THEN
    PERFORM public.note_escrow_spend(NEW.advertiser_id, NEW.flat_price_usd);
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS escrow_spend_switch_orders ON public.switch_offer_orders;
CREATE TRIGGER escrow_spend_switch_orders
AFTER UPDATE ON public.switch_offer_orders
FOR EACH ROW EXECUTE FUNCTION public.trg_switch_order_escrow_spend();

-- 6) Withdrawals may never touch the bonus portion of the balance
CREATE OR REPLACE FUNCTION public.request_withdrawal(
  _amount numeric,
  _method text,
  _destination jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  _user uuid := auth.uid();
  _wallet record;
  _req_id uuid;
BEGIN
  IF _user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF _amount IS NULL OR _amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be greater than zero';
  END IF;
  IF _method IS NULL OR length(trim(_method)) = 0 THEN
    RAISE EXCEPTION 'Method is required';
  END IF;

  SELECT id, balance, bonus_usd INTO _wallet FROM public.wallets WHERE advertiser_id = _user;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Wallet not found';
  END IF;
  IF _amount > COALESCE(_wallet.balance, 0) - COALESCE(_wallet.bonus_usd, 0) THEN
    RAISE EXCEPTION 'Amount exceeds available balance (escrow funds and campaign bonus credit cannot be withdrawn)';
  END IF;

  INSERT INTO public.withdrawal_requests(advertiser_id, amount_usd, method, destination)
  VALUES (_user, _amount, _method, COALESCE(_destination, '{}'::jsonb))
  RETURNING id INTO _req_id;

  RETURN jsonb_build_object('success', true, 'id', _req_id);
END;
$function$;

-- 7) Escrow refunds return bonus credit to the bonus pool first, so bonus
--    money can never be converted into withdrawable cash via fund-then-refund.

CREATE OR REPLACE FUNCTION public.refund_campaign_escrow(_campaign_id uuid)
RETURNS numeric LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE
  _user_id uuid := auth.uid();
  _campaign record;
  _wallet record;
  _refund numeric;
BEGIN
  PERFORM set_config('app.skip_escrow_spend', 'on', true);

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

  UPDATE public.wallets
    SET balance = balance + _refund,
        bonus_usd = LEAST(bonus_usd + _refund, bonus_granted_total_usd),
        updated_at = now()
    WHERE id = _wallet.id;
  INSERT INTO public.wallet_transactions (wallet_id, amount, type, status, description)
  VALUES (_wallet.id, _refund, 'refund', 'completed', 'Refund from deleted campaign: ' || _campaign.name);

  RETURN _refund;
END; $function$;

CREATE OR REPLACE FUNCTION public.end_campaign_early(_campaign_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  _user_id uuid := auth.uid();
  _campaign record;
  _wallet record;
  _refund numeric;
BEGIN
  PERFORM set_config('app.skip_escrow_spend', 'on', true);

  SELECT id, name, status, budget_remaining, advertiser_id
  INTO _campaign
  FROM public.campaigns
  WHERE id = _campaign_id AND advertiser_id = _user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Campaign not found';
  END IF;

  IF _campaign.status NOT IN ('active','paused','pending') THEN
    RAISE EXCEPTION 'Campaign is not live';
  END IF;

  _refund := COALESCE(_campaign.budget_remaining, 0);

  SELECT id, balance INTO _wallet
  FROM public.wallets
  WHERE advertiser_id = _user_id;

  IF FOUND AND _refund > 0 THEN
    UPDATE public.wallets
    SET balance = _wallet.balance + _refund,
        bonus_usd = LEAST(bonus_usd + _refund, bonus_granted_total_usd),
        updated_at = now()
    WHERE id = _wallet.id;

    INSERT INTO public.wallet_transactions (wallet_id, amount, type, status, description)
    VALUES (_wallet.id, _refund, 'refund', 'completed',
            'Refund from ended campaign: ' || _campaign.name);
  END IF;

  UPDATE public.campaigns
  SET status = 'ended'::campaign_status,
      budget_remaining = 0,
      completed_at = now()
  WHERE id = _campaign_id;

  RETURN jsonb_build_object('success', true, 'refunded', _refund);
END;
$function$;

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
      UPDATE wallets
        SET balance = balance + _refund,
            bonus_usd = LEAST(bonus_usd + _refund, bonus_granted_total_usd),
            updated_at = now()
        WHERE id = _wallet.id;
      INSERT INTO wallet_transactions(wallet_id, amount, type, status, description)
      VALUES (_wallet.id, _refund, 'refund', 'completed', 'Unused escrow refund: ' || _order.package_name);
    END IF;
  END IF;

  RETURN _refund;
END; $function$;

CREATE OR REPLACE FUNCTION public.review_roast_boost(_order_id uuid, _approve boolean, _notes text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE _o record; _w uuid;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Not authorized'; END IF;
  SELECT * INTO _o FROM public.roast_boost_orders WHERE id = _order_id FOR UPDATE;
  IF NOT FOUND OR _o.status <> 'pending_approval' THEN RAISE EXCEPTION 'Order is not awaiting approval'; END IF;
  IF _approve THEN
    UPDATE public.roast_boost_orders SET status='active', admin_notes=_notes, starts_at=now(), ends_at=now() + make_interval(days => _o.days) WHERE id=_order_id;
  ELSE
    SELECT id INTO _w FROM public.wallets WHERE advertiser_id = _o.advertiser_id FOR UPDATE;
    IF _o.escrow_balance > 0 THEN
      UPDATE public.wallets
        SET balance = balance + _o.escrow_balance,
            bonus_usd = LEAST(bonus_usd + _o.escrow_balance, bonus_granted_total_usd),
            updated_at=now()
        WHERE id=_w;
      INSERT INTO public.wallet_transactions(wallet_id, amount, type, status, description)
        VALUES (_w, _o.escrow_balance, 'refund', 'completed', 'Refund: Roast and Boost rejected');
    END IF;
    UPDATE public.roast_boost_orders SET status='rejected', admin_notes=_notes, escrow_balance=0 WHERE id=_order_id;
  END IF;
  RETURN jsonb_build_object('success', true);
END $function$;

CREATE OR REPLACE FUNCTION public.review_offline_offer(_offer_id uuid, _approve boolean, _notes text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  _offer record;
  _wallet record;
BEGIN
  IF NOT has_role(auth.uid(),'admin'::app_role) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  SELECT * INTO _offer FROM offline_offers WHERE id = _offer_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Offer not found'; END IF;
  IF _approve THEN
    UPDATE offline_offers SET status='approved', admin_notes=_notes, reviewed_at=now(), updated_at=now() WHERE id=_offer_id;
  ELSE
    SELECT id INTO _wallet FROM wallets WHERE advertiser_id = _offer.advertiser_id;
    IF FOUND THEN
      UPDATE wallets
        SET balance = balance + _offer.submission_fee,
            bonus_usd = LEAST(bonus_usd + _offer.submission_fee, bonus_granted_total_usd),
            updated_at=now()
        WHERE id=_wallet.id;
      INSERT INTO wallet_transactions(wallet_id, amount, type, status, description)
      VALUES (_wallet.id, _offer.submission_fee,'refund','completed','Refund: rejected offline offer');
    END IF;
    UPDATE offline_offers SET status='rejected', admin_notes=_notes, reviewed_at=now(), updated_at=now() WHERE id=_offer_id;
  END IF;
  RETURN jsonb_build_object('success', true);
END;
$function$;

CREATE OR REPLACE FUNCTION public.review_package_order(_order_id uuid, _approve boolean, _notes text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
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
      UPDATE wallets
        SET balance = balance + _order.total_amount_usd,
            bonus_usd = LEAST(bonus_usd + _order.total_amount_usd, bonus_granted_total_usd),
            updated_at=now()
        WHERE id=_wallet.id;
      INSERT INTO wallet_transactions(wallet_id, amount, type, status, description)
      VALUES (_wallet.id, _order.total_amount_usd, 'refund', 'completed', 'Refund: rejected package order');
    END IF;
    UPDATE package_orders
      SET status='rejected', admin_notes=_notes, reviewed_by=auth.uid(), reviewed_at=now(), updated_at=now()
      WHERE id=_order_id;
  END IF;
  RETURN jsonb_build_object('success', true);
END; $function$;

CREATE OR REPLACE FUNCTION public.respond_swift_order_edit(_order_id uuid, _accept boolean)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE _o record; _wallet record; _diff numeric;
BEGIN
  SELECT * INTO _o FROM package_orders WHERE id=_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF _o.advertiser_id <> auth.uid() THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF _o.status <> 'pending_advertiser_approval' THEN RAISE EXCEPTION 'No pending change on this order'; END IF;
  SELECT id, balance INTO _wallet FROM wallets WHERE advertiser_id=_o.advertiser_id FOR UPDATE;

  IF _accept THEN
    _diff := COALESCE(_o.proposed_total_usd,_o.total_amount_usd) - _o.total_amount_usd;
    IF _diff > 0 THEN
      IF _wallet.id IS NULL OR _wallet.balance < _diff THEN
        RAISE EXCEPTION 'Top up your wallet with $% to approve these changes', to_char(_diff,'FM999999990.00'); END IF;
      UPDATE wallets SET balance = balance - _diff, updated_at=now() WHERE id=_wallet.id;
      INSERT INTO wallet_transactions(wallet_id, amount, type, status, description)
      VALUES (_wallet.id, _diff, 'package_escrow','completed','Escrow top-up: swift order edit');
    ELSIF _diff < 0 THEN
      UPDATE wallets
        SET balance = balance + (-_diff),
            bonus_usd = LEAST(bonus_usd + (-_diff), bonus_granted_total_usd),
            updated_at=now()
        WHERE id=_wallet.id;
      INSERT INTO wallet_transactions(wallet_id, amount, type, status, description)
      VALUES (_wallet.id, -_diff, 'refund','completed','Escrow release: swift order edit');
    END IF;
    UPDATE package_orders
      SET swift_actions = COALESCE(proposed_actions, swift_actions),
          total_amount_usd = COALESCE(proposed_total_usd, total_amount_usd),
          proposed_actions=NULL, proposed_total_usd=NULL,
          status='pending_review', updated_at=now()
      WHERE id=_order_id;
    RETURN jsonb_build_object('success', true, 'accepted', true, 'charged', GREATEST(_diff,0));
  END IF;

  IF _wallet.id IS NOT NULL AND _o.total_amount_usd > 0 THEN
    UPDATE wallets
      SET balance = balance + _o.total_amount_usd,
          bonus_usd = LEAST(bonus_usd + _o.total_amount_usd, bonus_granted_total_usd),
          updated_at=now()
      WHERE id=_wallet.id;
    INSERT INTO wallet_transactions(wallet_id, amount, type, status, description)
    VALUES (_wallet.id, _o.total_amount_usd, 'refund','completed','Refund: swift order edit declined');
  END IF;
  UPDATE package_orders
    SET status='rejected', refunded_usd=_o.total_amount_usd, refunded_at=now(),
        proposed_actions=NULL, proposed_total_usd=NULL,
        admin_notes = COALESCE(admin_notes,'') || ' | Advertiser declined the revised deliverables',
        updated_at=now()
    WHERE id=_order_id;
  RETURN jsonb_build_object('success', true, 'accepted', false);
END; $function$;
