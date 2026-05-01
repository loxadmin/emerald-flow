-- Add 'paused' and 'ended' statuses
ALTER TYPE public.campaign_status ADD VALUE IF NOT EXISTS 'paused';
ALTER TYPE public.campaign_status ADD VALUE IF NOT EXISTS 'ended';

-- Track which event types have hit their target/are fulfilled
ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS extra_escrow_buffer numeric NOT NULL DEFAULT 0;

-- RPC: top up a live campaign's escrow from advertiser wallet
CREATE OR REPLACE FUNCTION public.topup_campaign_escrow(_campaign_id uuid, _amount numeric)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _campaign record;
  _wallet record;
  _new_balance numeric;
  _new_escrow numeric;
BEGIN
  IF _amount IS NULL OR _amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be greater than zero';
  END IF;

  SELECT id, name, status, budget_remaining, advertiser_id
  INTO _campaign
  FROM public.campaigns
  WHERE id = _campaign_id AND advertiser_id = _user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Campaign not found';
  END IF;

  IF _campaign.status NOT IN ('active','paused','pending') THEN
    RAISE EXCEPTION 'Cannot top up an ended or completed campaign';
  END IF;

  SELECT id, balance INTO _wallet
  FROM public.wallets
  WHERE advertiser_id = _user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Wallet not found';
  END IF;

  IF _wallet.balance < _amount THEN
    RAISE EXCEPTION 'Insufficient wallet balance';
  END IF;

  _new_balance := _wallet.balance - _amount;
  _new_escrow := _campaign.budget_remaining + _amount;

  UPDATE public.wallets
  SET balance = _new_balance, updated_at = now()
  WHERE id = _wallet.id;

  INSERT INTO public.wallet_transactions (wallet_id, amount, type, status, description)
  VALUES (_wallet.id, _amount, 'escrow_topup', 'completed',
          'Escrow top-up for campaign: ' || _campaign.name);

  -- If campaign was paused due to insufficient funds, reactivate it
  UPDATE public.campaigns
  SET budget_remaining = _new_escrow,
      status = CASE WHEN status = 'paused' THEN 'active'::campaign_status ELSE status END
  WHERE id = _campaign_id;

  RETURN jsonb_build_object(
    'success', true,
    'new_escrow', _new_escrow,
    'wallet_balance', _new_balance
  );
END;
$$;

-- RPC: advertiser ends a live campaign and gets unused escrow refunded
CREATE OR REPLACE FUNCTION public.end_campaign_early(_campaign_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _campaign record;
  _wallet record;
  _refund numeric;
BEGIN
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
    SET balance = _wallet.balance + _refund, updated_at = now()
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
$$;