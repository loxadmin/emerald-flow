
ALTER TABLE public.creative_campaigns
  ADD COLUMN IF NOT EXISTS event_types text[] NOT NULL DEFAULT ARRAY['viewer']::text[],
  ADD COLUMN IF NOT EXISTS viewer_rate numeric,
  ADD COLUMN IF NOT EXISTS subscriber_rate numeric,
  ADD COLUMN IF NOT EXISTS target_subscribers integer;

ALTER TABLE public.creative_campaigns ALTER COLUMN transcription DROP NOT NULL;
ALTER TABLE public.creative_campaigns ALTER COLUMN transcription_confirmed DROP NOT NULL;
