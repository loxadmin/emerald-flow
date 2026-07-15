GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaigns TO authenticated;
GRANT ALL ON public.campaigns TO service_role;

GRANT SELECT, INSERT, UPDATE ON public.creative_campaigns TO authenticated;
GRANT ALL ON public.creative_campaigns TO service_role;

GRANT SELECT ON public.wallets TO authenticated;
GRANT ALL ON public.wallets TO service_role;

GRANT SELECT ON public.wallet_transactions TO authenticated;
GRANT ALL ON public.wallet_transactions TO service_role;

GRANT SELECT, INSERT, UPDATE ON public.package_orders TO authenticated;
GRANT ALL ON public.package_orders TO service_role;

GRANT SELECT ON public.ad_packages TO authenticated;
GRANT ALL ON public.ad_packages TO service_role;

GRANT SELECT ON public.package_milestones TO authenticated;
GRANT ALL ON public.package_milestones TO service_role;

GRANT SELECT ON public.milestones TO authenticated;
GRANT ALL ON public.milestones TO service_role;

GRANT SELECT ON public.advertiser_websites TO authenticated;
GRANT ALL ON public.advertiser_websites TO service_role;

GRANT SELECT ON public.advertiser_categories TO authenticated;
GRANT ALL ON public.advertiser_categories TO service_role;