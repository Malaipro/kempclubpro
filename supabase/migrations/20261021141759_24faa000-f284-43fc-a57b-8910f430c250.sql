CREATE TABLE public.mastermind_task_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.mastermind_tasks(id) ON DELETE CASCADE,
  reminder_kind text NOT NULL CHECK (reminder_kind IN ('day_before','due_day')),
  user_id uuid NOT NULL,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (task_id, reminder_kind)
);
GRANT ALL ON public.mastermind_task_reminders TO service_role;
ALTER TABLE public.mastermind_task_reminders ENABLE ROW LEVEL SECURITY;

INSERT INTO public.internal_settings(key, value)
VALUES ('mastermind_push_secret', encode(extensions.gen_random_bytes(32), 'hex'))
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.claim_mastermind_push_reminders(p_today date DEFAULT (now() AT TIME ZONE 'Europe/Moscow')::date)
RETURNS TABLE(reminder_id uuid, user_id uuid, task_title text, reminder_kind text, deadline date)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH candidates AS (
    SELECT t.id AS task_id, mm.user_id AS uid, t.title, t.deadline::date AS due,
      CASE WHEN t.deadline::date = p_today + 1 THEN 'day_before' ELSE 'due_day' END AS kind
    FROM public.mastermind_tasks t
    JOIN public.mastermind_members mm ON mm.id = t.member_id AND mm.is_active
    WHERE COALESCE(t.is_completed,false) = false AND COALESCE(t.is_failed,false) = false
      AND COALESCE(t.approval_status,'approved') NOT IN ('pending','rejected')
      AND t.deadline::date IN (p_today, p_today + 1)
  ), ins AS (
    INSERT INTO public.mastermind_task_reminders(task_id, reminder_kind, user_id)
    SELECT c.task_id, c.kind, c.uid FROM candidates c
    ON CONFLICT (task_id, reminder_kind) DO NOTHING
    RETURNING id, task_id, reminder_kind AS kind, mastermind_task_reminders.user_id AS uid
  )
  SELECT ins.id, ins.uid, c.title, ins.kind, c.due FROM ins JOIN candidates c ON c.task_id = ins.task_id AND c.kind = ins.kind;
END;
$$;
REVOKE ALL ON FUNCTION public.claim_mastermind_push_reminders(date) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_mastermind_push_reminders(date) TO service_role;