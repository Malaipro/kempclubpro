CREATE TABLE public.mastermind_tracks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.mastermind_groups(id) ON DELETE CASCADE,
  title text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.mastermind_meetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id uuid NOT NULL REFERENCES public.mastermind_tracks(id) ON DELETE CASCADE,
  meeting_date timestamptz NOT NULL,
  topic text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.mastermind_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL REFERENCES public.mastermind_meetings(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES public.mastermind_members(id) ON DELETE CASCADE,
  attended boolean NOT NULL DEFAULT true,
  marked_by uuid,
  marked_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (meeting_id, member_id)
);
CREATE TABLE public.mastermind_track_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id uuid NOT NULL REFERENCES public.mastermind_tracks(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES public.mastermind_members(id) ON DELETE CASCADE,
  goal text,
  outcome text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (track_id, member_id)
);
ALTER TABLE public.mastermind_tasks ADD COLUMN IF NOT EXISTS track_id uuid REFERENCES public.mastermind_tracks(id) ON DELETE SET NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.mastermind_tracks, public.mastermind_meetings, public.mastermind_attendance, public.mastermind_track_goals TO authenticated;
GRANT ALL ON public.mastermind_tracks, public.mastermind_meetings, public.mastermind_attendance, public.mastermind_track_goals TO service_role;

ALTER TABLE public.mastermind_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mastermind_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mastermind_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mastermind_track_goals ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_mastermind_group_member(_user_id uuid, _group_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.mastermind_members WHERE user_id=_user_id AND group_id=_group_id AND is_active=true)
$$;

CREATE POLICY "mm_tracks_admin" ON public.mastermind_tracks FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "mm_tracks_member_read" ON public.mastermind_tracks FOR SELECT TO authenticated USING (public.is_mastermind_group_member(auth.uid(), group_id));
CREATE POLICY "mm_meetings_admin" ON public.mastermind_meetings FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "mm_meetings_member_read" ON public.mastermind_meetings FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.mastermind_tracks t WHERE t.id=track_id AND public.is_mastermind_group_member(auth.uid(), t.group_id)));
CREATE POLICY "mm_att_admin" ON public.mastermind_attendance FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "mm_att_own_read" ON public.mastermind_attendance FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.mastermind_members m WHERE m.id=member_id AND m.user_id=auth.uid()));
CREATE POLICY "mm_goals_admin" ON public.mastermind_track_goals FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "mm_goals_own_read" ON public.mastermind_track_goals FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.mastermind_members m WHERE m.id=member_id AND m.user_id=auth.uid()));

CREATE TRIGGER trg_mm_tracks_updated BEFORE UPDATE ON public.mastermind_tracks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_mm_goals_updated BEFORE UPDATE ON public.mastermind_track_goals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- participant saves own goal / outcome for a track
CREATE OR REPLACE FUNCTION public.save_mastermind_goal_web(p_track_id uuid, p_goal text, p_outcome text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_member uuid;
BEGIN
  IF auth.uid() IS NULL THEN RETURN jsonb_build_object('ok',false,'error','not_authenticated'); END IF;
  SELECT m.id INTO v_member FROM public.mastermind_members m JOIN public.mastermind_tracks t ON t.group_id=m.group_id
   WHERE t.id=p_track_id AND m.user_id=auth.uid() AND m.is_active LIMIT 1;
  IF v_member IS NULL THEN RETURN jsonb_build_object('ok',false,'error','not_member'); END IF;
  INSERT INTO public.mastermind_track_goals(track_id, member_id, goal, outcome)
  VALUES (p_track_id, v_member, NULLIF(btrim(p_goal),''), NULLIF(btrim(p_outcome),''))
  ON CONFLICT (track_id, member_id) DO UPDATE SET goal=EXCLUDED.goal, outcome=COALESCE(EXCLUDED.outcome, mastermind_track_goals.outcome);
  RETURN jsonb_build_object('ok',true);
END $$;

-- summary per user (self or admin)
CREATE OR REPLACE FUNCTION public.get_mastermind_summary(p_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE r jsonb;
BEGIN
  IF auth.uid() IS NULL OR (auth.uid() <> p_user_id AND NOT public.is_admin(auth.uid())) THEN
    RETURN jsonb_build_object('error','forbidden');
  END IF;
  WITH mem AS (SELECT id, group_id FROM public.mastermind_members WHERE user_id=p_user_id),
  tk AS (SELECT t.*, tr.end_date AS track_end FROM public.mastermind_tasks t LEFT JOIN public.mastermind_tracks tr ON tr.id=t.track_id WHERE t.member_id IN (SELECT id FROM mem)),
  meets AS (SELECT mt.id FROM public.mastermind_meetings mt JOIN public.mastermind_tracks tr ON tr.id=mt.track_id WHERE tr.group_id IN (SELECT group_id FROM mem) AND mt.meeting_date <= now())
  SELECT jsonb_build_object(
    'tracks_completed', (SELECT count(*) FROM public.mastermind_tracks tr WHERE tr.group_id IN (SELECT group_id FROM mem) AND (tr.status='closed' OR tr.end_date < current_date)),
    'tasks_total', (SELECT count(*) FROM tk),
    'tasks_done', (SELECT count(*) FROM tk WHERE is_completed),
    'tasks_done_late', (SELECT count(*) FROM tk WHERE is_completed AND deadline IS NOT NULL AND completed_at::date > deadline),
    'tasks_overdue', (SELECT count(*) FROM tk WHERE NOT COALESCE(is_completed,false) AND NOT is_failed AND deadline < current_date AND (track_end IS NULL OR track_end >= current_date)),
    'tasks_not_done', (SELECT count(*) FROM tk WHERE NOT COALESCE(is_completed,false) AND (is_failed OR (track_end IS NOT NULL AND track_end < current_date))),
    'meetings_total', (SELECT count(*) FROM meets),
    'meetings_attended', (SELECT count(*) FROM public.mastermind_attendance a WHERE a.attended AND a.member_id IN (SELECT id FROM mem) AND a.meeting_id IN (SELECT id FROM meets))
  ) INTO r;
  RETURN r;
END $$;

-- aggregated group progress (numbers only) for my group's current track
CREATE OR REPLACE FUNCTION public.get_mastermind_group_progress_web(p_track_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_group uuid;
BEGIN
  SELECT group_id INTO v_group FROM public.mastermind_tracks WHERE id=p_track_id;
  IF v_group IS NULL OR auth.uid() IS NULL OR NOT (public.is_admin(auth.uid()) OR public.is_mastermind_group_member(auth.uid(), v_group)) THEN
    RETURN '[]'::jsonb;
  END IF;
  RETURN COALESCE((SELECT jsonb_agg(x ORDER BY (x->>'done')::int DESC) FROM (
    SELECT jsonb_build_object(
      'member_id', m.id,
      'is_me', m.user_id = auth.uid(),
      'name', COALESCE(NULLIF(btrim(concat_ws(' ', p.first_name, left(p.last_name,1))),''), p.display_name, 'Участник'),
      'total', (SELECT count(*) FROM public.mastermind_tasks t WHERE t.member_id=m.id AND t.track_id=p_track_id),
      'done', (SELECT count(*) FROM public.mastermind_tasks t WHERE t.member_id=m.id AND t.track_id=p_track_id AND t.is_completed),
      'on_time', (SELECT count(*) FROM public.mastermind_tasks t WHERE t.member_id=m.id AND t.track_id=p_track_id AND t.is_completed AND (t.deadline IS NULL OR t.completed_at::date <= t.deadline)),
      'attended', (SELECT count(*) FROM public.mastermind_attendance a JOIN public.mastermind_meetings mt ON mt.id=a.meeting_id WHERE a.member_id=m.id AND a.attended AND mt.track_id=p_track_id)
    ) x
    FROM public.mastermind_members m LEFT JOIN public.profiles p ON p.user_id=m.user_id
    WHERE m.group_id=v_group AND m.is_active
  ) s), '[]'::jsonb);
END $$;

GRANT EXECUTE ON FUNCTION public.save_mastermind_goal_web(uuid,text,text), public.get_mastermind_summary(uuid), public.get_mastermind_group_progress_web(uuid), public.is_mastermind_group_member(uuid,uuid) TO authenticated;