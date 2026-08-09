-- 10_storage.sql — 38 RLS-политик storage.objects.
-- Бакеты создаются ОТДЕЛЬНО (см. README, раздел «Ручные действия»).

CREATE POLICY "Admins can delete content media" ON storage.objects AS PERMISSIVE FOR DELETE TO public
  USING (((bucket_id = 'content'::text) AND is_admin(auth.uid())));

CREATE POLICY "Admins can delete moments media" ON storage.objects AS PERMISSIVE FOR DELETE TO public
  USING (((bucket_id = 'moments'::text) AND is_admin(auth.uid())));

CREATE POLICY "Admins can delete pyramid materials" ON storage.objects AS PERMISSIVE FOR DELETE TO authenticated
  USING (((bucket_id = 'pyramid-materials'::text) AND is_admin(auth.uid())));

CREATE POLICY "Admins can delete testimonials media" ON storage.objects AS PERMISSIVE FOR DELETE TO public
  USING (((bucket_id = 'testimonials'::text) AND is_admin(auth.uid())));

CREATE POLICY "Admins can insert pyramid materials" ON storage.objects AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (((bucket_id = 'pyramid-materials'::text) AND is_admin(auth.uid())));

CREATE POLICY "Admins can update content media" ON storage.objects AS PERMISSIVE FOR UPDATE TO public
  USING (((bucket_id = 'content'::text) AND is_admin(auth.uid())));

CREATE POLICY "Admins can update moments media" ON storage.objects AS PERMISSIVE FOR UPDATE TO public
  USING (((bucket_id = 'moments'::text) AND is_admin(auth.uid())));

CREATE POLICY "Admins can update pyramid materials" ON storage.objects AS PERMISSIVE FOR UPDATE TO authenticated
  USING (((bucket_id = 'pyramid-materials'::text) AND is_admin(auth.uid())))
  WITH CHECK (((bucket_id = 'pyramid-materials'::text) AND is_admin(auth.uid())));

CREATE POLICY "Admins can update testimonials media" ON storage.objects AS PERMISSIVE FOR UPDATE TO public
  USING (((bucket_id = 'testimonials'::text) AND is_admin(auth.uid())));

CREATE POLICY "Admins can upload content media" ON storage.objects AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (((bucket_id = 'content'::text) AND is_admin(auth.uid())));

CREATE POLICY "Admins can upload moments media" ON storage.objects AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (((bucket_id = 'moments'::text) AND is_admin(auth.uid())));

CREATE POLICY "Admins can upload testimonials media" ON storage.objects AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (((bucket_id = 'testimonials'::text) AND is_admin(auth.uid())));

CREATE POLICY "Admins delete assignment files" ON storage.objects AS PERMISSIVE FOR DELETE TO authenticated
  USING (((bucket_id = 'homework-files'::text) AND ((storage.foldername(name))[1] = 'assignments'::text) AND (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'super_admin'::user_role))));

CREATE POLICY "Admins delete reward images" ON storage.objects AS PERMISSIVE FOR DELETE TO authenticated
  USING (((bucket_id = 'content'::text) AND ((storage.foldername(name))[1] = 'rewards'::text) AND is_admin(auth.uid())));

CREATE POLICY "Admins manage broadcast files delete" ON storage.objects AS PERMISSIVE FOR DELETE TO authenticated
  USING (((bucket_id = 'broadcasts'::text) AND is_admin(auth.uid())));

CREATE POLICY "Admins manage broadcast files insert" ON storage.objects AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (((bucket_id = 'broadcasts'::text) AND is_admin(auth.uid())));

CREATE POLICY "Admins manage broadcast files select" ON storage.objects AS PERMISSIVE FOR SELECT TO authenticated
  USING (((bucket_id = 'broadcasts'::text) AND is_admin(auth.uid())));

CREATE POLICY "Admins manage broadcast files update" ON storage.objects AS PERMISSIVE FOR UPDATE TO authenticated
  USING (((bucket_id = 'broadcasts'::text) AND is_admin(auth.uid())));

CREATE POLICY "Admins read all homework files" ON storage.objects AS PERMISSIVE FOR SELECT TO authenticated
  USING (((bucket_id = 'homework-files'::text) AND (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'super_admin'::user_role))));

CREATE POLICY "Admins update assignment files" ON storage.objects AS PERMISSIVE FOR UPDATE TO authenticated
  USING (((bucket_id = 'homework-files'::text) AND ((storage.foldername(name))[1] = 'assignments'::text) AND (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'super_admin'::user_role))));

CREATE POLICY "Admins update reward images" ON storage.objects AS PERMISSIVE FOR UPDATE TO authenticated
  USING (((bucket_id = 'content'::text) AND ((storage.foldername(name))[1] = 'rewards'::text) AND is_admin(auth.uid())));

CREATE POLICY "Admins upload assignment files" ON storage.objects AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (((bucket_id = 'homework-files'::text) AND ((storage.foldername(name))[1] = 'assignments'::text) AND (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'super_admin'::user_role))));

CREATE POLICY "Admins upload reward images" ON storage.objects AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (((bucket_id = 'content'::text) AND ((storage.foldername(name))[1] = 'rewards'::text) AND is_admin(auth.uid())));

CREATE POLICY "Authenticated can read pyramid materials" ON storage.objects AS PERMISSIVE FOR SELECT TO authenticated
  USING ((bucket_id = 'pyramid-materials'::text));

CREATE POLICY "Authenticated read assignment files" ON storage.objects AS PERMISSIVE FOR SELECT TO authenticated
  USING (((bucket_id = 'homework-files'::text) AND ((storage.foldername(name))[1] = 'assignments'::text)));

CREATE POLICY "Public can view avatars" ON storage.objects AS PERMISSIVE FOR SELECT TO public
  USING ((bucket_id = 'avatars'::text));

CREATE POLICY "Public can view content media" ON storage.objects AS PERMISSIVE FOR SELECT TO public
  USING ((bucket_id = 'content'::text));

CREATE POLICY "Public can view moments media" ON storage.objects AS PERMISSIVE FOR SELECT TO public
  USING ((bucket_id = 'moments'::text));

CREATE POLICY "Public can view testimonials media" ON storage.objects AS PERMISSIVE FOR SELECT TO public
  USING ((bucket_id = 'testimonials'::text));

CREATE POLICY "Super admins can manage contracts" ON storage.objects AS PERMISSIVE FOR ALL TO public
  USING (((bucket_id = 'contracts'::text) AND is_super_admin(auth.uid())))
  WITH CHECK (((bucket_id = 'contracts'::text) AND is_super_admin(auth.uid())));

CREATE POLICY "Users can view their own contracts" ON storage.objects AS PERMISSIVE FOR SELECT TO public
  USING (((bucket_id = 'contracts'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));

CREATE POLICY "Users delete own avatar" ON storage.objects AS PERMISSIVE FOR DELETE TO authenticated
  USING (((bucket_id = 'avatars'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));

CREATE POLICY "Users delete own homework files" ON storage.objects AS PERMISSIVE FOR DELETE TO authenticated
  USING (((bucket_id = 'homework-files'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));

CREATE POLICY "Users manage own homework files" ON storage.objects AS PERMISSIVE FOR UPDATE TO authenticated
  USING (((bucket_id = 'homework-files'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));

CREATE POLICY "Users read own homework files" ON storage.objects AS PERMISSIVE FOR SELECT TO authenticated
  USING (((bucket_id = 'homework-files'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));

CREATE POLICY "Users update own avatar" ON storage.objects AS PERMISSIVE FOR UPDATE TO authenticated
  USING (((bucket_id = 'avatars'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));

CREATE POLICY "Users upload own avatar" ON storage.objects AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (((bucket_id = 'avatars'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));

CREATE POLICY "Users upload own homework files" ON storage.objects AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (((bucket_id = 'homework-files'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));
