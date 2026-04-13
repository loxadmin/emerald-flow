-- Backfill script health table for environments that missed prior tracker-health migration.
CREATE TABLE IF NOT EXISTS public.campaign_script_health (
  campaign_id UUID PRIMARY KEY REFERENCES public.campaigns(id) ON DELETE CASCADE,
  domain TEXT,
  last_ping_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'healthy' CHECK (status IN ('healthy', 'under_review')),
  flagged_reason TEXT,
  flagged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.campaign_script_health
  ADD COLUMN IF NOT EXISTS campaign_tracker_install_id UUID REFERENCES public.campaign_tracker_installs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS last_tracker_version TEXT,
  ADD COLUMN IF NOT EXISTS last_script_signature TEXT,
  ADD COLUMN IF NOT EXISTS install_integrity TEXT NOT NULL DEFAULT 'unknown' CHECK (install_integrity IN ('unknown', 'ok', 'outdated', 'tampered')),
  ADD COLUMN IF NOT EXISTS integrity_message TEXT;

ALTER TABLE public.campaign_script_health ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage script health" ON public.campaign_script_health;
CREATE POLICY "Admins can manage script health"
ON public.campaign_script_health
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Advertisers can view own script health" ON public.campaign_script_health;
CREATE POLICY "Advertisers can view own script health"
ON public.campaign_script_health
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.campaigns
    WHERE campaigns.id = campaign_script_health.campaign_id
      AND campaigns.advertiser_id = auth.uid()
  )
);
