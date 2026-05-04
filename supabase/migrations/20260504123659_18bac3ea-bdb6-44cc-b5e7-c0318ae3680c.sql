-- 1. Таблица заданий
CREATE TABLE public.homework_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  theme TEXT,
  content TEXT NOT NULL,
  deadline TIMESTAMP WITH TIME ZONE,
  stream_id UUID REFERENCES public.streams(id) ON DELETE SET NULL,
  target_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  points_reward INTEGER NOT NULL DEFAULT 10,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT hw_target_check CHECK (stream_id IS NOT NULL OR target_user_id IS NOT NULL)
);

CREATE INDEX idx_hw_assignments_stream ON public.homework_assignments(stream_id) WHERE stream_id IS NOT NULL;
CREATE INDEX idx_hw_assignments_user ON public.homework_assignments(target_user_id) WHERE target_user_id IS NOT NULL;
CREATE INDEX idx_hw_assignments_active ON public.homework_assignments(is_active);

ALTER TABLE public.homework_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage all homework assignments"
ON public.homework_assignments
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Intensive participants view their assignments"
ON public.homework_assignments
FOR SELECT
TO authenticated
USING (
  is_active = true
  AND (
    target_user_id = auth.uid()
    OR (
      stream_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.user_id = auth.uid()
          AND p.current_stream_id = homework_assignments.stream_id
          AND p.participant_status = 'intensive_active'
      )
    )
  )
);

CREATE TRIGGER update_hw_assignments_updated_at
BEFORE UPDATE ON public.homework_assignments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Расширяем homework_submissions
ALTER TABLE public.homework_submissions
  ADD COLUMN IF NOT EXISTS assignment_id UUID REFERENCES public.homework_assignments(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'submitted',
  ADD COLUMN IF NOT EXISTS admin_comment TEXT,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.homework_submissions
  DROP CONSTRAINT IF EXISTS hw_status_check;
ALTER TABLE public.homework_submissions
  ADD CONSTRAINT hw_status_check CHECK (status IN ('submitted', 'accepted', 'rework'));

CREATE INDEX IF NOT EXISTS idx_hw_submissions_assignment ON public.homework_submissions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_hw_submissions_status ON public.homework_submissions(status);

-- 3. RPC проверки ДЗ
CREATE OR REPLACE FUNCTION public.review_homework_submission(
  p_submission_id UUID,
  p_status TEXT,
  p_admin_comment TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_submission public.homework_submissions%ROWTYPE;
  v_points INTEGER := 0;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only admins can review homework';
  END IF;

  IF p_status NOT IN ('accepted', 'rework') THEN
    RAISE EXCEPTION 'Invalid status: %', p_status;
  END IF;

  SELECT * INTO v_submission FROM public.homework_submissions WHERE id = p_submission_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Submission not found';
  END IF;

  IF p_status = 'accepted' AND v_submission.assignment_id IS NOT NULL THEN
    SELECT points_reward INTO v_points FROM public.homework_assignments WHERE id = v_submission.assignment_id;
    v_points := COALESCE(v_points, 10);
  END IF;

  UPDATE public.homework_submissions
  SET status = p_status,
      admin_comment = p_admin_comment,
      reviewed_at = now(),
      reviewed_by = auth.uid(),
      verified = (p_status = 'accepted'),
      points_earned = CASE WHEN p_status = 'accepted' THEN v_points ELSE 0 END
  WHERE id = p_submission_id;

  PERFORM public.update_user_leaderboard(v_submission.user_id);
END;
$$;