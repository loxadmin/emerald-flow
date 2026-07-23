
-- Add website URL to competitor apps
ALTER TABLE public.competitor_apps
  ADD COLUMN IF NOT EXISTS website_url text,
  ADD COLUMN IF NOT EXISTS logo_path text;

-- Unified campaign migration/source records (where users are switching from)
CREATE TABLE IF NOT EXISTS public.campaign_migrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_id uuid NOT NULL,
  campaign_id uuid REFERENCES public.campaigns(id) ON DELETE CASCADE,
  package_order_id uuid REFERENCES public.package_orders(id) ON DELETE CASCADE,
  switch_order_id uuid REFERENCES public.switch_offer_orders(id) ON DELETE CASCADE,
  source_name text NOT NULL,
  source_type text NOT NULL DEFAULT 'competitor',
  users_migrated integer NOT NULL DEFAULT 0,
  migration_date date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (campaign_id IS NOT NULL)::int
    + (package_order_id IS NOT NULL)::int
    + (switch_order_id IS NOT NULL)::int = 1
  )
);

GRANT SELECT ON public.campaign_migrations TO authenticated;
GRANT ALL ON public.campaign_migrations TO service_role;

ALTER TABLE public.campaign_migrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Advertisers view own migrations"
  ON public.campaign_migrations FOR SELECT
  TO authenticated
  USING (advertiser_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins manage all migrations"
  ON public.campaign_migrations FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_campaign_migrations_advertiser ON public.campaign_migrations(advertiser_id);
CREATE INDEX IF NOT EXISTS idx_campaign_migrations_campaign ON public.campaign_migrations(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_migrations_pkg ON public.campaign_migrations(package_order_id);
CREATE INDEX IF NOT EXISTS idx_campaign_migrations_switch ON public.campaign_migrations(switch_order_id);

CREATE TRIGGER trg_campaign_migrations_updated
  BEFORE UPDATE ON public.campaign_migrations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Allow authenticated users to read competitor logos via campaign-media bucket
-- (existing policies on storage.objects cover this bucket already)
