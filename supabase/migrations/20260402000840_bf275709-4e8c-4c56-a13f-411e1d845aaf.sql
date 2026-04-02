
-- Add target_users and selected_milestones to campaigns
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS target_users integer NOT NULL DEFAULT 100;
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS selected_milestones text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS integration_type text NOT NULL DEFAULT 'custom';
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS integration_verified boolean NOT NULL DEFAULT false;
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS total_cost numeric NOT NULL DEFAULT 0;

-- Insert admin pricing settings
INSERT INTO public.admin_settings (key, value, description) VALUES
  ('price_per_download', '1.00', 'Price per download milestone (USD)'),
  ('price_per_signup', '2.00', 'Price per signup milestone (USD)'),
  ('price_per_purchase', '5.00', 'Price per purchase milestone (USD)'),
  ('ad_placement_fee', '2.00', 'Ad placement fee per campaign (USD)')
ON CONFLICT (key) DO NOTHING;
