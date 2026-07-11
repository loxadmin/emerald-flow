
-- 1) Unified $25 activation fee
UPDATE public.admin_settings SET value = '25' WHERE key = 'activation_fee_usd';
INSERT INTO public.admin_settings (key, value, description)
  SELECT 'activation_fee_usd', '25', 'Wallet activation fee in USD'
  WHERE NOT EXISTS (SELECT 1 FROM public.admin_settings WHERE key = 'activation_fee_usd');
DELETE FROM public.admin_settings WHERE key LIKE 'category_activation_fee:%';

-- 2) Withdrawal requests
CREATE TABLE IF NOT EXISTS public.withdrawal_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_id uuid NOT NULL,
  amount_usd numeric NOT NULL CHECK (amount_usd > 0),
  method text NOT NULL,
  destination jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  admin_notes text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.withdrawal_requests TO authenticated;
GRANT ALL ON public.withdrawal_requests TO service_role;

ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Advertisers view own withdrawals"
  ON public.withdrawal_requests FOR SELECT TO authenticated
  USING (advertiser_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Advertisers create own withdrawals"
  ON public.withdrawal_requests FOR INSERT TO authenticated
  WITH CHECK (advertiser_id = auth.uid());

CREATE POLICY "Admins manage withdrawals"
  ON public.withdrawal_requests FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_withdrawal_requests_updated
  BEFORE UPDATE ON public.withdrawal_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) Request withdrawal RPC — validates balance only (never escrow)
CREATE OR REPLACE FUNCTION public.request_withdrawal(
  _amount numeric,
  _method text,
  _destination jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

  SELECT id, balance INTO _wallet FROM public.wallets WHERE advertiser_id = _user;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Wallet not found';
  END IF;
  IF _amount > COALESCE(_wallet.balance, 0) THEN
    RAISE EXCEPTION 'Amount exceeds available wallet balance (escrow funds cannot be withdrawn)';
  END IF;

  INSERT INTO public.withdrawal_requests(advertiser_id, amount_usd, method, destination)
  VALUES (_user, _amount, _method, COALESCE(_destination, '{}'::jsonb))
  RETURNING id INTO _req_id;

  RETURN jsonb_build_object('success', true, 'id', _req_id);
END;
$$;
