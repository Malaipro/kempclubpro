-- 1. Add file_url column to homework_assignments
ALTER TABLE public.homework_assignments ADD COLUMN IF NOT EXISTS file_url text;

-- 2. Storage policies for assignment files (folder "assignments/")
-- Admins/super admins can upload assignment files
CREATE POLICY "Admins upload assignment files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'homework-files'
  AND (storage.foldername(name))[1] = 'assignments'
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
);

-- Admins/super admins can update/delete assignment files
CREATE POLICY "Admins update assignment files"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'homework-files'
  AND (storage.foldername(name))[1] = 'assignments'
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
);

CREATE POLICY "Admins delete assignment files"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'homework-files'
  AND (storage.foldername(name))[1] = 'assignments'
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
);

-- All authenticated users can read assignment files
CREATE POLICY "Authenticated read assignment files"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'homework-files'
  AND (storage.foldername(name))[1] = 'assignments'
);

-- 3. Update get_homework_for_user to include file_url
CREATE OR REPLACE FUNCTION public.get_homework_for_user(p_telegram_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id   UUID;
  v_stream_id UUID;
  v_homework  JSONB;
BEGIN
  SELECT p.user_id, p.current_stream_id
  INTO   v_user_id, v_stream_id
  FROM   profiles p
  WHERE  p.telegram_id = p_telegram_id
  LIMIT  1;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('found', false, 'error', 'not_linked');
  END IF;

  SELECT jsonb_agg(
    jsonb_build_object(
      'id', a.id,
      'title', a.title,
      'theme', a.theme,
      'content', a.content,
      'deadline', a.deadline,
      'points_reward', a.points_reward,
      'file_url', a.file_url,
      'status', s.status,
      'submission_content', s.content,
      'admin_comment', s.admin_comment
    )
    ORDER BY a.created_at DESC
  )
  INTO v_homework
  FROM   public.homework_assignments a
  LEFT JOIN LATERAL (
    SELECT hs.status, hs.content, hs.admin_comment
    FROM   public.homework_submissions hs
    WHERE  hs.assignment_id = a.id
      AND  hs.user_id = v_user_id
    ORDER BY hs.created_at DESC
    LIMIT  1
  ) s ON true
  WHERE  a.is_active = true
    AND  (
      a.target_user_id = v_user_id
      OR (v_stream_id IS NOT NULL AND a.stream_id = v_stream_id)
    );

  RETURN jsonb_build_object('found', true, 'homework', COALESCE(v_homework, '[]'::jsonb));
END;
$function$;