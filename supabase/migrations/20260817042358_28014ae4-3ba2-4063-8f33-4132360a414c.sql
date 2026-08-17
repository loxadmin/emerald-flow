ALTER TABLE public.affiliates
  ADD COLUMN IF NOT EXISTS setup_code text,
  ADD COLUMN IF NOT EXISTS setup_code_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS setup_code_used_at timestamptz,
  ADD COLUMN IF NOT EXISTS invited_by uuid;

CREATE INDEX IF NOT EXISTS idx_affiliates_setup_code ON public.affiliates (setup_code) WHERE setup_code IS NOT NULL;