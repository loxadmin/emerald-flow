
-- 1. Add missing columns to users_tracking
ALTER TABLE public.users_tracking
ADD COLUMN IF NOT EXISTS tid text,
ADD COLUMN IF NOT EXISTS referred_by text;

-- 2. Create tracking_sessions table
CREATE TABLE IF NOT EXISTS public.tracking_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tid text NOT NULL,
  campaign_id uuid REFERENCES public.campaigns(id) ON DELETE CASCADE,
  advertiser_id uuid,
  referral_code text,
  referral_id uuid REFERENCES public.referrals(id) ON DELETE SET NULL,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb,
  UNIQUE(tid)
);

ALTER TABLE public.tracking_sessions ENABLE ROW LEVEL SECURITY;

-- Service-role managed table; allow admins full access
CREATE POLICY "Admins can manage tracking sessions"
  ON public.tracking_sessions FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Advertisers can view own tracking sessions"
  ON public.tracking_sessions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.campaigns
    WHERE campaigns.id = tracking_sessions.campaign_id
      AND campaigns.advertiser_id = auth.uid()
  ));

-- 3. Create tracker_releases table
CREATE TABLE IF NOT EXISTS public.tracker_releases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version text NOT NULL UNIQUE,
  bundle_path text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tracker_releases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage tracker releases"
  ON public.tracker_releases FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can read tracker releases"
  ON public.tracker_releases FOR SELECT
  USING (true);

-- 4. Create campaign_tracker_installs table
CREATE TABLE IF NOT EXISTS public.campaign_tracker_installs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE UNIQUE,
  release_id uuid NOT NULL REFERENCES public.tracker_releases(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.campaign_tracker_installs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage tracker installs"
  ON public.campaign_tracker_installs FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Advertisers can view own tracker installs"
  ON public.campaign_tracker_installs FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.campaigns
    WHERE campaigns.id = campaign_tracker_installs.campaign_id
      AND campaigns.advertiser_id = auth.uid()
  ));

-- 5. Create campaign_script_health table
CREATE TABLE IF NOT EXISTS public.campaign_script_health (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE UNIQUE,
  campaign_tracker_install_id uuid REFERENCES public.campaign_tracker_installs(id) ON DELETE SET NULL,
  domain text,
  last_ping_at timestamptz,
  status text NOT NULL DEFAULT 'unknown',
  flagged_reason text,
  flagged_at timestamptz,
  last_tracker_version text,
  last_script_signature text,
  install_integrity text DEFAULT 'unknown',
  integrity_message text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.campaign_script_health ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage script health"
  ON public.campaign_script_health FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Advertisers can view own script health"
  ON public.campaign_script_health FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.campaigns
    WHERE campaigns.id = campaign_script_health.campaign_id
      AND campaigns.advertiser_id = auth.uid()
  ));

-- 6. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_tracking_sessions_tid ON public.tracking_sessions(tid);
CREATE INDEX IF NOT EXISTS idx_tracking_sessions_campaign ON public.tracking_sessions(campaign_id);
CREATE INDEX IF NOT EXISTS idx_users_tracking_tid ON public.users_tracking(tid);
CREATE INDEX IF NOT EXISTS idx_campaign_script_health_campaign ON public.campaign_script_health(campaign_id);
