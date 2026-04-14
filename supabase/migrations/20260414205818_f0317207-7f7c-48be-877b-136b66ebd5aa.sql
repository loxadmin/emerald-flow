-- Add missing columns to tracker_releases
ALTER TABLE public.tracker_releases
ADD COLUMN IF NOT EXISTS is_stable boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS changelog text,
ADD COLUMN IF NOT EXISTS release_policy text NOT NULL DEFAULT 'recommended',
ADD COLUMN IF NOT EXISTS force_upgrade boolean NOT NULL DEFAULT false;

-- Add updated_at to campaign_tracker_installs
ALTER TABLE public.campaign_tracker_installs
ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now();

-- Add FK from tracker_release_id to tracker_releases
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'campaign_tracker_installs_tracker_release_id_fkey'
  ) THEN
    ALTER TABLE public.campaign_tracker_installs
    ADD CONSTRAINT campaign_tracker_installs_tracker_release_id_fkey
    FOREIGN KEY (tracker_release_id) REFERENCES public.tracker_releases(id);
  END IF;
END $$;

-- Create campaign_upgrade_notices table
CREATE TABLE IF NOT EXISTS public.campaign_upgrade_notices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  from_version text,
  to_version text NOT NULL,
  severity text NOT NULL DEFAULT 'info',
  message text,
  acknowledged boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.campaign_upgrade_notices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage upgrade notices"
ON public.campaign_upgrade_notices FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Advertisers can view own upgrade notices"
ON public.campaign_upgrade_notices FOR SELECT
USING (EXISTS (
  SELECT 1 FROM campaigns
  WHERE campaigns.id = campaign_upgrade_notices.campaign_id
  AND campaigns.advertiser_id = auth.uid()
));