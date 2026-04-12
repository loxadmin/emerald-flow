
-- Remove the dangerous direct update policy
DROP POLICY IF EXISTS "Users can update own wallet" ON public.wallets;

-- Remove the direct insert policy for wallet_transactions
DROP POLICY IF EXISTS "Users can insert own wallet transactions" ON public.wallet_transactions;

-- Create a secure function for campaign escrow refunds
CREATE OR REPLACE FUNCTION public.refund_campaign_escrow(_campaign_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _campaign record;
  _wallet record;
  _refund_amount numeric;
BEGIN
  -- Verify the campaign belongs to the caller and has funds
  SELECT id, name, budget_remaining, is_draft, advertiser_id
  INTO _campaign
  FROM public.campaigns
  WHERE id = _campaign_id AND advertiser_id = _user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Campaign not found or not owned by user';
  END IF;

  _refund_amount := _campaign.budget_remaining;

  -- Nothing to refund for drafts or zero-balance campaigns
  IF _campaign.is_draft OR _refund_amount <= 0 THEN
    RETURN 0;
  END IF;

  -- Get the user's wallet
  SELECT id, balance INTO _wallet
  FROM public.wallets
  WHERE advertiser_id = _user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Wallet not found';
  END IF;

  -- Update wallet balance
  UPDATE public.wallets
  SET balance = _wallet.balance + _refund_amount,
      updated_at = now()
  WHERE id = _wallet.id;

  -- Record the refund transaction
  INSERT INTO public.wallet_transactions (wallet_id, amount, type, status, description)
  VALUES (_wallet.id, _refund_amount, 'refund', 'completed',
          'Refund from deleted campaign: ' || _campaign.name);

  RETURN _refund_amount;
END;
$$;
