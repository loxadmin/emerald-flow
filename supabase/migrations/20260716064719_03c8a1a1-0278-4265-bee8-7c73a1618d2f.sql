
ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS promo_media_url text,
  ADD COLUMN IF NOT EXISTS promo_media_path text,
  ADD COLUMN IF NOT EXISTS promo_media_type text;

-- Storage policies on the private campaign-media bucket
DROP POLICY IF EXISTS "campaign_media_read_authenticated" ON storage.objects;
CREATE POLICY "campaign_media_read_authenticated"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'campaign-media');

DROP POLICY IF EXISTS "campaign_media_upload_own" ON storage.objects;
CREATE POLICY "campaign_media_upload_own"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'campaign-media'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "campaign_media_update_own" ON storage.objects;
CREATE POLICY "campaign_media_update_own"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'campaign-media'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "campaign_media_delete_own" ON storage.objects;
CREATE POLICY "campaign_media_delete_own"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'campaign-media'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
