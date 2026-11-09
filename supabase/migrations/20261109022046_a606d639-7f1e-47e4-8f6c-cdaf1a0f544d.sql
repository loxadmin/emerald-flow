CREATE TABLE public.campaign_verification_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_id uuid NOT NULL UNIQUE,
  source text NOT NULL,
  campaign_id uuid REFERENCES public.campaigns(id) ON DELETE SET NULL,
  package_order_id uuid REFERENCES public.package_orders(id) ON DELETE SET NULL,
  switch_order_id uuid REFERENCES public.switch_offer_orders(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'awaiting_documents',
  requested_documents text,
  admin_notes text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT campaign_verification_cases_status_check CHECK (status IN ('awaiting_documents','pending_review','more_info_requested','approved')),
  CONSTRAINT campaign_verification_cases_source_check CHECK (source IN ('campaign','package','switch'))
);
GRANT SELECT, UPDATE ON public.campaign_verification_cases TO authenticated;
GRANT ALL ON public.campaign_verification_cases TO service_role;
ALTER TABLE public.campaign_verification_cases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Advertisers can view own campaign verification case" ON public.campaign_verification_cases
  FOR SELECT TO authenticated USING (auth.uid() = advertiser_id);
CREATE POLICY "Admins manage campaign verification cases" ON public.campaign_verification_cases
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE TABLE public.campaign_verification_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.campaign_verification_cases(id) ON DELETE CASCADE,
  document_type text NOT NULL,
  file_name text NOT NULL,
  storage_path text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.campaign_verification_documents TO authenticated;
GRANT ALL ON public.campaign_verification_documents TO service_role;
ALTER TABLE public.campaign_verification_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Advertisers can view own campaign verification documents" ON public.campaign_verification_documents
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.campaign_verification_cases c WHERE c.id = case_id AND c.advertiser_id = auth.uid())
  );
CREATE POLICY "Advertisers can upload own campaign verification documents" ON public.campaign_verification_documents
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.campaign_verification_cases c
      WHERE c.id = case_id AND c.advertiser_id = auth.uid()
        AND c.status IN ('awaiting_documents','more_info_requested')
    )
  );
CREATE POLICY "Admins can view campaign verification documents" ON public.campaign_verification_documents
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE INDEX campaign_verification_documents_case_id_idx ON public.campaign_verification_documents(case_id);
CREATE INDEX campaign_verification_cases_status_idx ON public.campaign_verification_cases(status);

CREATE OR REPLACE FUNCTION public.ensure_campaign_verification_case(
  _source text,
  _campaign_id uuid DEFAULT NULL,
  _package_order_id uuid DEFAULT NULL,
  _switch_order_id uuid DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $function$
DECLARE
  _user_id uuid := auth.uid();
  _owner uuid;
  _eligible boolean := false;
  _existing public.campaign_verification_cases%ROWTYPE;
  _case public.campaign_verification_cases%ROWTYPE;
BEGIN
  IF _user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _source = 'campaign' THEN
    IF _campaign_id IS NULL OR _package_order_id IS NOT NULL OR _switch_order_id IS NOT NULL THEN RAISE EXCEPTION 'Invalid campaign reference'; END IF;
    SELECT advertiser_id INTO _owner FROM public.campaigns
      WHERE id = _campaign_id AND is_draft = false AND status = 'pending'
        AND budget_remaining > 0 AND total_cost > 0
        AND platform_type IN ('website','mobile_app')
        AND COALESCE(integration_type, '') <> 'external_referral'
        AND COALESCE(ad_type::text, '') <> 'engagement';
    _eligible := FOUND;
  ELSIF _source = 'package' THEN
    IF _package_order_id IS NULL OR _campaign_id IS NOT NULL OR _switch_order_id IS NOT NULL THEN RAISE EXCEPTION 'Invalid package reference'; END IF;
    SELECT advertiser_id INTO _owner FROM public.package_orders
      WHERE id = _package_order_id AND status IN ('pending_review','active')
        AND total_amount_usd > 0 AND platform IN ('mobile','web');
    _eligible := FOUND;
  ELSIF _source = 'switch' THEN
    IF _switch_order_id IS NULL OR _campaign_id IS NOT NULL OR _package_order_id IS NOT NULL THEN RAISE EXCEPTION 'Invalid switch-offer reference'; END IF;
    SELECT advertiser_id INTO _owner FROM public.switch_offer_orders
      WHERE id = _switch_order_id AND status = 'active' AND flat_price_usd > 0;
    IF FOUND THEN
      SELECT EXISTS (
        SELECT 1 FROM public.advertiser_categories
        WHERE advertiser_id = _owner AND advertiser_subtype IN ('app','website')
      ) INTO _eligible;
    END IF;
  ELSE
    RAISE EXCEPTION 'Invalid campaign source';
  END IF;

  IF NOT _eligible OR _owner IS DISTINCT FROM _user_id THEN
    RETURN jsonb_build_object('eligible', false);
  END IF;

  -- A submitted legacy business document already satisfies the request to submit documents.
  IF EXISTS (SELECT 1 FROM public.business_verifications WHERE advertiser_id = _user_id) THEN
    RETURN jsonb_build_object('eligible', false, 'already_submitted', true);
  END IF;

  SELECT * INTO _existing FROM public.campaign_verification_cases WHERE advertiser_id = _user_id;
  IF FOUND THEN
    IF _existing.status = 'approved' THEN RETURN jsonb_build_object('eligible', false, 'status', 'approved'); END IF;
    RETURN jsonb_build_object('eligible', true, 'case_id', _existing.id, 'status', _existing.status);
  END IF;

  INSERT INTO public.campaign_verification_cases(advertiser_id, source, campaign_id, package_order_id, switch_order_id)
  VALUES (_user_id, _source, _campaign_id, _package_order_id, _switch_order_id)
  ON CONFLICT (advertiser_id) DO NOTHING;
  SELECT * INTO _case FROM public.campaign_verification_cases WHERE advertiser_id = _user_id;
  IF NOT FOUND OR _case.status = 'approved' THEN RETURN jsonb_build_object('eligible', false); END IF;
  RETURN jsonb_build_object('eligible', true, 'case_id', _case.id, 'status', _case.status);
END;
$function$;
REVOKE ALL ON FUNCTION public.ensure_campaign_verification_case(text, uuid, uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ensure_campaign_verification_case(text, uuid, uuid, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.set_campaign_verification_pending_review()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $function$
BEGIN
  UPDATE public.campaign_verification_cases
  SET status = 'pending_review', updated_at = now()
  WHERE id = NEW.case_id AND status IN ('awaiting_documents','more_info_requested');
  RETURN NEW;
END;
$function$;
REVOKE ALL ON FUNCTION public.set_campaign_verification_pending_review() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER campaign_verification_document_submitted
  AFTER INSERT ON public.campaign_verification_documents
  FOR EACH ROW EXECUTE FUNCTION public.set_campaign_verification_pending_review();

CREATE POLICY "Advertisers upload own campaign verification files" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'business-documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
    AND EXISTS (
      SELECT 1 FROM public.campaign_verification_cases c
      WHERE c.id::text = (storage.foldername(name))[2]
        AND c.advertiser_id = auth.uid()
        AND c.status IN ('awaiting_documents','more_info_requested')
    )
  );
CREATE POLICY "Advertisers read own campaign verification files" ON storage.objects
  FOR SELECT TO authenticated USING (
    bucket_id = 'business-documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
    AND EXISTS (
      SELECT 1 FROM public.campaign_verification_cases c
      WHERE c.id::text = (storage.foldername(name))[2] AND c.advertiser_id = auth.uid()
    )
  );
CREATE POLICY "Admins read campaign verification files" ON storage.objects
  FOR SELECT TO authenticated USING (
    bucket_id = 'business-documents' AND public.has_role(auth.uid(), 'admin'::public.app_role)
  );