ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS offer_text text;
ALTER TABLE public.package_orders ADD COLUMN IF NOT EXISTS offer_text text;
ALTER TABLE public.switch_offer_orders
  ADD COLUMN IF NOT EXISTS offer_text text,
  ADD COLUMN IF NOT EXISTS promo_media_url text,
  ADD COLUMN IF NOT EXISTS promo_media_path text,
  ADD COLUMN IF NOT EXISTS promo_media_type text;

CREATE OR REPLACE FUNCTION public.set_order_offer(_kind text, _order_id uuid, _url text, _path text, _type text, _text text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _t text := nullif(btrim(coalesce(_text,'')), '');
BEGIN
  IF _url IS NULL AND _t IS NULL THEN RAISE EXCEPTION 'Add an offer image/video or write a text offer'; END IF;
  IF _t IS NOT NULL AND length(_t) > 500 THEN RAISE EXCEPTION 'Offer text is too long (max 500 characters)'; END IF;
  IF _kind = 'package' THEN
    UPDATE public.package_orders SET promo_media_url=_url, promo_media_path=_path, promo_media_type=_type, offer_text=_t, updated_at=now()
      WHERE id=_order_id AND advertiser_id=auth.uid();
  ELSIF _kind = 'switch' THEN
    UPDATE public.switch_offer_orders SET promo_media_url=_url, promo_media_path=_path, promo_media_type=_type, offer_text=_t
      WHERE id=_order_id AND advertiser_id=auth.uid();
  ELSE RAISE EXCEPTION 'Invalid order kind'; END IF;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;
  RETURN jsonb_build_object('success', true);
END; $$;
REVOKE ALL ON FUNCTION public.set_order_offer(text,uuid,text,text,text,text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.set_order_offer(text,uuid,text,text,text,text) TO authenticated;