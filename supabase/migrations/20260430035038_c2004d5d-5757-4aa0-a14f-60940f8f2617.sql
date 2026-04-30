-- 1. Add auto_activation_at column with default May 10, 2026 UTC
ALTER TABLE public.campaigns
ADD COLUMN IF NOT EXISTS auto_activation_at timestamptz NOT NULL DEFAULT '2026-05-10 00:00:00+00'::timestamptz;

-- 2. Backfill any existing rows that may have NULL (defensive)
UPDATE public.campaigns
SET auto_activation_at = '2026-05-10 00:00:00+00'::timestamptz
WHERE auto_activation_at IS NULL;

-- 3. Enable pg_cron for scheduled auto-activation
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 4. Function that auto-activates pending campaigns whose timer has elapsed
CREATE OR REPLACE FUNCTION public.auto_activate_pending_campaigns()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.campaigns
  SET status = 'active'
  WHERE status = 'pending'
    AND is_draft = false
    AND auto_activation_at IS NOT NULL
    AND auto_activation_at <= now();
END;
$$;

-- 5. Schedule the job every 15 minutes (idempotent: unschedule first if exists)
DO $$
BEGIN
  PERFORM cron.unschedule('auto-activate-pending-campaigns');
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

SELECT cron.schedule(
  'auto-activate-pending-campaigns',
  '*/15 * * * *',
  $$ SELECT public.auto_activate_pending_campaigns(); $$
);