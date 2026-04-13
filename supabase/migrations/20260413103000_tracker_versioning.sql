-- Tracker release/versioning lifecycle
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tracker_install_status') THEN
    CREATE TYPE public.tracker_install_status AS ENUM ('active', 'deprecated', 'pending_upgrade');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tracker_upgrade_severity') THEN
    CREATE TYPE public.tracker_upgrade_severity AS ENUM ('info', 'recommended', 'critical');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.tracker_releases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version TEXT NOT NULL UNIQUE,
  bundle_path TEXT NOT NULL,
  changelog TEXT,
  is_stable BOOLEAN NOT NULL DEFAULT false,
  release_policy public.tracker_upgrade_severity NOT NULL DEFAULT 'recommended',
  force_upgrade BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.campaign_tracker_installs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  tracker_release_id UUID NOT NULL REFERENCES public.tracker_releases(id) ON DELETE RESTRICT,
  api_key_snapshot TEXT,
  snippet TEXT NOT NULL,
  status public.tracker_install_status NOT NULL DEFAULT 'active',
  installed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (campaign_id)
);

CREATE TABLE IF NOT EXISTS public.campaign_upgrade_notices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  from_version TEXT NOT NULL,
  to_version TEXT NOT NULL,
  severity public.tracker_upgrade_severity NOT NULL DEFAULT 'recommended',
  message TEXT NOT NULL,
  acknowledged BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.tracker_releases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_tracker_installs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_upgrade_notices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage tracker releases" ON public.tracker_releases;
CREATE POLICY "Admins can manage tracker releases"
ON public.tracker_releases
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Advertisers can view stable tracker releases" ON public.tracker_releases;
CREATE POLICY "Advertisers can view stable tracker releases"
ON public.tracker_releases
FOR SELECT
USING (is_stable OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can manage campaign tracker installs" ON public.campaign_tracker_installs;
CREATE POLICY "Admins can manage campaign tracker installs"
ON public.campaign_tracker_installs
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Advertisers can manage own campaign installs" ON public.campaign_tracker_installs;
CREATE POLICY "Advertisers can manage own campaign installs"
ON public.campaign_tracker_installs
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM public.campaigns
    WHERE campaigns.id = campaign_tracker_installs.campaign_id
      AND campaigns.advertiser_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.campaigns
    WHERE campaigns.id = campaign_tracker_installs.campaign_id
      AND campaigns.advertiser_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Admins can manage campaign upgrade notices" ON public.campaign_upgrade_notices;
CREATE POLICY "Admins can manage campaign upgrade notices"
ON public.campaign_upgrade_notices
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Advertisers can view own campaign upgrade notices" ON public.campaign_upgrade_notices;
CREATE POLICY "Advertisers can view own campaign upgrade notices"
ON public.campaign_upgrade_notices
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.campaigns
    WHERE campaigns.id = campaign_upgrade_notices.campaign_id
      AND campaigns.advertiser_id = auth.uid()
  )
);

ALTER TABLE public.campaign_script_health
  ADD COLUMN IF NOT EXISTS campaign_tracker_install_id UUID REFERENCES public.campaign_tracker_installs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS last_tracker_version TEXT,
  ADD COLUMN IF NOT EXISTS last_script_signature TEXT,
  ADD COLUMN IF NOT EXISTS install_integrity TEXT NOT NULL DEFAULT 'unknown' CHECK (install_integrity IN ('unknown', 'ok', 'outdated', 'tampered')),
  ADD COLUMN IF NOT EXISTS integrity_message TEXT;

CREATE INDEX IF NOT EXISTS idx_campaign_upgrade_notices_campaign ON public.campaign_upgrade_notices(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_upgrade_notices_ack ON public.campaign_upgrade_notices(campaign_id, acknowledged);
CREATE INDEX IF NOT EXISTS idx_campaign_tracker_installs_release ON public.campaign_tracker_installs(tracker_release_id);

-- Baseline release for legacy campaigns.
INSERT INTO public.tracker_releases (version, bundle_path, changelog, is_stable, release_policy)
VALUES ('v1.0.0', 'https://advertiser.karbali.com/karbali-tracker.js', 'Baseline tracker release for campaign-level versioning.', true, 'recommended')
ON CONFLICT (version) DO NOTHING;

WITH stable_release AS (
  SELECT id, version
  FROM public.tracker_releases
  WHERE is_stable = true
  ORDER BY created_at DESC
  LIMIT 1
),
latest_campaign_keys AS (
  SELECT DISTINCT ON (ak.campaign_id)
    ak.campaign_id,
    ak.key AS api_key
  FROM public.api_keys ak
  ORDER BY ak.campaign_id, ak.created_at DESC NULLS LAST
)
INSERT INTO public.campaign_tracker_installs (
  campaign_id,
  tracker_release_id,
  api_key_snapshot,
  snippet,
  status,
  installed_at,
  updated_at
)
SELECT
  lck.campaign_id,
  sr.id,
  lck.api_key,
  format(
$snippet$<script>
  window.KarbaliConfig = { apiKey: "%s", campaignId: "%s" };
</script>
<script async src="https://advertiser.karbali.com/karbali-tracker/c/%s.js"></script>$snippet$,
    lck.api_key,
    lck.campaign_id,
    lck.campaign_id
  ),
  'active'::public.tracker_install_status,
  now(),
  now()
FROM latest_campaign_keys lck
CROSS JOIN stable_release sr
ON CONFLICT (campaign_id) DO NOTHING;
