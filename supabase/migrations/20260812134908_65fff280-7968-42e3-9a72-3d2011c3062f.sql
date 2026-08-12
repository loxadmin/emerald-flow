-- Generic guard: block privileged column edits coming directly from PostgREST
-- (role "authenticated"). SECURITY DEFINER functions run as the function owner,
-- so trusted server-side RPCs and triggers are unaffected.

CREATE OR REPLACE FUNCTION public.guard_campaign_privileged_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF current_user = 'authenticated' AND NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    NEW.advertiser_id        := OLD.advertiser_id;
    NEW.status               := OLD.status;
    NEW.budget_remaining     := OLD.budget_remaining;
    NEW.total_cost           := OLD.total_cost;
    NEW.integration_verified := OLD.integration_verified;
    NEW.completed_at         := OLD.completed_at;
    NEW.auto_activation_at   := OLD.auto_activation_at;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_campaigns_privileged ON public.campaigns;
CREATE TRIGGER guard_campaigns_privileged
BEFORE UPDATE ON public.campaigns
FOR EACH ROW EXECUTE FUNCTION public.guard_campaign_privileged_columns();


CREATE OR REPLACE FUNCTION public.guard_affiliate_privileged_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF current_user = 'authenticated' AND NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    NEW.user_id                  := OLD.user_id;
    NEW.code                     := OLD.code;
    NEW.balance_usd              := OLD.balance_usd;
    NEW.signup_bonus_usd         := OLD.signup_bonus_usd;
    NEW.locked_bonus_usd         := OLD.locked_bonus_usd;
    NEW.withdrawable             := OLD.withdrawable;
    NEW.status                   := OLD.status;
    NEW.bonus_program_active     := OLD.bonus_program_active;
    NEW.bonus_cycles_won         := OLD.bonus_cycles_won;
    NEW.cycle_campaign_value_usd := OLD.cycle_campaign_value_usd;
    NEW.cycle_start              := OLD.cycle_start;
    NEW.cycle_end                := OLD.cycle_end;
    NEW.qualified_at             := OLD.qualified_at;
    NEW.qualify_deadline         := OLD.qualify_deadline;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_affiliates_privileged ON public.affiliates;
CREATE TRIGGER guard_affiliates_privileged
BEFORE UPDATE ON public.affiliates
FOR EACH ROW EXECUTE FUNCTION public.guard_affiliate_privileged_columns();


CREATE OR REPLACE FUNCTION public.guard_website_privileged_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF current_user = 'authenticated' AND NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    NEW.advertiser_id := OLD.advertiser_id;
    NEW.domain        := OLD.domain;
    NEW.is_verified   := OLD.is_verified;
    NEW.otp_code      := OLD.otp_code;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_advertiser_websites_privileged ON public.advertiser_websites;
CREATE TRIGGER guard_advertiser_websites_privileged
BEFORE UPDATE ON public.advertiser_websites
FOR EACH ROW EXECUTE FUNCTION public.guard_website_privileged_columns();


CREATE OR REPLACE FUNCTION public.guard_advertiser_category_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF current_user = 'authenticated' AND NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    NEW.advertiser_id := OLD.advertiser_id;
    NEW.status        := OLD.status;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_advertiser_categories_privileged ON public.advertiser_categories;
CREATE TRIGGER guard_advertiser_categories_privileged
BEFORE UPDATE ON public.advertiser_categories
FOR EACH ROW EXECUTE FUNCTION public.guard_advertiser_category_columns();


CREATE OR REPLACE FUNCTION public.guard_wallet_privileged_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF current_user = 'authenticated' AND NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    NEW.advertiser_id := OLD.advertiser_id;
    NEW.balance       := OLD.balance;
    NEW.is_activated  := OLD.is_activated;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_wallets_privileged ON public.wallets;
CREATE TRIGGER guard_wallets_privileged
BEFORE UPDATE ON public.wallets
FOR EACH ROW EXECUTE FUNCTION public.guard_wallet_privileged_columns();

REVOKE EXECUTE ON FUNCTION public.guard_campaign_privileged_columns() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.guard_affiliate_privileged_columns() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.guard_website_privileged_columns() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.guard_advertiser_category_columns() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.guard_wallet_privileged_columns() FROM anon, authenticated;