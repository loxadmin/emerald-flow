CREATE TABLE IF NOT EXISTS public.rate_limits (
  key text NOT NULL,
  window_start timestamptz NOT NULL,
  count integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (key, window_start)
);

-- Internal infrastructure table: only the service role (edge functions) touches it.
GRANT ALL ON public.rate_limits TO service_role;

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rate_limits service role only"
  ON public.rate_limits FOR ALL
  USING (false) WITH CHECK (false);

CREATE INDEX IF NOT EXISTS idx_rate_limits_window ON public.rate_limits (window_start);

CREATE OR REPLACE FUNCTION public.consume_rate_limit(
  _key text,
  _limit integer,
  _window_seconds integer
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _bucket timestamptz;
  _count integer;
BEGIN
  _bucket := to_timestamp(floor(extract(epoch FROM now()) / GREATEST(_window_seconds, 1)) * GREATEST(_window_seconds, 1));

  INSERT INTO public.rate_limits (key, window_start, count, updated_at)
  VALUES (_key, _bucket, 1, now())
  ON CONFLICT (key, window_start)
  DO UPDATE SET count = public.rate_limits.count + 1, updated_at = now()
  RETURNING count INTO _count;

  -- opportunistic cleanup of expired buckets (cheap, index-backed)
  IF random() < 0.01 THEN
    DELETE FROM public.rate_limits WHERE window_start < now() - interval '1 hour';
  END IF;

  RETURN jsonb_build_object(
    'allowed', _count <= _limit,
    'remaining', GREATEST(_limit - _count, 0),
    'reset_at', _bucket + make_interval(secs => GREATEST(_window_seconds, 1))
  );
END;
$$;

REVOKE ALL ON FUNCTION public.consume_rate_limit(text, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_rate_limit(text, integer, integer) TO service_role;