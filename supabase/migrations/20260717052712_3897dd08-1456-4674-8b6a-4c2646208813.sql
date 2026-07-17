-- Add optional promo media columns for campaigns
ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS promo_media_url text,
  ADD COLUMN IF NOT EXISTS promo_media_path text,
  ADD COLUMN IF NOT EXISTS promo_media_type text;

-- Storage RLS for campaign-media bucket (private).
-- Users manage files in their own <user_id>/ folder; admins can view all.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='campaign_media_owner_read') THEN
    CREATE POLICY "campaign_media_owner_read" ON storage.objects
      FOR SELECT TO authenticated
      USING (bucket_id = 'campaign-media' AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(), 'admin'::public.app_role)));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='campaign_media_owner_insert') THEN
    CREATE POLICY "campaign_media_owner_insert" ON storage.objects
      FOR INSERT TO authenticated
      WITH CHECK (bucket_id = 'campaign-media' AND auth.uid()::text = (storage.foldername(name))[1]);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='campaign_media_owner_delete') THEN
    CREATE POLICY "campaign_media_owner_delete" ON storage.objects
      FOR DELETE TO authenticated
      USING (bucket_id = 'campaign-media' AND auth.uid()::text = (storage.foldername(name))[1]);
  END IF;
END $$;