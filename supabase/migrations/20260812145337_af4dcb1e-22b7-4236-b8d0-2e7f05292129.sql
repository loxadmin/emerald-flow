CREATE OR REPLACE FUNCTION public.guard_campaign_privileged_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF current_user = 'authenticated' AND NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    -- Never client-writable
    NEW.advertiser_id        := OLD.advertiser_id;
    NEW.status               := OLD.status;
    NEW.budget_remaining     := OLD.budget_remaining;
    NEW.completed_at         := OLD.completed_at;
    NEW.integration_verified := OLD.integration_verified;

    -- Editable only while the campaign is still an unsubmitted draft
    IF COALESCE(OLD.is_draft, false) = false THEN
      NEW.total_cost         := OLD.total_cost;
      NEW.auto_activation_at := OLD.auto_activation_at;
      NEW.target_users       := OLD.target_users;
      NEW.is_draft           := OLD.is_draft;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.guard_campaign_privileged_columns() FROM anon, authenticated;