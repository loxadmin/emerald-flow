REVOKE EXECUTE ON FUNCTION public.wallet_consume_bonus() FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_campaign_escrow_spend() FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_package_order_escrow_spend() FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_roast_boost_escrow_spend() FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_switch_order_escrow_spend() FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.note_escrow_spend(uuid, numeric) FROM public, anon;
