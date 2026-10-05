CREATE TABLE public.roast_boost_pricing (
  subtype text PRIMARY KEY,
  price_per_1000 numeric(14,4) NOT NULL DEFAULT 30 CHECK (price_per_1000 >= 0),
  daily_fee_per_user numeric(14,6) NOT NULL DEFAULT 0.00002 CHECK (daily_fee_per_user >= 0),
  platforms text[] NOT NULL DEFAULT ARRAY['instagram','tiktok','x','facebook'],
  min_followers int NOT NULL DEFAULT 100,
  min_days int NOT NULL DEFAULT 3,
  is_active boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.roast_boost_pricing TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.roast_boost_pricing TO authenticated;
GRANT ALL ON public.roast_boost_pricing TO service_role;
ALTER TABLE public.roast_boost_pricing ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rb pricing readable" ON public.roast_boost_pricing FOR SELECT USING (true);
CREATE POLICY "rb pricing admin" ON public.roast_boost_pricing FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

INSERT INTO public.roast_boost_pricing(subtype, platforms) VALUES
 ('musician', ARRAY['instagram','tiktok','x','facebook','youtube','spotify','audiomack']),
 ('youtuber', ARRAY['youtube','instagram','tiktok','x','facebook']),
 ('social_media_creator', ARRAY['instagram','tiktok','x','facebook','youtube']),
 ('app', ARRAY['instagram','tiktok','x','facebook','youtube']),
 ('website', ARRAY['instagram','tiktok','x','facebook','youtube']),
 ('fintech', ARRAY['instagram','tiktok','x','facebook','youtube']),
 ('ecommerce', ARRAY['instagram','tiktok','x','facebook']),
 ('online_vendor', ARRAY['instagram','tiktok','x','facebook']),
 ('realtor', ARRAY['instagram','tiktok','x','facebook','youtube']),
 ('food_beverage', ARRAY['instagram','tiktok','x','facebook']),
 ('household_items', ARRAY['instagram','tiktok','x','facebook']),
 ('telecom', ARRAY['instagram','tiktok','x','facebook','youtube']),
 ('oil_gas', ARRAY['instagram','x','facebook','youtube']);

CREATE TABLE public.roast_boost_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_id uuid NOT NULL,
  subtype text NOT NULL,
  platform text NOT NULL,
  page_url text NOT NULL,
  followers int NOT NULL CHECK (followers > 0),
  days int NOT NULL CHECK (days >= 1),
  price_per_1000 numeric(14,4) NOT NULL,
  daily_fee_per_user numeric(14,6) NOT NULL,
  follower_cost numeric(14,2) NOT NULL,
  daily_cost numeric(14,2) NOT NULL,
  total_cost numeric(14,2) NOT NULL CHECK (total_cost >= 0),
  escrow_balance numeric(14,2) NOT NULL CHECK (escrow_balance >= 0),
  offer_media_url text, offer_media_path text, offer_media_type text, offer_text text,
  status text NOT NULL DEFAULT 'pending_approval' CHECK (status IN ('pending_approval','active','rejected','completed')),
  admin_notes text,
  followers_delivered int NOT NULL DEFAULT 0,
  starts_at timestamptz, ends_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.roast_boost_orders TO authenticated;
GRANT ALL ON public.roast_boost_orders TO service_role;
ALTER TABLE public.roast_boost_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rb orders own or admin" ON public.roast_boost_orders FOR SELECT TO authenticated
  USING (advertiser_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER rb_orders_updated BEFORE UPDATE ON public.roast_boost_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.roast_boost_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.roast_boost_orders(id) ON DELETE CASCADE,
  post_url text NOT NULL,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','sent')),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.roast_boost_posts TO authenticated;
GRANT ALL ON public.roast_boost_posts TO service_role;
ALTER TABLE public.roast_boost_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rb posts read" ON public.roast_boost_posts FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR EXISTS (SELECT 1 FROM public.roast_boost_orders o WHERE o.id = order_id AND o.advertiser_id = auth.uid()));

CREATE TABLE public.roast_boost_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.roast_boost_orders(id) ON DELETE CASCADE,
  post_id uuid REFERENCES public.roast_boost_posts(id) ON DELETE SET NULL,
  new_followers int NOT NULL DEFAULT 0 CHECK (new_followers >= 0),
  likes int NOT NULL DEFAULT 0 CHECK (likes >= 0),
  shares int NOT NULL DEFAULT 0 CHECK (shares >= 0),
  reposts int NOT NULL DEFAULT 0 CHECK (reposts >= 0),
  comments_count int NOT NULL DEFAULT 0 CHECK (comments_count >= 0),
  comments text,
  amount_released numeric(14,2) NOT NULL DEFAULT 0 CHECK (amount_released >= 0),
  note text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.roast_boost_deliveries TO authenticated;
GRANT ALL ON public.roast_boost_deliveries TO service_role;
ALTER TABLE public.roast_boost_deliveries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rb deliveries read" ON public.roast_boost_deliveries FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR EXISTS (SELECT 1 FROM public.roast_boost_orders o WHERE o.id = order_id AND o.advertiser_id = auth.uid()));

CREATE OR REPLACE FUNCTION public.purchase_roast_boost(_platform text, _page_url text, _followers int, _days int, _offer jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _user uuid := auth.uid(); _sub text; _p record; _w record;
  _fc numeric; _dc numeric; _total numeric; _id uuid;
BEGIN
  IF _user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT advertiser_subtype::text INTO _sub FROM public.advertiser_categories
    WHERE advertiser_id = _user AND advertiser_subtype IS NOT NULL ORDER BY created_at DESC LIMIT 1;
  IF _sub IS NULL THEN RAISE EXCEPTION 'Choose your advertiser category first'; END IF;
  SELECT * INTO _p FROM public.roast_boost_pricing WHERE subtype = _sub AND is_active;
  IF NOT FOUND THEN RAISE EXCEPTION 'Roast and Boost is not available for your category yet'; END IF;
  IF NOT (_platform = ANY(_p.platforms)) THEN RAISE EXCEPTION 'This platform is not available for your category'; END IF;
  IF _page_url IS NULL OR _page_url !~* '^https?://' OR length(_page_url) > 500 THEN RAISE EXCEPTION 'Enter a valid page link'; END IF;
  IF _followers IS NULL OR _followers < _p.min_followers OR _followers > 1000000 THEN RAISE EXCEPTION 'Followers must be at least %', _p.min_followers; END IF;
  IF _days IS NULL OR _days < GREATEST(_p.min_days,3) OR _days > 365 THEN RAISE EXCEPTION 'Duration must be at least % days', GREATEST(_p.min_days,3); END IF;
  IF COALESCE(_offer->>'url','') = '' AND COALESCE(trim(_offer->>'text'),'') = '' THEN RAISE EXCEPTION 'Upload an offer image or video, or write a text offer'; END IF;
  IF length(COALESCE(_offer->>'text','')) > 500 THEN RAISE EXCEPTION 'Text offer is too long'; END IF;

  _fc := round(_followers::numeric / 1000 * _p.price_per_1000, 2);
  _dc := round(_followers::numeric * _days * _p.daily_fee_per_user, 2);
  _total := _fc + _dc;

  SELECT id, balance INTO _w FROM public.wallets WHERE advertiser_id = _user FOR UPDATE;
  IF NOT FOUND OR _w.balance < _total THEN RAISE EXCEPTION 'Insufficient wallet balance'; END IF;
  UPDATE public.wallets SET balance = balance - _total, updated_at = now() WHERE id = _w.id;
  INSERT INTO public.wallet_transactions(wallet_id, amount, type, status, description)
    VALUES (_w.id, _total, 'package_escrow', 'completed', 'Escrow: Roast and Boost (' || _platform || ')');
  INSERT INTO public.roast_boost_orders(advertiser_id, subtype, platform, page_url, followers, days, price_per_1000, daily_fee_per_user,
    follower_cost, daily_cost, total_cost, escrow_balance, offer_media_url, offer_media_path, offer_media_type, offer_text)
  VALUES (_user, _sub, _platform, _page_url, _followers, _days, _p.price_per_1000, _p.daily_fee_per_user,
    _fc, _dc, _total, _total, NULLIF(_offer->>'url',''), NULLIF(_offer->>'path',''), NULLIF(_offer->>'type',''), NULLIF(trim(_offer->>'text'),''))
  RETURNING id INTO _id;
  RETURN jsonb_build_object('success', true, 'order_id', _id, 'total', _total);
END $$;

CREATE OR REPLACE FUNCTION public.review_roast_boost(_order_id uuid, _approve boolean, _notes text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _o record; _w uuid;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Not authorized'; END IF;
  SELECT * INTO _o FROM public.roast_boost_orders WHERE id = _order_id FOR UPDATE;
  IF NOT FOUND OR _o.status <> 'pending_approval' THEN RAISE EXCEPTION 'Order is not awaiting approval'; END IF;
  IF _approve THEN
    UPDATE public.roast_boost_orders SET status='active', admin_notes=_notes, starts_at=now(), ends_at=now() + make_interval(days => _o.days) WHERE id=_order_id;
  ELSE
    SELECT id INTO _w FROM public.wallets WHERE advertiser_id = _o.advertiser_id FOR UPDATE;
    IF _o.escrow_balance > 0 THEN
      UPDATE public.wallets SET balance = balance + _o.escrow_balance, updated_at=now() WHERE id=_w;
      INSERT INTO public.wallet_transactions(wallet_id, amount, type, status, description)
        VALUES (_w, _o.escrow_balance, 'refund', 'completed', 'Refund: Roast and Boost rejected');
    END IF;
    UPDATE public.roast_boost_orders SET status='rejected', admin_notes=_notes, escrow_balance=0 WHERE id=_order_id;
  END IF;
  RETURN jsonb_build_object('success', true);
END $$;

CREATE OR REPLACE FUNCTION public.add_roast_boost_post(_order_id uuid, _post_url text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _id uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.roast_boost_orders WHERE id=_order_id AND advertiser_id=auth.uid() AND status IN ('pending_approval','active')) THEN
    RAISE EXCEPTION 'You can only add posts to your running Roast and Boost';
  END IF;
  IF _post_url IS NULL OR _post_url !~* '^https?://' OR length(_post_url) > 500 THEN RAISE EXCEPTION 'Enter a valid post link'; END IF;
  INSERT INTO public.roast_boost_posts(order_id, post_url) VALUES (_order_id, trim(_post_url)) RETURNING id INTO _id;
  RETURN _id;
END $$;

CREATE OR REPLACE FUNCTION public.mark_roast_boost_post_sent(_post_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Not authorized'; END IF;
  UPDATE public.roast_boost_posts SET status='sent' WHERE id=_post_id;
END $$;

CREATE OR REPLACE FUNCTION public.record_roast_boost_delivery(_order_id uuid, _post_id uuid, _new_followers int, _likes int, _shares int, _reposts int, _comments_count int, _comments text, _amount numeric, _note text, _complete boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _o record;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Not authorized'; END IF;
  SELECT * INTO _o FROM public.roast_boost_orders WHERE id=_order_id FOR UPDATE;
  IF NOT FOUND OR _o.status <> 'active' THEN RAISE EXCEPTION 'Order is not active'; END IF;
  IF COALESCE(_amount,0) < 0 OR COALESCE(_amount,0) > _o.escrow_balance THEN RAISE EXCEPTION 'Amount exceeds remaining escrow'; END IF;
  IF length(COALESCE(_comments,'')) > 20000 THEN RAISE EXCEPTION 'Comments too long'; END IF;
  INSERT INTO public.roast_boost_deliveries(order_id, post_id, new_followers, likes, shares, reposts, comments_count, comments, amount_released, note, created_by)
  VALUES (_order_id, _post_id, GREATEST(COALESCE(_new_followers,0),0), GREATEST(COALESCE(_likes,0),0), GREATEST(COALESCE(_shares,0),0),
    GREATEST(COALESCE(_reposts,0),0), GREATEST(COALESCE(_comments_count,0),0), NULLIF(trim(_comments),''), COALESCE(_amount,0), _note, auth.uid());
  UPDATE public.roast_boost_orders SET
    followers_delivered = followers_delivered + GREATEST(COALESCE(_new_followers,0),0),
    escrow_balance = escrow_balance - COALESCE(_amount,0),
    status = CASE WHEN _complete THEN 'completed' ELSE status END
  WHERE id=_order_id;
  RETURN jsonb_build_object('success', true);
END $$;

REVOKE ALL ON FUNCTION public.purchase_roast_boost(text,text,int,int,jsonb), public.review_roast_boost(uuid,boolean,text), public.add_roast_boost_post(uuid,text), public.mark_roast_boost_post_sent(uuid), public.record_roast_boost_delivery(uuid,uuid,int,int,int,int,int,text,numeric,text,boolean) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.purchase_roast_boost(text,text,int,int,jsonb), public.review_roast_boost(uuid,boolean,text), public.add_roast_boost_post(uuid,text), public.mark_roast_boost_post_sent(uuid), public.record_roast_boost_delivery(uuid,uuid,int,int,int,int,int,text,numeric,text,boolean) TO authenticated;