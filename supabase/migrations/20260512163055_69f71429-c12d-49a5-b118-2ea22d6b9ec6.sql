
-- Enum extensions
ALTER TYPE public.advertiser_type ADD VALUE IF NOT EXISTS 'offline';
ALTER TYPE public.advertiser_subtype ADD VALUE IF NOT EXISTS 'oil_gas';
ALTER TYPE public.advertiser_subtype ADD VALUE IF NOT EXISTS 'distributor';

-- Offline order status enum
DO $$ BEGIN
  CREATE TYPE public.offline_order_status AS ENUM (
    'pending_acceptance','accepted','fulfilled_by_advertiser','confirmed_by_admin','expired','rejected'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- MOQ unit enum
DO $$ BEGIN
  CREATE TYPE public.moq_unit AS ENUM ('liter','kg','piece');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- business_verifications
CREATE TABLE IF NOT EXISTS public.business_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_id uuid NOT NULL,
  document_url text NOT NULL,
  document_type text NOT NULL DEFAULT 'cac',
  status text NOT NULL DEFAULT 'pending',
  admin_notes text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.business_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view own verifications" ON public.business_verifications
  FOR SELECT USING (auth.uid() = advertiser_id);
CREATE POLICY "Owners can insert own verifications" ON public.business_verifications
  FOR INSERT WITH CHECK (auth.uid() = advertiser_id);
CREATE POLICY "Owners can update own verifications" ON public.business_verifications
  FOR UPDATE USING (auth.uid() = advertiser_id AND status = 'rejected');
CREATE POLICY "Admins manage verifications" ON public.business_verifications
  FOR ALL USING (has_role(auth.uid(),'admin'::app_role));

-- offline_offers
CREATE TABLE IF NOT EXISTS public.offline_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_id uuid NOT NULL,
  product_name text NOT NULL,
  description text,
  moq_value numeric NOT NULL,
  moq_unit public.moq_unit NOT NULL,
  state text NOT NULL,
  business_address text NOT NULL,
  business_phone text NOT NULL,
  business_email text NOT NULL,
  submission_fee numeric NOT NULL DEFAULT 100,
  status text NOT NULL DEFAULT 'pending',
  admin_notes text,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.offline_offers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners view own offers" ON public.offline_offers
  FOR SELECT USING (auth.uid() = advertiser_id);
CREATE POLICY "Owners insert own offers" ON public.offline_offers
  FOR INSERT WITH CHECK (auth.uid() = advertiser_id);
CREATE POLICY "Admins manage offers" ON public.offline_offers
  FOR ALL USING (has_role(auth.uid(),'admin'::app_role));

-- offline_orders
CREATE TABLE IF NOT EXISTS public.offline_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id uuid NOT NULL REFERENCES public.offline_offers(id) ON DELETE CASCADE,
  advertiser_id uuid NOT NULL,
  buyer_name text NOT NULL,
  buyer_phone text,
  buyer_email text,
  quantity numeric NOT NULL,
  unit_price numeric NOT NULL,
  total_amount numeric NOT NULL,
  commission_rate numeric NOT NULL DEFAULT 0.005,
  commission_amount numeric NOT NULL DEFAULT 0,
  status public.offline_order_status NOT NULL DEFAULT 'pending_acceptance',
  accept_deadline timestamptz NOT NULL DEFAULT (now() + interval '12 hours'),
  fulfill_deadline timestamptz,
  accepted_at timestamptz,
  fulfilled_at timestamptz,
  confirmed_at timestamptz,
  admin_notes text,
  notification_sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.offline_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners view own orders" ON public.offline_orders
  FOR SELECT USING (auth.uid() = advertiser_id);
CREATE POLICY "Admins manage orders" ON public.offline_orders
  FOR ALL USING (has_role(auth.uid(),'admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_offline_orders_advertiser ON public.offline_orders(advertiser_id);
CREATE INDEX IF NOT EXISTS idx_offline_orders_status ON public.offline_orders(status);
CREATE INDEX IF NOT EXISTS idx_offline_offers_advertiser ON public.offline_offers(advertiser_id);

-- Storage bucket for business docs
INSERT INTO storage.buckets (id, name, public)
VALUES ('business-documents','business-documents', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Owners upload own business docs" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'business-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Owners read own business docs" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'business-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Owners update own business docs" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'business-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Admins read all business docs" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'business-documents' AND has_role(auth.uid(),'admin'::app_role));

-- Server-side state transition functions
CREATE OR REPLACE FUNCTION public.submit_offline_offer(_offer_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _offer record;
  _wallet record;
  _fee numeric;
BEGIN
  SELECT id, advertiser_id, status, submission_fee INTO _offer
  FROM offline_offers WHERE id = _offer_id;
  IF NOT FOUND OR _offer.advertiser_id <> _user_id THEN
    RAISE EXCEPTION 'Offer not found';
  END IF;
  _fee := _offer.submission_fee;
  SELECT id, balance INTO _wallet FROM wallets WHERE advertiser_id = _user_id;
  IF NOT FOUND OR _wallet.balance < _fee THEN
    RAISE EXCEPTION 'Insufficient wallet balance';
  END IF;
  UPDATE wallets SET balance = balance - _fee, updated_at = now() WHERE id = _wallet.id;
  INSERT INTO wallet_transactions(wallet_id, amount, type, status, description)
  VALUES (_wallet.id, _fee, 'offer_escrow','completed','Escrow for offline offer submission');
  RETURN jsonb_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.review_offline_offer(_offer_id uuid, _approve boolean, _notes text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _offer record;
  _wallet record;
BEGIN
  IF NOT has_role(auth.uid(),'admin'::app_role) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  SELECT * INTO _offer FROM offline_offers WHERE id = _offer_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Offer not found'; END IF;
  IF _approve THEN
    UPDATE offline_offers SET status='approved', admin_notes=_notes, reviewed_at=now(), updated_at=now() WHERE id=_offer_id;
  ELSE
    SELECT id INTO _wallet FROM wallets WHERE advertiser_id = _offer.advertiser_id;
    IF FOUND THEN
      UPDATE wallets SET balance = balance + _offer.submission_fee, updated_at=now() WHERE id=_wallet.id;
      INSERT INTO wallet_transactions(wallet_id, amount, type, status, description)
      VALUES (_wallet.id, _offer.submission_fee,'refund','completed','Refund: rejected offline offer');
    END IF;
    UPDATE offline_offers SET status='rejected', admin_notes=_notes, reviewed_at=now(), updated_at=now() WHERE id=_offer_id;
  END IF;
  RETURN jsonb_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.accept_offline_order(_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _order record;
  _wallet record;
BEGIN
  SELECT * INTO _order FROM offline_orders WHERE id=_order_id;
  IF NOT FOUND OR _order.advertiser_id <> _user_id THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF _order.status <> 'pending_acceptance' THEN RAISE EXCEPTION 'Order is not pending'; END IF;
  IF now() > _order.accept_deadline THEN
    UPDATE offline_orders SET status='expired', updated_at=now() WHERE id=_order_id;
    RAISE EXCEPTION 'Order has expired';
  END IF;
  SELECT id, balance INTO _wallet FROM wallets WHERE advertiser_id=_user_id;
  IF NOT FOUND OR _wallet.balance < _order.commission_amount THEN
    RAISE EXCEPTION 'Insufficient wallet balance to cover commission';
  END IF;
  UPDATE wallets SET balance = balance - _order.commission_amount, updated_at=now() WHERE id=_wallet.id;
  INSERT INTO wallet_transactions(wallet_id, amount, type, status, description)
  VALUES (_wallet.id, _order.commission_amount,'offline_commission','completed','Commission for offline order');
  UPDATE offline_orders
    SET status='accepted', accepted_at=now(),
        fulfill_deadline = now() + interval '12 hours', updated_at=now()
    WHERE id=_order_id;
  RETURN jsonb_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.fulfill_offline_order(_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _order record;
BEGIN
  SELECT * INTO _order FROM offline_orders WHERE id=_order_id;
  IF NOT FOUND OR _order.advertiser_id <> _user_id THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF _order.status <> 'accepted' THEN RAISE EXCEPTION 'Order is not accepted'; END IF;
  UPDATE offline_orders SET status='fulfilled_by_advertiser', fulfilled_at=now(), updated_at=now() WHERE id=_order_id;
  RETURN jsonb_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.confirm_offline_order(_order_id uuid, _notes text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT has_role(auth.uid(),'admin'::app_role) THEN RAISE EXCEPTION 'Not authorized'; END IF;
  UPDATE offline_orders SET status='confirmed_by_admin', confirmed_at=now(), admin_notes=_notes, updated_at=now()
  WHERE id=_order_id AND status='fulfilled_by_advertiser';
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not in fulfilled state'; END IF;
  RETURN jsonb_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.expire_stale_offline_orders()
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _count integer;
BEGIN
  WITH updated AS (
    UPDATE offline_orders
      SET status='expired', updated_at=now()
      WHERE (status='pending_acceptance' AND now() > accept_deadline)
         OR (status='accepted' AND fulfill_deadline IS NOT NULL AND now() > fulfill_deadline)
      RETURNING 1
  ) SELECT count(*) INTO _count FROM updated;
  RETURN _count;
END;
$$;

-- Seed category and settings
INSERT INTO public.categories (name, description, is_active, is_partnership)
SELECT 'Offline Ads', 'Offline business sales (oil & gas, distributors)', true, false
WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE name = 'Offline Ads');

INSERT INTO public.admin_settings (key, value, description) VALUES
  ('category_activation_fee:offline','35','Wallet activation fee for offline category (USD)'),
  ('offline_offer_submission_fee','100','Fee to submit an offline offer (USD)'),
  ('offline_commission_rate','0.005','Commission rate per offline sale'),
  ('offline_min_wallet_balance','300','Minimum wallet balance to accept offline orders (USD)')
ON CONFLICT (key) DO NOTHING;
