-- Storage policies for pyramid-materials bucket
CREATE POLICY "Authenticated can read pyramid materials"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'pyramid-materials');

CREATE POLICY "Admins can insert pyramid materials"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'pyramid-materials' AND is_admin(auth.uid()));

CREATE POLICY "Admins can update pyramid materials"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'pyramid-materials' AND is_admin(auth.uid()))
WITH CHECK (bucket_id = 'pyramid-materials' AND is_admin(auth.uid()));

CREATE POLICY "Admins can delete pyramid materials"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'pyramid-materials' AND is_admin(auth.uid()));