-- Add file_url column to homework_submissions
ALTER TABLE public.homework_submissions ADD COLUMN IF NOT EXISTS file_url text;

-- Storage RLS policies for homework-files bucket
-- Users can upload files into their own folder (path prefix = their user id)
CREATE POLICY "Users upload own homework files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'homework-files'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can read their own homework files
CREATE POLICY "Users read own homework files"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'homework-files'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can update/delete their own homework files
CREATE POLICY "Users manage own homework files"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'homework-files'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users delete own homework files"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'homework-files'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Admins / super admins can read all homework files
CREATE POLICY "Admins read all homework files"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'homework-files'
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
);