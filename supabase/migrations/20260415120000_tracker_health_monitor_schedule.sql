-- Ensure every campaign with tracker install has a health row and schedule stale heartbeat checks.
INSERT INTO public.campaign_script_health (campaign_id, campaign_tracker_install_id, status, updated_at)
SELECT
  cti.campaign_id,
  cti.id,
  COALESCE(csh.status, 'healthy') as status,
  now()
FROM public.campaign_tracker_installs cti
LEFT JOIN public.campaign_script_health csh ON csh.campaign_id = cti.campaign_id
WHERE csh.campaign_id IS NULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('karbali_tracker_health_monitor');

    PERFORM cron.schedule(
      'karbali_tracker_health_monitor',
      '*/5 * * * *',
      $$
      select
        net.http_post(
          url := current_setting('app.settings.supabase_url') || '/functions/v1/tracker-health-monitor',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
          ),
          body := jsonb_build_object('source', 'pg_cron')
        ) as request_id;
      $$
    );
  END IF;
EXCEPTION WHEN undefined_function THEN
  -- net extension may not be available in local/dev; skip scheduling there.
  NULL;
END;
$$;
