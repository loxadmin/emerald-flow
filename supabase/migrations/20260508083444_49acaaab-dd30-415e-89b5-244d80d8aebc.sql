-- Auto-expire pending wallet transactions older than 3 hours
CREATE OR REPLACE FUNCTION public.expire_stale_pending_wallet_transactions()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _count integer;
BEGIN
  WITH updated AS (
    UPDATE public.wallet_transactions
    SET status = 'failed',
        description = COALESCE(description, '') ||
          CASE WHEN COALESCE(description, '') = '' THEN '' ELSE ' | ' END ||
          'Auto-marked unsuccessful after 3h pending'
    WHERE status = 'pending'
      AND created_at < now() - interval '3 hours'
    RETURNING 1
  )
  SELECT count(*) INTO _count FROM updated;
  RETURN _count;
END;
$$;

-- Run an immediate sweep for existing stale rows
SELECT public.expire_stale_pending_wallet_transactions();

-- Schedule it to run every 15 minutes via pg_cron
CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'expire-stale-pending-wallet-transactions') THEN
    PERFORM cron.unschedule('expire-stale-pending-wallet-transactions');
  END IF;
END $$;

SELECT cron.schedule(
  'expire-stale-pending-wallet-transactions',
  '*/15 * * * *',
  $$ SELECT public.expire_stale_pending_wallet_transactions(); $$
);