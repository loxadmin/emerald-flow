-- Persistent referral/tid sessions for deterministic attribution
CREATE TABLE IF NOT EXISTS public.tracking_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tid TEXT NOT NULL UNIQUE,
  referral_code TEXT,
  referral_id UUID REFERENCES public.referrals(id) ON DELETE SET NULL,
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE,
  advertiser_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

ALTER TABLE public.tracking_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage tracking sessions" ON public.tracking_sessions
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Advertisers can view own tracking sessions" ON public.tracking_sessions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.campaigns
      WHERE campaigns.id = tracking_sessions.campaign_id
        AND campaigns.advertiser_id = auth.uid()
    )
  );

ALTER TABLE public.users_tracking
  ADD COLUMN IF NOT EXISTS tid TEXT,
  ADD COLUMN IF NOT EXISTS referred_by TEXT;

CREATE INDEX IF NOT EXISTS idx_tracking_sessions_campaign ON public.tracking_sessions(campaign_id);
CREATE INDEX IF NOT EXISTS idx_tracking_sessions_referral ON public.tracking_sessions(referral_id);
CREATE INDEX IF NOT EXISTS idx_users_tracking_tid ON public.users_tracking(tid);

-- Script heartbeat health per campaign (used for uninstall review checks)
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

ALTER TABLE public.campaign_script_health ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage script health" ON public.campaign_script_health
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Advertisers can view own script health" ON public.campaign_script_health
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.campaigns
      WHERE campaigns.id = campaign_script_health.campaign_id
        AND campaigns.advertiser_id = auth.uid()
    )
  );
