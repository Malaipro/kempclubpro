-- 10_storage.sql (v4) — бакеты + 38 RLS-политик storage.objects.
-- Отличие от v3: восемь бакетов создаются идемпотентно ДО политик.
-- Ограничения (public/private, размер, mime) выведены из фактического кода загрузок:
--   content            — src/components/admin/ContentBlocksManagement.tsx, RewardsManagement.tsx (accept="image/*")
--   moments            — src/components/admin/MomentsManagement.tsx (accept="image/*", "video/*")
--   testimonials       — src/components/admin/TestimonialManagement.tsx (accept="image/*", "video/*")
--   pyramid-materials  — src/components/admin/PyramidManagement.tsx (accept=".pdf,.ppt,.pptx,image/*")
--   homework-files     — src/components/dashboard/HomeworkUserView.tsx (accept="image/*,application/pdf")
--   broadcasts         — src/components/admin/BroadcastManagement.tsx (изображения/видео/документы рассылки)
--   avatars            — telegram-server/src/api/state.ts (аватар из Telegram, изображения)
--   contracts          — src/components/admin/ContractManagement.tsx (file.type === 'application/pdf')

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  -- Публичные бакеты: их содержимое отдаётся лендингом по прямым URL.
  ('avatars',            'avatars',            true,   5 * 1024 * 1024,
     ARRAY['image/jpeg','image/png','image/webp']),
  ('content',            'content',            true,  10 * 1024 * 1024,
     ARRAY['image/jpeg','image/png','image/webp','image/svg+xml']),
  ('moments',            'moments',            true, 100 * 1024 * 1024,
     ARRAY['image/jpeg','image/png','image/webp','video/mp4','video/quicktime']),
  ('testimonials',       'testimonials',       true, 100 * 1024 * 1024,
     ARRAY['image/jpeg','image/png','image/webp','video/mp4','video/quicktime']),

  -- Приватные бакеты: доступ только по подписанным URL / политикам.
  ('pyramid-materials',  'pyramid-materials',  false, 50 * 1024 * 1024,
     ARRAY['application/pdf','application/vnd.ms-powerpoint',
           'application/vnd.openxmlformats-officedocument.presentationml.presentation',
           'image/jpeg','image/png','image/webp']),
  ('homework-files',     'homework-files',     false, 20 * 1024 * 1024,
     ARRAY['image/jpeg','image/png','image/webp','application/pdf']),
  ('broadcasts',         'broadcasts',         false, 50 * 1024 * 1024,
     ARRAY['image/jpeg','image/png','image/webp','video/mp4','application/pdf']),
  ('contracts',          'contracts',          false, 20 * 1024 * 1024,
     ARRAY['application/pdf'])
ON CONFLICT (id) DO UPDATE
  SET public             = EXCLUDED.public,
      file_size_limit    = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ВНИМАНИЕ (решение владельца проекта МИРА):
--   * broadcasts — сейчас приватный; в КЭМП файлы рассылки отдаются ботом по подписанному
--     URL. Если бот МИРА будет слать прямые ссылки, потребуется решение владельца — по
--     умолчанию НЕ делаем публичным.
--   * moments / testimonials — публичные, потому что лендинг рендерит их напрямую.
--     Если для МИРА публикация медиа участниц нежелательна, переключить public = false
--     и раздавать через подписанные URL.
--   * Лимиты размера в КЭМП не были заданы (NULL) — значения выше подобраны
--     консервативно; при отказе загрузки увеличивайте точечно.

-- ---------------------------------------------------------------
-- Политики storage.objects
-- TO public оставлен только у 4 публичных SELECT-политик
-- (avatars, content, moments, testimonials); остальные — TO authenticated.
-- ---------------------------------------------------------------

CREATE POLICY "Admins can delete content media" ON storage.objects AS PERMISSIVE FOR DELETE TO authenticated
  USING (((bucket_id = 'content'::text) AND is_admin(auth.uid())));

CREATE POLICY "Admins can delete moments media" ON storage.objects AS PERMISSIVE FOR DELETE TO authenticated
  USING (((bucket_id = 'moments'::text) AND is_admin(auth.uid())));

CREATE POLICY "Admins can delete pyramid materials" ON storage.objects AS PERMISSIVE FOR DELETE TO authenticated
  USING (((bucket_id = 'pyramid-materials'::text) AND is_admin(auth.uid())));

CREATE POLICY "Admins can delete testimonials media" ON storage.objects AS PERMISSIVE FOR DELETE TO authenticated
  USING (((bucket_id = 'testimonials'::text) AND is_admin(auth.uid())));

CREATE POLICY "Admins can insert pyramid materials" ON storage.objects AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (((bucket_id = 'pyramid-materials'::text) AND is_admin(auth.uid())));

CREATE POLICY "Admins can update content media" ON storage.objects AS PERMISSIVE FOR UPDATE TO authenticated
  USING (((bucket_id = 'content'::text) AND is_admin(auth.uid())));

CREATE POLICY "Admins can update moments media" ON storage.objects AS PERMISSIVE FOR UPDATE TO authenticated
  USING (((bucket_id = 'moments'::text) AND is_admin(auth.uid())));

CREATE POLICY "Admins can update pyramid materials" ON storage.objects AS PERMISSIVE FOR UPDATE TO authenticated
  USING (((bucket_id = 'pyramid-materials'::text) AND is_admin(auth.uid())))
  WITH CHECK (((bucket_id = 'pyramid-materials'::text) AND is_admin(auth.uid())));

CREATE POLICY "Admins can update testimonials media" ON storage.objects AS PERMISSIVE FOR UPDATE TO authenticated
  USING (((bucket_id = 'testimonials'::text) AND is_admin(auth.uid())));

CREATE POLICY "Admins can upload content media" ON storage.objects AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (((bucket_id = 'content'::text) AND is_admin(auth.uid())));

CREATE POLICY "Admins can upload moments media" ON storage.objects AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (((bucket_id = 'moments'::text) AND is_admin(auth.uid())));

CREATE POLICY "Admins can upload testimonials media" ON storage.objects AS PERMISSIVE FOR INSERT TO authenticated
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

CREATE POLICY "Admins upload reward images" ON storage.objects AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (((bucket_id = 'content'::text) AND ((storage.foldername(name))[1] = 'rewards'::text) AND is_admin(auth.uid())));

CREATE POLICY "Admins upload assignment files" ON storage.objects AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (((bucket_id = 'homework-files'::text) AND ((storage.foldername(name))[1] = 'assignments'::text) AND (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'super_admin'::user_role))));

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

CREATE POLICY "Super admins can manage contracts" ON storage.objects AS PERMISSIVE FOR ALL TO authenticated
  USING (((bucket_id = 'contracts'::text) AND is_super_admin(auth.uid())))
  WITH CHECK (((bucket_id = 'contracts'::text) AND is_super_admin(auth.uid())));

CREATE POLICY "Users can view their own contracts" ON storage.objects AS PERMISSIVE FOR SELECT TO authenticated
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
