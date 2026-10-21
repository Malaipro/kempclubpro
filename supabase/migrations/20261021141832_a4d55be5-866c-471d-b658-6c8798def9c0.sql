CREATE POLICY "Service manages mastermind reminders" ON public.mastermind_task_reminders FOR ALL TO service_role USING (true) WITH CHECK (true);
DELETE FROM public.internal_settings WHERE key='mastermind_push_secret';
ALTER TABLE public.mastermind_task_reminders ADD COLUMN deadline date, ADD COLUMN claimed_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.mastermind_task_reminders DROP CONSTRAINT mastermind_task_reminders_task_id_reminder_kind_key;
ALTER TABLE public.mastermind_task_reminders ADD CONSTRAINT mastermind_task_reminders_unique UNIQUE(task_id,reminder_kind,deadline);
CREATE OR REPLACE FUNCTION public.claim_mastermind_push_reminders(p_today date DEFAULT (now() AT TIME ZONE 'Europe/Moscow')::date)
RETURNS TABLE(reminder_id uuid, user_id uuid, task_title text, reminder_kind text, deadline date)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
RETURN QUERY
WITH candidates AS (
 SELECT t.id AS task_id, mm.user_id AS uid, t.title, t.deadline::date AS due,
 CASE WHEN t.deadline::date = p_today + 1 THEN 'day_before' ELSE 'due_day' END AS kind
 FROM public.mastermind_tasks t JOIN public.mastermind_members mm ON mm.id=t.member_id AND mm.is_active
 LEFT JOIN public.mastermind_tracks tr ON tr.id=t.track_id
 WHERE NOT COALESCE(t.is_completed,false) AND NOT COALESCE(t.is_failed,false)
 AND COALESCE(t.approval_status,'approved') NOT IN ('pending','rejected')
 AND (t.track_id IS NULL OR (tr.status='active' AND p_today BETWEEN tr.start_date AND tr.end_date))
 AND t.deadline::date IN (p_today,p_today+1)
 AND EXISTS(SELECT 1 FROM public.push_subscriptions ps WHERE ps.user_id=mm.user_id)
 ORDER BY t.id LIMIT 500
), ins AS (
 INSERT INTO public.mastermind_task_reminders AS r(task_id,reminder_kind,user_id,deadline)
 SELECT c.task_id,c.kind,c.uid,c.due FROM candidates c
 ON CONFLICT ON CONSTRAINT mastermind_task_reminders_unique DO UPDATE SET claimed_at=now()
 WHERE r.sent_at IS NULL AND r.claimed_at < now()-interval '15 minutes'
 RETURNING r.id,r.task_id,r.reminder_kind AS kind,r.user_id AS uid,r.deadline AS due
)
SELECT ins.id,ins.uid,c.title,ins.kind,ins.due FROM ins JOIN candidates c ON c.task_id=ins.task_id AND c.kind=ins.kind AND c.due=ins.due;
END; $$;
REVOKE ALL ON FUNCTION public.claim_mastermind_push_reminders(date) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_mastermind_push_reminders(date) TO service_role;