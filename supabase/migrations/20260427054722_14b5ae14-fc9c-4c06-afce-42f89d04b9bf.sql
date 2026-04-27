-- Add 'completed' status to campaign_status enum
ALTER TYPE public.campaign_status ADD VALUE IF NOT EXISTS 'completed';

-- Track which events have been included in digest emails
ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS notified_event_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS email_notifications_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS approval_notified_at timestamptz NULL;

-- Enable required extensions for cron-driven HTTP calls
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule hourly digest (idempotent)
DO $$
DECLARE
  _job_id bigint;
BEGIN
  SELECT jobid INTO _job_id FROM cron.job WHERE jobname = 'campaign-event-digest-hourly';
  IF _job_id IS NOT NULL THEN
    PERFORM cron.unschedule(_job_id);
  END IF;

  PERFORM cron.schedule(
    'campaign-event-digest-hourly',
    '0 * * * *',
    $cron$
    SELECT net.http_post(
      url := 'https://dvkoafztquswcqniwcyf.supabase.co/functions/v1/send-campaign-notification',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2a29hZnp0cXVzd2Nxbml3Y3lmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzMzc3ODcsImV4cCI6MjA4OTkxMzc4N30.tisSwPAmALxSQx1tJ5TFcGfLVZWyhQXCfsfWBzIPiQM'
      ),
      body := jsonb_build_object('action', 'digest')
    );
    $cron$
  );
END $$;