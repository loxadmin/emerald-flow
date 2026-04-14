ALTER TABLE public.campaign_tracker_installs
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
ADD COLUMN IF NOT EXISTS api_key_snapshot text,
ADD COLUMN IF NOT EXISTS snippet text,
ADD COLUMN IF NOT EXISTS installed_at timestamp with time zone DEFAULT now();

-- The edge function references tracker_release_id but the column is release_id.
-- Add tracker_release_id as an alias column that mirrors release_id for compatibility.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'campaign_tracker_installs' AND column_name = 'tracker_release_id'
  ) THEN
    ALTER TABLE public.campaign_tracker_installs ADD COLUMN tracker_release_id uuid;
    -- Backfill from release_id
    UPDATE public.campaign_tracker_installs SET tracker_release_id = release_id WHERE tracker_release_id IS NULL;
  END IF;
END $$;