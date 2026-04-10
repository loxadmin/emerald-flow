
-- Extension clicks table
CREATE TABLE public.extension_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ext_user_id text NOT NULL,
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  destination_url text NOT NULL,
  user_agent text,
  ip text,
  status text NOT NULL DEFAULT 'clicked',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.extension_clicks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage extension clicks"
ON public.extension_clicks FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_ext_clicks_campaign ON public.extension_clicks(campaign_id);
CREATE INDEX idx_ext_clicks_user ON public.extension_clicks(ext_user_id);

-- Extension conversions table
CREATE TABLE public.extension_conversions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  click_id uuid NOT NULL REFERENCES public.extension_clicks(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  rewarded boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.extension_conversions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage extension conversions"
ON public.extension_conversions FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_ext_conv_click ON public.extension_conversions(click_id);

-- Extension rewards table
CREATE TABLE public.extension_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ext_user_id text NOT NULL,
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  click_id uuid REFERENCES public.extension_clicks(id) ON DELETE SET NULL,
  points numeric NOT NULL DEFAULT 0,
  reward_type text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.extension_rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage extension rewards"
ON public.extension_rewards FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_ext_rewards_user ON public.extension_rewards(ext_user_id);
CREATE INDEX idx_ext_rewards_campaign ON public.extension_rewards(campaign_id);
