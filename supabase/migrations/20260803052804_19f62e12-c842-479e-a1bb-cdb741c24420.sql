
-- ============ AFFILIATES ============
CREATE TABLE public.affiliates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  code text NOT NULL UNIQUE,
  full_name text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  phone text,
  payout_method text,
  payout_details jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending_qualification',
  signup_bonus_usd numeric NOT NULL DEFAULT 50,
  balance_usd numeric NOT NULL DEFAULT 50,
  withdrawable boolean NOT NULL DEFAULT false,
  qualify_deadline timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  qualified_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.affiliates TO authenticated;
GRANT ALL ON public.affiliates TO service_role;
ALTER TABLE public.affiliates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Affiliates view own" ON public.affiliates FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Affiliates update own" ON public.affiliates FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- ============ REFERRALS ============
CREATE TABLE public.affiliate_referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  advertiser_id uuid NOT NULL UNIQUE,
  advertiser_email text,
  status text NOT NULL DEFAULT 'pending',
  deadline timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  first_deposit_usd numeric,
  bonus_usd numeric NOT NULL DEFAULT 0,
  commission_usd numeric NOT NULL DEFAULT 0,
  qualified_at timestamptz,
  source_type text,
  source_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.affiliate_referrals TO authenticated;
GRANT ALL ON public.affiliate_referrals TO service_role;
ALTER TABLE public.affiliate_referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Affiliate referrals visible to owner" ON public.affiliate_referrals FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR affiliate_id IN (SELECT id FROM public.affiliates WHERE user_id = auth.uid()));

-- ============ EARNINGS ============
CREATE TABLE public.affiliate_earnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  referral_id uuid REFERENCES public.affiliate_referrals(id) ON DELETE SET NULL,
  type text NOT NULL,
  amount_usd numeric NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.affiliate_earnings TO authenticated;
GRANT ALL ON public.affiliate_earnings TO service_role;
ALTER TABLE public.affiliate_earnings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Affiliate earnings visible to owner" ON public.affiliate_earnings FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR affiliate_id IN (SELECT id FROM public.affiliates WHERE user_id = auth.uid()));

-- ============ WITHDRAWALS ============
CREATE TABLE public.affiliate_withdrawals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  amount_usd numeric NOT NULL,
  method text NOT NULL,
  destination jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  admin_notes text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.affiliate_withdrawals TO authenticated;
GRANT ALL ON public.affiliate_withdrawals TO service_role;
ALTER TABLE public.affiliate_withdrawals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Affiliate withdrawals visible to owner" ON public.affiliate_withdrawals FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR affiliate_id IN (SELECT id FROM public.affiliates WHERE user_id = auth.uid()));
CREATE POLICY "Admins manage affiliate withdrawals" ON public.affiliate_withdrawals FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_affiliates_updated BEFORE UPDATE ON public.affiliates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_affiliate_referrals_updated BEFORE UPDATE ON public.affiliate_referrals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_affiliate_withdrawals_updated BEFORE UPDATE ON public.affiliate_withdrawals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ FUNCTIONS ============
CREATE OR REPLACE FUNCTION public.register_affiliate(_full_name text, _phone text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  _user uuid := auth.uid();
  _email text;
  _code text;
  _row public.affiliates;
BEGIN
  IF _user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT * INTO _row FROM affiliates WHERE user_id = _user;
  IF FOUND THEN
    RETURN jsonb_build_object('success', true, 'code', _row.code, 'existing', true);
  END IF;

  SELECT email INTO _email FROM profiles WHERE id = _user;

  LOOP
    _code := 'KA' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM affiliates WHERE code = _code);
  END LOOP;

  INSERT INTO affiliates (user_id, code, full_name, email, phone)
  VALUES (_user, _code, COALESCE(NULLIF(_full_name,''), ''), COALESCE(_email, ''), _phone)
  RETURNING * INTO _row;

  INSERT INTO affiliate_earnings (affiliate_id, type, amount_usd, description)
  VALUES (_row.id, 'signup_bonus', 50, 'Affiliate signup bonus (locked until first qualified referral)');

  RETURN jsonb_build_object('success', true, 'code', _row.code, 'existing', false);
END; $$;

-- Attach a referred advertiser to an affiliate (called right after advertiser signup)
CREATE OR REPLACE FUNCTION public.attach_affiliate_referral(_code text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  _user uuid := auth.uid();
  _aff public.affiliates;
  _email text;
BEGIN
  IF _user IS NULL OR _code IS NULL OR length(trim(_code)) = 0 THEN
    RETURN jsonb_build_object('success', false);
  END IF;

  SELECT * INTO _aff FROM affiliates WHERE upper(code) = upper(trim(_code));
  IF NOT FOUND OR _aff.status = 'closed' OR _aff.user_id = _user THEN
    RETURN jsonb_build_object('success', false);
  END IF;
  IF EXISTS (SELECT 1 FROM affiliate_referrals WHERE advertiser_id = _user) THEN
    RETURN jsonb_build_object('success', false, 'reason', 'already_referred');
  END IF;

  SELECT email INTO _email FROM profiles WHERE id = _user;

  INSERT INTO affiliate_referrals (affiliate_id, advertiser_id, advertiser_email)
  VALUES (_aff.id, _user, _email);

  RETURN jsonb_build_object('success', true);
END; $$;

-- Core qualification: called when a referred advertiser has something live
CREATE OR REPLACE FUNCTION public.qualify_affiliate_referral(_advertiser uuid, _source_type text, _source_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  _ref public.affiliate_referrals;
  _aff public.affiliates;
  _deposit numeric;
  _commission numeric;
BEGIN
  SELECT * INTO _ref FROM affiliate_referrals WHERE advertiser_id = _advertiser;
  IF NOT FOUND OR _ref.status <> 'pending' THEN RETURN; END IF;

  IF now() > _ref.deadline THEN
    UPDATE affiliate_referrals SET status = 'expired', updated_at = now() WHERE id = _ref.id;
    RETURN;
  END IF;

  SELECT * INTO _aff FROM affiliates WHERE id = _ref.affiliate_id;
  IF NOT FOUND OR _aff.status = 'closed' THEN RETURN; END IF;

  SELECT wt.amount INTO _deposit
  FROM wallet_transactions wt
  JOIN wallets w ON w.id = wt.wallet_id
  WHERE w.advertiser_id = _advertiser
    AND wt.status = 'completed'
    AND wt.type IN ('funding', 'activation', 'admin_topup')
  ORDER BY wt.created_at
  LIMIT 1;

  IF _deposit IS NULL OR _deposit <= 0 THEN RETURN; END IF;

  _commission := round((_deposit * 0.05)::numeric, 2);

  UPDATE affiliate_referrals
    SET status = 'qualified', qualified_at = now(), first_deposit_usd = _deposit,
        bonus_usd = 50, commission_usd = _commission,
        source_type = _source_type, source_id = _source_id, updated_at = now()
    WHERE id = _ref.id;

  INSERT INTO affiliate_earnings (affiliate_id, referral_id, type, amount_usd, description)
  VALUES (_aff.id, _ref.id, 'referral_bonus', 50, 'Qualified advertiser referral'),
         (_aff.id, _ref.id, 'deposit_commission', _commission, '5% of first deposit');

  UPDATE affiliates
    SET balance_usd = balance_usd + 50 + _commission,
        withdrawable = true,
        status = CASE WHEN status = 'pending_qualification' THEN 'active' ELSE status END,
        qualified_at = COALESCE(qualified_at, now()),
        updated_at = now()
    WHERE id = _aff.id;
END; $$;

-- Triggers on "goes live" events
CREATE OR REPLACE FUNCTION public.trg_affiliate_campaign_live()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.status::text = 'active' AND COALESCE(OLD.status::text, '') <> 'active' THEN
    PERFORM public.qualify_affiliate_referral(NEW.advertiser_id, 'campaign', NEW.id);
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.trg_affiliate_package_order_live()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.status = 'active' AND COALESCE(OLD.status, '') <> 'active' THEN
    PERFORM public.qualify_affiliate_referral(NEW.advertiser_id, 'package_order', NEW.id);
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.trg_affiliate_switch_order_live()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.status = 'active' THEN
    PERFORM public.qualify_affiliate_referral(NEW.advertiser_id, 'switch_offer', NEW.id);
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER affiliate_campaign_live AFTER UPDATE ON public.campaigns
  FOR EACH ROW EXECUTE FUNCTION public.trg_affiliate_campaign_live();
CREATE TRIGGER affiliate_package_order_live AFTER UPDATE ON public.package_orders
  FOR EACH ROW EXECUTE FUNCTION public.trg_affiliate_package_order_live();
CREATE TRIGGER affiliate_switch_order_live AFTER INSERT ON public.switch_offer_orders
  FOR EACH ROW EXECUTE FUNCTION public.trg_affiliate_switch_order_live();

-- Expiry sweeper
CREATE OR REPLACE FUNCTION public.expire_stale_affiliates()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _count integer;
BEGIN
  UPDATE affiliate_referrals SET status = 'expired', updated_at = now()
    WHERE status = 'pending' AND now() > deadline;

  WITH closed AS (
    UPDATE affiliates SET status = 'closed', closed_at = now(), balance_usd = 0,
                          withdrawable = false, updated_at = now()
    WHERE status = 'pending_qualification' AND now() > qualify_deadline
    RETURNING 1
  ) SELECT count(*) INTO _count FROM closed;
  RETURN _count;
END; $$;

-- Withdrawal request
CREATE OR REPLACE FUNCTION public.request_affiliate_withdrawal(_amount numeric, _method text, _destination jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  _aff public.affiliates;
  _id uuid;
BEGIN
  SELECT * INTO _aff FROM affiliates WHERE user_id = auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'Affiliate account not found'; END IF;
  IF _aff.status = 'closed' THEN RAISE EXCEPTION 'Your affiliate account is closed'; END IF;
  IF NOT _aff.withdrawable THEN
    RAISE EXCEPTION 'You must refer at least one paying advertiser before withdrawing';
  END IF;
  IF _amount IS NULL OR _amount <= 0 THEN RAISE EXCEPTION 'Amount must be greater than zero'; END IF;
  IF _amount > _aff.balance_usd THEN RAISE EXCEPTION 'Amount exceeds available balance'; END IF;

  UPDATE affiliates SET balance_usd = balance_usd - _amount, updated_at = now() WHERE id = _aff.id;

  INSERT INTO affiliate_withdrawals (affiliate_id, amount_usd, method, destination)
  VALUES (_aff.id, _amount, _method, COALESCE(_destination, '{}'::jsonb))
  RETURNING id INTO _id;

  RETURN jsonb_build_object('success', true, 'id', _id);
END; $$;
