-- Дедлайн задач мастермайнда + флаг одобрения для задач, которые создаёт сам участник.
-- approval_status = NULL — задача от тренера (не требует одобрения);
-- 'pending'/'approved'/'rejected' — задача создана участником через Mini App.

ALTER TABLE public.mastermind_tasks
  ADD COLUMN IF NOT EXISTS deadline TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approval_status TEXT CHECK (approval_status IN ('pending', 'approved', 'rejected'));

-- RPC: участник мастермайнда создаёт себе задачу (со статусом pending — на проверку тренеру)
CREATE OR REPLACE FUNCTION public.server_create_mastermind_task(
  p_user_id UUID,
  p_title TEXT,
  p_description TEXT DEFAULT NULL,
  p_deadline TIMESTAMPTZ DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member_id UUID;
  v_next_sort INTEGER;
  v_task_id UUID;
BEGIN
  IF p_title IS NULL OR length(trim(p_title)) = 0 THEN
    RAISE EXCEPTION 'Название задачи обязательно';
  END IF;

  SELECT id INTO v_member_id
  FROM public.mastermind_members
  WHERE user_id = p_user_id AND is_active = true
  LIMIT 1;

  IF v_member_id IS NULL THEN
    RAISE EXCEPTION 'Вы не записаны в мастермайнд';
  END IF;

  SELECT COALESCE(MAX(sort_order), 0) + 1 INTO v_next_sort
  FROM public.mastermind_tasks
  WHERE member_id = v_member_id;

  INSERT INTO public.mastermind_tasks (member_id, title, description, deadline, approval_status, sort_order)
  VALUES (
    v_member_id,
    trim(p_title),
    NULLIF(trim(COALESCE(p_description, '')), ''),
    p_deadline,
    'pending',
    v_next_sort
  )
  RETURNING id INTO v_task_id;

  RETURN v_task_id;
END;
$$;
