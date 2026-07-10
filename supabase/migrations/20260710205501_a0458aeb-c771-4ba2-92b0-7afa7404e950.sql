GRANT SELECT, INSERT, UPDATE ON public.business_verifications TO authenticated;
GRANT ALL ON public.business_verifications TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.offline_offers TO authenticated;
GRANT ALL ON public.offline_offers TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.offline_orders TO authenticated;
GRANT ALL ON public.offline_orders TO service_role;

CREATE OR REPLACE FUNCTION public.accept_offline_order(_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _order record;
  _wallet record;
  _min_balance numeric := 300;
BEGIN
  SELECT * INTO _order FROM public.offline_orders WHERE id=_order_id;
  IF NOT FOUND OR _order.advertiser_id <> _user_id THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF _order.status <> 'pending_acceptance' THEN RAISE EXCEPTION 'Order is not pending'; END IF;
  IF now() > _order.accept_deadline THEN
    UPDATE public.offline_orders SET status='expired', updated_at=now() WHERE id=_order_id;
    RAISE EXCEPTION 'Order has expired';
  END IF;

  SELECT COALESCE(value::numeric, 300) INTO _min_balance
  FROM public.admin_settings
  WHERE key='offline_min_wallet_balance';

  SELECT id, balance INTO _wallet FROM public.wallets WHERE advertiser_id=_user_id;
  IF NOT FOUND OR _wallet.balance < _min_balance THEN
    RAISE EXCEPTION 'Minimum wallet balance of $% required to accept offline orders', _min_balance;
  END IF;
  IF _wallet.balance < _order.commission_amount THEN
    RAISE EXCEPTION 'Insufficient wallet balance to cover commission';
  END IF;

  UPDATE public.wallets SET balance = balance - _order.commission_amount, updated_at=now() WHERE id=_wallet.id;
  INSERT INTO public.wallet_transactions(wallet_id, amount, type, status, description)
  VALUES (_wallet.id, _order.commission_amount,'offline_commission','completed','Commission for offline order');
  UPDATE public.offline_orders
    SET status='accepted', accepted_at=now(),
        fulfill_deadline = now() + interval '12 hours', updated_at=now()
    WHERE id=_order_id;
  RETURN jsonb_build_object('success', true);
END;
$$;