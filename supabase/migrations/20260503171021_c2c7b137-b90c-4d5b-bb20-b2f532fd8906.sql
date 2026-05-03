
CREATE TABLE IF NOT EXISTS public.activation_reminder_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_id uuid NOT NULL,
  email text NOT NULL,
  subtype text,
  sent_on date NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::date,
  status text NOT NULL DEFAULT 'sent',
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (advertiser_id, sent_on)
);

ALTER TABLE public.activation_reminder_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view activation reminder log"
  ON public.activation_reminder_log FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_activation_reminder_log_sent_on
  ON public.activation_reminder_log (sent_on DESC);

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
