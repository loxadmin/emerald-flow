
ALTER TABLE public.affiliates
  ALTER COLUMN signup_bonus_usd SET DEFAULT 200,
  ALTER COLUMN balance_usd SET DEFAULT 0,
  ADD COLUMN IF NOT EXISTS locked_bonus_usd numeric NOT NULL DEFAULT 200,
  ADD COLUMN IF NOT EXISTS bonus_program_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS cycle_start timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS cycle_end timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  ADD COLUMN IF NOT EXISTS cycle_campaign_value_usd numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bonus_cycles_won integer NOT NULL DEFAULT 0;

ALTER TABLE public.affiliate_referrals
  ADD COLUMN IF NOT EXISTS campaign_value_usd numeric NOT NULL DEFAULT 0;

-- New commission engine: 10% of every campaign value placed by a referred advertiser
CREATE OR REPLACE FUNCTION public.credit_affiliate_campaign(_advertiser uuid, _source_type text, _source_id uuid, _value numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _ref public.affiliate_referrals;
  _aff public.affiliates;
  _commission numeric;
BEGIN
  IF _value IS NULL OR _value <= 0 THEN RETURN; END IF;

  SELECT * INTO _ref FROM affiliate_referrals WHERE advertiser_id = _advertiser;
  IF NOT FOUND THEN RETURN; END IF;

  SELECT * INTO _aff FROM affiliates WHERE id = _ref.affiliate_id;
  IF NOT FOUND OR _aff.status = 'closed' THEN RETURN; END IF;

  IF EXISTS (
    SELECT 1 FROM affiliate_earnings
    WHERE affiliate_id = _aff.id AND type = 'campaign_commission'
      AND description = _source_type || ':' || _source_id::text
  ) THEN
    RETURN;
  END IF;

  _commission := round((_value * 0.10)::numeric, 2);

  INSERT INTO affiliate_earnings (affiliate_id, referral_id, type, amount_usd, description)
  VALUES (_aff.id, _ref.id, 'campaign_commission', _commission, _source_type || ':' || _source_id::text);

  UPDATE affiliate_referrals
    SET status = 'qualified',
        qualified_at = COALESCE(qualified_at, now()),
        campaign_value_usd = campaign_value_usd + _value,
        commission_usd = commission_usd + _commission,
        bonus_usd = 0,
        source_type = COALESCE(source_type, _source_type),
        source_id = COALESCE(source_id, _source_id),
        updated_at = now()
    WHERE id = _ref.id;

  UPDATE affiliates
    SET balance_usd = balance_usd + _commission,
        withdrawable = true,
        status = CASE WHEN status = 'pending_qualification' THEN 'active' ELSE status END,
        qualified_at = COALESCE(qualified_at, now()),
        cycle_campaign_value_usd = cycle_campaign_value_usd
          + CASE WHEN bonus_program_active AND now() <= cycle_end THEN _value ELSE 0 END,
        updated_at = now()
    WHERE id = _aff.id;
END; $$;

-- Legacy entry point kept as a no-op shim so old triggers cannot double-pay
CREATE OR REPLACE FUNCTION public.qualify_affiliate_referral(_advertiser uuid, _source_type text, _source_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN;
END; $$;

CREATE OR REPLACE FUNCTION public.trg_affiliate_campaign_live()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status::text = 'active' AND COALESCE(OLD.status::text, '') <> 'active' THEN
    PERFORM public.credit_affiliate_campaign(NEW.advertiser_id, 'campaign', NEW.id, COALESCE(NEW.total_cost, 0));
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.trg_affiliate_package_order_live()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status = 'active' AND COALESCE(OLD.status, '') <> 'active' THEN
    PERFORM public.credit_affiliate_campaign(NEW.advertiser_id, 'package_order', NEW.id, COALESCE(NEW.total_amount_usd, 0));
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.trg_affiliate_switch_order_live()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status = 'active' THEN
    PERFORM public.credit_affiliate_campaign(NEW.advertiser_id, 'switch_offer', NEW.id, COALESCE(NEW.flat_price_usd, 0));
  END IF;
  RETURN NEW;
END; $$;

-- Registration: $200 locked bonus, nothing in withdrawable balance
CREATE OR REPLACE FUNCTION public.register_affiliate(_full_name text, _phone text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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

  INSERT INTO affiliates (
    user_id, code, full_name, email, phone,
    signup_bonus_usd, balance_usd, locked_bonus_usd,
    cycle_start, cycle_end, qualify_deadline
  )
  VALUES (
    _user, _code, COALESCE(NULLIF(_full_name,''), ''), COALESCE(_email, ''), _phone,
    200, 0, 200,
    now(), now() + interval '30 days', now() + interval '30 days'
  )
  RETURNING * INTO _row;

  RETURN jsonb_build_object('success', true, 'code', _row.code, 'existing', false);
END; $$;

-- Monthly bonus cycle evaluation
CREATE OR REPLACE FUNCTION public.evaluate_affiliate_bonus_cycles()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _a record;
  _processed integer := 0;
  _threshold numeric := 2000;
BEGIN
  FOR _a IN
    SELECT * FROM affiliates
    WHERE bonus_program_active = true AND now() > cycle_end AND status <> 'closed'
  LOOP
    IF _a.cycle_campaign_value_usd >= _threshold THEN
      UPDATE affiliates
        SET balance_usd = balance_usd + _a.locked_bonus_usd,
            withdrawable = true,
            bonus_cycles_won = bonus_cycles_won + 1,
            locked_bonus_usd = 200,
            cycle_campaign_value_usd = 0,
            cycle_start = cycle_end,
            cycle_end = cycle_end + interval '30 days',
            status = CASE WHEN status = 'pending_qualification' THEN 'active' ELSE status END,
            updated_at = now()
        WHERE id = _a.id;

      INSERT INTO affiliate_earnings (affiliate_id, type, amount_usd, description)
      VALUES (_a.id, 'bonus_unlocked', _a.locked_bonus_usd,
              'Monthly bonus unlocked ($' || round(_a.cycle_campaign_value_usd,2) || ' campaign value)');
    ELSE
      UPDATE affiliates
        SET bonus_program_active = false,
            locked_bonus_usd = 0,
            cycle_campaign_value_usd = 0,
            cycle_start = cycle_end,
            cycle_end = cycle_end + interval '30 days',
            updated_at = now()
        WHERE id = _a.id;

      INSERT INTO affiliate_earnings (affiliate_id, type, amount_usd, description)
      VALUES (_a.id, 'bonus_forfeited', 0,
              'Monthly bonus forfeited (only $' || round(_a.cycle_campaign_value_usd,2) || ' of $2000 campaign value)');
    END IF;
    _processed := _processed + 1;
  END LOOP;
  RETURN _processed;
END; $$;

-- Referrals no longer expire accounts; only stale pending referrals are marked
CREATE OR REPLACE FUNCTION public.expire_stale_affiliates()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE _count integer;
BEGIN
  WITH u AS (
    UPDATE affiliate_referrals SET status = 'expired', updated_at = now()
      WHERE status = 'pending' AND now() > deadline
      RETURNING 1
  ) SELECT count(*) INTO _count FROM u;
  RETURN _count;
END; $$;

-- Withdrawals allowed on any positive balance
CREATE OR REPLACE FUNCTION public.request_affiliate_withdrawal(_amount numeric, _method text, _destination jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _aff public.affiliates;
  _id uuid;
BEGIN
  SELECT * INTO _aff FROM affiliates WHERE user_id = auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'Affiliate account not found'; END IF;
  IF _aff.status = 'closed' THEN RAISE EXCEPTION 'Your affiliate account is closed'; END IF;
  IF _amount IS NULL OR _amount <= 0 THEN RAISE EXCEPTION 'Amount must be greater than zero'; END IF;
  IF _amount > _aff.balance_usd THEN RAISE EXCEPTION 'Amount exceeds available balance'; END IF;

  UPDATE affiliates SET balance_usd = balance_usd - _amount, updated_at = now() WHERE id = _aff.id;

  INSERT INTO affiliate_withdrawals (affiliate_id, amount_usd, method, destination)
  VALUES (_aff.id, _amount, _method, COALESCE(_destination, '{}'::jsonb))
  RETURNING id INTO _id;

  RETURN jsonb_build_object('success', true, 'id', _id);
END; $$;
