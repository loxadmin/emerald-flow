
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule(jobid) from cron.job where jobname = 'send-activation-reminders-daily';

select cron.schedule(
  'send-activation-reminders-daily',
  '14 11 * * *',
  $$
  select net.http_post(
    url:='https://dvkoafztquswcqniwcyf.supabase.co/functions/v1/send-activation-reminders',
    headers:='{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2a29hZnp0cXVzd2Nxbml3Y3lmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzMzc3ODcsImV4cCI6MjA4OTkxMzc4N30.tisSwPAmALxSQx1tJ5TFcGfLVZWyhQXCfsfWBzIPiQM"}'::jsonb,
    body:='{}'::jsonb
  );
  $$
);
