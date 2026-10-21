ALTER TABLE public.mastermind_tracks ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE public.mastermind_track_goals ADD COLUMN IF NOT EXISTS request text, ADD COLUMN IF NOT EXISTS plan text;
ALTER TABLE public.mastermind_entries ADD COLUMN IF NOT EXISTS track_id uuid REFERENCES public.mastermind_tracks(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS mastermind_entries_track_idx ON public.mastermind_entries(track_id);
CREATE INDEX IF NOT EXISTS mastermind_tasks_track_idx ON public.mastermind_tasks(track_id);

CREATE OR REPLACE FUNCTION public.save_mastermind_track_plan_web(p_track_id uuid,p_goal text,p_request text DEFAULT NULL,p_plan text DEFAULT NULL,p_outcome text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_member uuid;
BEGIN
 IF auth.uid() IS NULL THEN RETURN jsonb_build_object('ok',false,'error','Войдите в кабинет'); END IF;
 SELECT m.id INTO v_member FROM public.mastermind_members m JOIN public.mastermind_tracks t ON t.group_id=m.group_id WHERE t.id=p_track_id AND m.user_id=auth.uid() AND m.is_active ORDER BY m.created_at DESC LIMIT 1;
 IF v_member IS NULL THEN RETURN jsonb_build_object('ok',false,'error','Трек недоступен'); END IF;
 IF NULLIF(btrim(p_goal),'') IS NULL THEN RETURN jsonb_build_object('ok',false,'error','Укажите цель трека'); END IF;
 INSERT INTO public.mastermind_track_goals(track_id,member_id,goal,request,plan,outcome) VALUES(p_track_id,v_member,btrim(p_goal),NULLIF(btrim(p_request),''),NULLIF(btrim(p_plan),''),NULLIF(btrim(p_outcome),'')) ON CONFLICT(track_id,member_id) DO UPDATE SET goal=EXCLUDED.goal,request=EXCLUDED.request,plan=EXCLUDED.plan,outcome=EXCLUDED.outcome;
 RETURN jsonb_build_object('ok',true);
END $$;

CREATE OR REPLACE FUNCTION public.create_mastermind_track_task_web(p_track_id uuid,p_title text,p_description text DEFAULT NULL,p_deadline date DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_member uuid; v_task uuid;
BEGIN
 IF auth.uid() IS NULL THEN RETURN jsonb_build_object('ok',false,'error','Войдите в кабинет'); END IF;
 SELECT m.id INTO v_member FROM public.mastermind_members m JOIN public.mastermind_tracks t ON t.group_id=m.group_id WHERE t.id=p_track_id AND m.user_id=auth.uid() AND m.is_active ORDER BY m.created_at DESC LIMIT 1;
 IF v_member IS NULL THEN RETURN jsonb_build_object('ok',false,'error','Трек недоступен'); END IF;
 IF NULLIF(btrim(p_title),'') IS NULL THEN RETURN jsonb_build_object('ok',false,'error','Укажите название задачи'); END IF;
 INSERT INTO public.mastermind_tasks(member_id,track_id,title,description,deadline,created_by,approval_status) VALUES(v_member,p_track_id,btrim(p_title),NULLIF(btrim(p_description),''),p_deadline,auth.uid(),'pending') RETURNING id INTO v_task;
 RETURN jsonb_build_object('ok',true,'task_id',v_task);
END $$;

CREATE OR REPLACE FUNCTION public.submit_mastermind_track_entry_web(p_track_id uuid,p_summary text,p_my_tasks text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_member uuid; v_entry uuid;
BEGIN
 IF auth.uid() IS NULL THEN RETURN jsonb_build_object('ok',false,'error','Войдите в кабинет'); END IF;
 SELECT m.id INTO v_member FROM public.mastermind_members m JOIN public.mastermind_tracks t ON t.group_id=m.group_id WHERE t.id=p_track_id AND m.user_id=auth.uid() AND m.is_active ORDER BY m.created_at DESC LIMIT 1;
 IF v_member IS NULL THEN RETURN jsonb_build_object('ok',false,'error','Трек недоступен'); END IF;
 IF NULLIF(btrim(p_summary),'') IS NULL THEN RETURN jsonb_build_object('ok',false,'error','Укажите результат'); END IF;
 INSERT INTO public.mastermind_entries(member_id,track_id,summary,my_tasks) VALUES(v_member,p_track_id,btrim(p_summary),NULLIF(btrim(p_my_tasks),'')) RETURNING id INTO v_entry;
 RETURN jsonb_build_object('ok',true,'entry_id',v_entry);
END $$;
REVOKE ALL ON FUNCTION public.save_mastermind_track_plan_web(uuid,text,text,text,text),public.create_mastermind_track_task_web(uuid,text,text,date),public.submit_mastermind_track_entry_web(uuid,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.save_mastermind_track_plan_web(uuid,text,text,text,text),public.create_mastermind_track_task_web(uuid,text,text,date),public.submit_mastermind_track_entry_web(uuid,text,text) TO authenticated,service_role;

-- DOWN (non-destructive): restore the previous UI. Added nullable columns and scoped functions may remain unused, preserving all track history.
