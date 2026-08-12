-- 1. Storage: remove blanket authenticated read on private campaign-media bucket
DROP POLICY IF EXISTS "campaign_media_read_authenticated" ON storage.objects;

-- 2. campaign_questions: hide correct answers from the public
DROP POLICY IF EXISTS "Anyone can view questions for active campaigns" ON public.campaign_questions;
CREATE POLICY "Owners and admins view campaign questions"
ON public.campaign_questions FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (SELECT 1 FROM public.campaigns c WHERE c.id = campaign_questions.campaign_id AND c.advertiser_id = auth.uid())
);
REVOKE ALL ON public.campaign_questions FROM anon;

-- 3. ad_packages: drop the loose duplicate policy so category scoping actually applies
DROP POLICY IF EXISTS "Authenticated read active packages" ON public.ad_packages;

-- 4. Lock down internal / automation-only functions
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND (
        p.proname LIKE 'trg\_%' OR p.proname LIKE 'expire\_stale\_%'
        OR p.proname IN (
          'handle_new_user','auto_assign_admin','update_updated_at_column',
          'auto_activate_pending_campaigns','complete_expired_package_orders',
          'evaluate_affiliate_bonus_cycles','credit_affiliate_campaign',
          'qualify_affiliate_referral','finalize_package_order',
          'maybe_complete_campaign','maybe_complete_package_order',
          'charge_sale_commission','package_order_milestone_price',
          'karbali_normalize_subtype','karbali_subtype_to_group_slug','karbali_subtype_to_type'
        )
      )
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', r.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', r.sig);
  END LOOP;
END $$;

-- 5. All remaining SECURITY DEFINER RPCs: require a signed-in user
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef
      AND has_function_privilege('anon', p.oid, 'execute')
      AND p.proname NOT IN ('has_role','advertiser_can_use_package')
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon', r.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, service_role', r.sig);
  END LOOP;
END $$;

-- has_role / advertiser_can_use_package are used inside RLS policies: keep them callable
REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.advertiser_can_use_package(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.advertiser_can_use_package(uuid, uuid) TO authenticated, service_role;