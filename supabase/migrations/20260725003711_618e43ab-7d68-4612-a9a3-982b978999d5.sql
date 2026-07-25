
-- Enum for LOI status
CREATE TYPE public.loi_status AS ENUM (
  'pending_admin_approval',
  'approved',
  'rejected',
  'threshold_reached',
  'campaign_launched'
);

-- Sequence for agreement IDs
CREATE SEQUENCE IF NOT EXISTS public.loi_agreement_seq START 1000;

-- Company signature (singleton, admin-managed)
CREATE TABLE public.company_signature (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  signature_path text NOT NULL,
  company_name text NOT NULL,
  representative_name text NOT NULL,
  representative_position text NOT NULL,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.company_signature TO authenticated;
GRANT ALL ON public.company_signature TO service_role;
ALTER TABLE public.company_signature ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read company signature"
  ON public.company_signature FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage company signature"
  ON public.company_signature FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_company_signature_updated_at
  BEFORE UPDATE ON public.company_signature
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Letters of intent
CREATE TABLE public.letters_of_intent (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agreement_id text NOT NULL UNIQUE,

  -- Company info
  company_name text NOT NULL,
  website text NOT NULL,
  business_email text NOT NULL,
  contact_person text NOT NULL,
  job_title text NOT NULL,
  phone text NOT NULL,
  country text NOT NULL,

  -- Reservation
  products text[] NOT NULL DEFAULT '{}',
  customer_goal integer NOT NULL CHECK (customer_goal > 0),
  duration_days integer,
  custom_duration_text text,
  campaign_goal text NOT NULL,
  custom_goal_text text,
  notes text,

  -- Signatures
  advertiser_signature_path text NOT NULL,
  karbali_signature_path_snapshot text,
  karbali_rep_name_snapshot text,
  karbali_rep_position_snapshot text,
  karbali_company_name_snapshot text,

  -- Generated document
  pdf_path text,
  generated_at timestamptz,

  -- Progress
  status public.loi_status NOT NULL DEFAULT 'pending_admin_approval',
  current_progress integer NOT NULL DEFAULT 0,
  threshold_reached_at timestamptz,
  approved_at timestamptz,
  rejected_at timestamptz,
  campaign_launched_at timestamptz,
  admin_notes text,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_loi_advertiser ON public.letters_of_intent(advertiser_id);
CREATE INDEX idx_loi_status ON public.letters_of_intent(status);

GRANT SELECT, INSERT ON public.letters_of_intent TO authenticated;
GRANT ALL ON public.letters_of_intent TO service_role;
ALTER TABLE public.letters_of_intent ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Advertisers view their LOIs"
  ON public.letters_of_intent FOR SELECT TO authenticated
  USING (advertiser_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Advertisers create their own LOI"
  ON public.letters_of_intent FOR INSERT TO authenticated
  WITH CHECK (advertiser_id = auth.uid());
CREATE POLICY "Admins update LOIs"
  ON public.letters_of_intent FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_loi_updated_at
  BEFORE UPDATE ON public.letters_of_intent
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Migration opportunities (admin curated pool)
CREATE TABLE public.migration_opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  current_brand text NOT NULL,
  target_brand text NOT NULL,
  current_brand_logo_path text,
  target_brand_logo_path text,
  eligible_users integer NOT NULL DEFAULT 0,
  completion_rate numeric NOT NULL DEFAULT 0,
  estimated_duration_days integer NOT NULL DEFAULT 30,
  estimated_cost_usd numeric NOT NULL DEFAULT 0,
  category text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.migration_opportunities TO authenticated;
GRANT ALL ON public.migration_opportunities TO service_role;
ALTER TABLE public.migration_opportunities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read active migration opportunities"
  ON public.migration_opportunities FOR SELECT TO authenticated
  USING (is_active = true OR public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins manage migration opportunities"
  ON public.migration_opportunities FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_migration_opps_updated_at
  BEFORE UPDATE ON public.migration_opportunities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RPC: submit LOI
CREATE OR REPLACE FUNCTION public.submit_letter_of_intent(
  _company_name text,
  _website text,
  _business_email text,
  _contact_person text,
  _job_title text,
  _phone text,
  _country text,
  _products text[],
  _customer_goal integer,
  _duration_days integer,
  _custom_duration_text text,
  _campaign_goal text,
  _custom_goal_text text,
  _notes text,
  _signature_path text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user uuid := auth.uid();
  _sig record;
  _agreement text;
  _loi_id uuid;
BEGIN
  IF _user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _customer_goal IS NULL OR _customer_goal <= 0 THEN RAISE EXCEPTION 'Customer goal must be greater than zero'; END IF;
  IF _products IS NULL OR array_length(_products, 1) = 0 THEN RAISE EXCEPTION 'At least one product is required'; END IF;
  IF _signature_path IS NULL OR length(trim(_signature_path)) = 0 THEN RAISE EXCEPTION 'Signature is required'; END IF;

  SELECT signature_path, company_name, representative_name, representative_position
    INTO _sig FROM company_signature ORDER BY updated_at DESC LIMIT 1;

  _agreement := 'KRB-LOI-' || lpad(nextval('loi_agreement_seq')::text, 6, '0');

  INSERT INTO letters_of_intent(
    advertiser_id, agreement_id,
    company_name, website, business_email, contact_person, job_title, phone, country,
    products, customer_goal, duration_days, custom_duration_text,
    campaign_goal, custom_goal_text, notes,
    advertiser_signature_path,
    karbali_signature_path_snapshot, karbali_rep_name_snapshot,
    karbali_rep_position_snapshot, karbali_company_name_snapshot
  ) VALUES (
    _user, _agreement,
    _company_name, _website, _business_email, _contact_person, _job_title, _phone, _country,
    _products, _customer_goal, _duration_days, _custom_duration_text,
    _campaign_goal, _custom_goal_text, _notes,
    _signature_path,
    _sig.signature_path, _sig.representative_name,
    _sig.representative_position, _sig.company_name
  ) RETURNING id INTO _loi_id;

  RETURN jsonb_build_object('success', true, 'id', _loi_id, 'agreement_id', _agreement);
END;
$$;

-- RPC: approve LOI (admin)
CREATE OR REPLACE FUNCTION public.approve_letter_of_intent(_loi_id uuid, _pdf_path text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN RAISE EXCEPTION 'Not authorized'; END IF;
  UPDATE letters_of_intent
    SET status='approved', approved_at=now(), pdf_path=COALESCE(_pdf_path, pdf_path),
        generated_at = COALESCE(generated_at, now()), updated_at=now()
    WHERE id=_loi_id AND status='pending_admin_approval';
  IF NOT FOUND THEN RAISE EXCEPTION 'LOI not found or not pending'; END IF;
  RETURN jsonb_build_object('success', true);
END;
$$;

-- RPC: reject LOI (admin)
CREATE OR REPLACE FUNCTION public.reject_letter_of_intent(_loi_id uuid, _notes text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN RAISE EXCEPTION 'Not authorized'; END IF;
  UPDATE letters_of_intent
    SET status='rejected', rejected_at=now(), admin_notes=_notes, updated_at=now()
    WHERE id=_loi_id AND status='pending_admin_approval';
  IF NOT FOUND THEN RAISE EXCEPTION 'LOI not found or not pending'; END IF;
  RETURN jsonb_build_object('success', true);
END;
$$;

-- RPC: mark threshold reached (admin)
CREATE OR REPLACE FUNCTION public.mark_loi_threshold_reached(_loi_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN RAISE EXCEPTION 'Not authorized'; END IF;
  UPDATE letters_of_intent
    SET status='threshold_reached', threshold_reached_at=now(), updated_at=now()
    WHERE id=_loi_id AND status IN ('approved','pending_admin_approval');
  IF NOT FOUND THEN RAISE EXCEPTION 'LOI not found or not approved'; END IF;
  RETURN jsonb_build_object('success', true);
END;
$$;

-- RPC: update progress (admin)
CREATE OR REPLACE FUNCTION public.update_loi_progress(_loi_id uuid, _current integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN RAISE EXCEPTION 'Not authorized'; END IF;
  UPDATE letters_of_intent
    SET current_progress = GREATEST(_current, 0), updated_at=now()
    WHERE id=_loi_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'LOI not found'; END IF;
  RETURN jsonb_build_object('success', true);
END;
$$;
