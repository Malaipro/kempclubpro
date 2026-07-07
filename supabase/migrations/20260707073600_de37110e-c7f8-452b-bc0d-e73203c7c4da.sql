CREATE POLICY "Admins manage broadcast files select"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'broadcasts' AND public.is_admin(auth.uid()));

CREATE POLICY "Admins manage broadcast files insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'broadcasts' AND public.is_admin(auth.uid()));

CREATE POLICY "Admins manage broadcast files update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'broadcasts' AND public.is_admin(auth.uid()));

CREATE POLICY "Admins manage broadcast files delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'broadcasts' AND public.is_admin(auth.uid()));