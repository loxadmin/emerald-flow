
-- Advertisers manage files under their own uid/ prefix
CREATE POLICY "LOI: users read own files"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'loi-documents'
    AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(), 'admin'::app_role))
  );

CREATE POLICY "LOI: users upload own files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'loi-documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "LOI: admins upload anywhere"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'loi-documents' AND public.has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "LOI: admins update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'loi-documents' AND public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (bucket_id = 'loi-documents' AND public.has_role(auth.uid(), 'admin'::app_role));
