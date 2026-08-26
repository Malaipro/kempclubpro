CREATE POLICY "Users upload own checkpoint photos" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'checkpoints' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users update own checkpoint photos" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'checkpoints' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'checkpoints' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users delete own checkpoint photos" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'checkpoints' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Admins manage checkpoint photos" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'checkpoints' AND is_admin(auth.uid()))
  WITH CHECK (bucket_id = 'checkpoints' AND is_admin(auth.uid()));