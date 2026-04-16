
-- Add manual mode columns to campaigns
ALTER TABLE public.campaigns 
ADD COLUMN IF NOT EXISTS campaign_mode text NOT NULL DEFAULT 'api',
ADD COLUMN IF NOT EXISTS platform_type text NOT NULL DEFAULT 'website',
ADD COLUMN IF NOT EXISTS app_link text;

-- Create manual_events table for admin-recorded events
CREATE TABLE public.manual_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  count integer NOT NULL DEFAULT 1,
  purchase_amount numeric DEFAULT NULL,
  total_deducted numeric NOT NULL DEFAULT 0,
  recorded_by uuid NOT NULL,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.manual_events ENABLE ROW LEVEL SECURITY;

-- Admin can manage all manual events
CREATE POLICY "Admins can manage manual events"
ON public.manual_events
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Advertisers can view manual events for their own campaigns
CREATE POLICY "Advertisers can view own manual events"
ON public.manual_events
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM campaigns
  WHERE campaigns.id = manual_events.campaign_id
  AND campaigns.advertiser_id = auth.uid()
));

-- Add manual_mode_enabled admin setting
INSERT INTO public.admin_settings (key, value, description)
VALUES ('manual_mode_enabled', 'true', 'Enable manual campaign mode for advertisers')
ON CONFLICT (key) DO NOTHING;
