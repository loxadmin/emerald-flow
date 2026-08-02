-- 1. Profile logo
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url text;

-- 2. Promo media on package orders
ALTER TABLE public.package_orders
  ADD COLUMN IF NOT EXISTS promo_media_url text,
  ADD COLUMN IF NOT EXISTS promo_media_path text,
  ADD COLUMN IF NOT EXISTS promo_media_type text;

CREATE OR REPLACE FUNCTION public.set_package_order_promo(_order_id uuid, _url text, _path text, _type text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.package_orders
    SET promo_media_url = _url, promo_media_path = _path, promo_media_type = _type, updated_at = now()
    WHERE id = _order_id AND advertiser_id = auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;
  RETURN jsonb_build_object('success', true);
END; $$;

-- 3. Auto-complete package orders when every selected milestone hits target units
CREATE OR REPLACE FUNCTION public.maybe_complete_package_order(_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _order record;
  _pending integer;
BEGIN
  SELECT * INTO _order FROM public.package_orders WHERE id = _order_id;
  IF NOT FOUND OR _order.status <> 'active' THEN RETURN; END IF;
  IF _order.selected_milestone_ids IS NULL OR array_length(_order.selected_milestone_ids, 1) IS NULL THEN RETURN; END IF;

  SELECT count(*) INTO _pending
  FROM unnest(_order.selected_milestone_ids) AS mid
  WHERE COALESCE((
    SELECT sum(d.users_delivered) FROM public.package_order_deliveries d
    WHERE d.order_id = _order_id AND d.milestone_id = mid
  ), 0) < _order.units;

  IF _pending = 0 THEN
    UPDATE public.package_orders SET status = 'completed', updated_at = now() WHERE id = _order_id;
  END IF;
END; $$;

CREATE OR REPLACE FUNCTION public.trg_package_delivery_complete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.maybe_complete_package_order(NEW.order_id);
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS package_delivery_autocomplete ON public.package_order_deliveries;
CREATE TRIGGER package_delivery_autocomplete
AFTER INSERT OR UPDATE ON public.package_order_deliveries
FOR EACH ROW EXECUTE FUNCTION public.trg_package_delivery_complete();

-- 4. Auto-complete switch offer orders
CREATE OR REPLACE FUNCTION public.trg_switch_order_complete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'active' AND NEW.users_delivered >= NEW.batch_size THEN
    NEW.status := 'completed';
    NEW.completed_at := COALESCE(NEW.completed_at, now());
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS switch_order_autocomplete ON public.switch_offer_orders;
CREATE TRIGGER switch_order_autocomplete
BEFORE INSERT OR UPDATE ON public.switch_offer_orders
FOR EACH ROW EXECUTE FUNCTION public.trg_switch_order_complete();

-- 5. Auto-complete regular campaigns when every selected milestone hits target users
CREATE OR REPLACE FUNCTION public.maybe_complete_campaign(_campaign_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _c record;
  _target integer;
  _slug text;
  _delivered numeric;
  _done boolean := true;
BEGIN
  SELECT * INTO _c FROM public.campaigns WHERE id = _campaign_id;
  IF NOT FOUND OR _c.status <> 'active' THEN RETURN; END IF;
  _target := COALESCE(_c.target_users, 0);
  IF _target <= 0 THEN RETURN; END IF;

  IF _c.ad_type = 'engagement' OR _c.integration_type = 'engagement' THEN
    SELECT COALESCE((SELECT count(*) FROM public.offerwall_interactions WHERE campaign_id = _campaign_id), 0)
         + COALESCE((SELECT sum(count) FROM public.manual_events
                     WHERE campaign_id = _campaign_id
                       AND event_type IN ('interaction','engagement_interaction')), 0)
      INTO _delivered;
    _done := _delivered >= _target;
  ELSE
    IF _c.selected_milestones IS NULL OR array_length(_c.selected_milestones, 1) IS NULL THEN RETURN; END IF;
    FOREACH _slug IN ARRAY _c.selected_milestones LOOP
      IF _slug NOT IN ('download','signup','purchase') THEN CONTINUE; END IF;
      SELECT COALESCE((SELECT count(*) FROM public.events
                       WHERE campaign_id = _campaign_id AND event_type::text = _slug), 0)
           + COALESCE((SELECT sum(count) FROM public.manual_events
                       WHERE campaign_id = _campaign_id AND event_type = _slug), 0)
        INTO _delivered;
      IF _delivered < _target THEN _done := false; END IF;
    END LOOP;
  END IF;

  IF _done THEN
    UPDATE public.campaigns
      SET status = 'completed'::campaign_status, completed_at = now()
      WHERE id = _campaign_id;
  END IF;
END; $$;

CREATE OR REPLACE FUNCTION public.trg_campaign_progress_complete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.maybe_complete_campaign(NEW.campaign_id);
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS events_campaign_autocomplete ON public.events;
CREATE TRIGGER events_campaign_autocomplete
AFTER INSERT ON public.events
FOR EACH ROW EXECUTE FUNCTION public.trg_campaign_progress_complete();

DROP TRIGGER IF EXISTS manual_events_campaign_autocomplete ON public.manual_events;
CREATE TRIGGER manual_events_campaign_autocomplete
AFTER INSERT OR UPDATE ON public.manual_events
FOR EACH ROW EXECUTE FUNCTION public.trg_campaign_progress_complete();

DROP TRIGGER IF EXISTS offerwall_campaign_autocomplete ON public.offerwall_interactions;
CREATE TRIGGER offerwall_campaign_autocomplete
AFTER INSERT ON public.offerwall_interactions
FOR EACH ROW EXECUTE FUNCTION public.trg_campaign_progress_complete();