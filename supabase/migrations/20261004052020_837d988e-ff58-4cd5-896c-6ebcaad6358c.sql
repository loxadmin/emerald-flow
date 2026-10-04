CREATE OR REPLACE FUNCTION public.purchase_package_v2_with_offer(_package_id uuid, _units integer, _duration_days integer, _selected_milestone_ids uuid[], _platform text, _links text[], _offer jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _r jsonb;
BEGIN
  _r := public.purchase_package_v2(_package_id,_units,_duration_days,_selected_milestone_ids,_platform,_links);
  PERFORM public.set_order_offer('package', (_r->>'order_id')::uuid, _offer->>'url', _offer->>'path', _offer->>'type', _offer->>'text');
  RETURN _r;
END; $$;

CREATE OR REPLACE FUNCTION public.purchase_swift_package_with_offer(_package_id uuid, _units integer, _duration_days integer, _action_ids uuid[], _custom jsonb, _platform text, _links text[], _offer jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _r jsonb;
BEGIN
  _r := public.purchase_swift_package(_package_id,_units,_duration_days,_action_ids,_custom,_platform,_links);
  PERFORM public.set_order_offer('package', (_r->>'order_id')::uuid, _offer->>'url', _offer->>'path', _offer->>'type', _offer->>'text');
  RETURN _r;
END; $$;

CREATE OR REPLACE FUNCTION public.purchase_swift_trial_with_offer(_package_id uuid, _variant text, _platform text, _links text[], _offer jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _r jsonb;
BEGIN
  _r := public.purchase_swift_trial(_package_id,_variant,_platform,_links);
  PERFORM public.set_order_offer('package', (_r->>'order_id')::uuid, _offer->>'url', _offer->>'path', _offer->>'type', _offer->>'text');
  RETURN _r;
END; $$;

CREATE OR REPLACE FUNCTION public.purchase_switch_offer_with_offer(_offer_id uuid, _target_link text, _offer jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _r jsonb;
BEGIN
  _r := public.purchase_switch_offer(_offer_id,_target_link);
  PERFORM public.set_order_offer('switch', (_r->>'order_id')::uuid, _offer->>'url', _offer->>'path', _offer->>'type', _offer->>'text');
  RETURN _r;
END; $$;

REVOKE ALL ON FUNCTION public.purchase_package_v2_with_offer(uuid,integer,integer,uuid[],text,text[],jsonb) FROM public, anon;
REVOKE ALL ON FUNCTION public.purchase_swift_package_with_offer(uuid,integer,integer,uuid[],jsonb,text,text[],jsonb) FROM public, anon;
REVOKE ALL ON FUNCTION public.purchase_swift_trial_with_offer(uuid,text,text,text[],jsonb) FROM public, anon;
REVOKE ALL ON FUNCTION public.purchase_switch_offer_with_offer(uuid,text,jsonb) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.purchase_package_v2_with_offer(uuid,integer,integer,uuid[],text,text[],jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.purchase_swift_package_with_offer(uuid,integer,integer,uuid[],jsonb,text,text[],jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.purchase_swift_trial_with_offer(uuid,text,text,text[],jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.purchase_switch_offer_with_offer(uuid,text,jsonb) TO authenticated;