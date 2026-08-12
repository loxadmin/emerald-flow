CREATE TABLE public.admin_probe_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address text,
  user_agent text,
  path text NOT NULL DEFAULT '/admin',
  referer text,
  country text,
  user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.admin_probe_log TO authenticated;
GRANT ALL ON public.admin_probe_log TO service_role;

ALTER TABLE public.admin_probe_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view probe log"
ON public.admin_probe_log FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete probe log"
ON public.admin_probe_log FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_admin_probe_log_created_at ON public.admin_probe_log (created_at DESC);
CREATE INDEX idx_admin_probe_log_ip ON public.admin_probe_log (ip_address);