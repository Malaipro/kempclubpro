CREATE OR REPLACE FUNCTION mastermind_private.mastermind_checkin_web(p_meeting_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member_id uuid;
  v_meeting_msk date;
  v_now_msk timestamp;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;
  v_now_msk := now() AT TIME ZONE 'Europe/Moscow';
  SELECT (me.meeting_date AT TIME ZONE 'Europe/Moscow')::date INTO v_meeting_msk
  FROM mastermind_meetings me WHERE me.id = p_meeting_id;
  IF v_meeting_msk IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'meeting_not_found');
  END IF;
  SELECT mm.id INTO v_member_id
  FROM mastermind_members mm
  JOIN mastermind_meetings me ON me.id = p_meeting_id
  JOIN mastermind_tracks t ON t.id = me.track_id AND t.group_id = mm.group_id
  WHERE mm.user_id = auth.uid() AND mm.is_active;
  IF v_member_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_a_member');
  END IF;
  IF v_meeting_msk <> v_now_msk::date THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_meeting_day');
  END IF;
  IF v_now_msk::time > time '23:55' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'checkin_closed');
  END IF;
  IF EXISTS (SELECT 1 FROM mastermind_attendance WHERE meeting_id = p_meeting_id AND member_id = v_member_id) THEN
    UPDATE mastermind_attendance SET attended = true, marked_by = auth.uid(), marked_at = now()
    WHERE meeting_id = p_meeting_id AND member_id = v_member_id;
  ELSE
    INSERT INTO mastermind_attendance (meeting_id, member_id, attended, marked_by, marked_at)
    VALUES (p_meeting_id, v_member_id, true, auth.uid(), now());
  END IF;
  RETURN jsonb_build_object('ok', true);
END;
$$;

CREATE OR REPLACE FUNCTION mastermind_private.mastermind_auto_absent()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today date := (now() AT TIME ZONE 'Europe/Moscow')::date;
  v_count integer;
BEGIN
  INSERT INTO mastermind_attendance (meeting_id, member_id, attended, marked_by, marked_at)
  SELECT me.id, mm.id, false, NULL, now()
  FROM mastermind_meetings me
  JOIN mastermind_tracks t ON t.id = me.track_id
  JOIN mastermind_members mm ON mm.group_id = t.group_id AND mm.is_active
  WHERE (me.meeting_date AT TIME ZONE 'Europe/Moscow')::date = v_today
    AND NOT EXISTS (SELECT 1 FROM mastermind_attendance a WHERE a.meeting_id = me.id AND a.member_id = mm.id);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

CREATE TABLE public.mastermind_meeting_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL REFERENCES public.mastermind_meetings(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES public.mastermind_members(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  sent_at timestamptz,
  claimed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (meeting_id, member_id)
);
GRANT ALL ON public.mastermind_meeting_reminders TO service_role;
ALTER TABLE public.mastermind_meeting_reminders ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION mastermind_private.claim_mastermind_meeting_reminders()
RETURNS TABLE(reminder_id uuid, user_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today date := (now() AT TIME ZONE 'Europe/Moscow')::date;
BEGIN
  INSERT INTO mastermind_meeting_reminders (meeting_id, member_id, user_id)
  SELECT me.id, mm.id, mm.user_id
  FROM mastermind_meetings me
  JOIN mastermind_tracks t ON t.id = me.track_id
  JOIN mastermind_members mm ON mm.group_id = t.group_id AND mm.is_active
  WHERE (me.meeting_date AT TIME ZONE 'Europe/Moscow')::date = v_today
    AND NOT EXISTS (SELECT 1 FROM mastermind_attendance a WHERE a.meeting_id = me.id AND a.member_id = mm.id AND a.attended)
  ON CONFLICT (meeting_id, member_id) DO NOTHING;
  RETURN QUERY
  UPDATE mastermind_meeting_reminders r
  SET claimed_at = now()
  FROM mastermind_meetings me
  WHERE r.meeting_id = me.id
    AND (me.meeting_date AT TIME ZONE 'Europe/Moscow')::date = v_today
    AND r.sent_at IS NULL AND r.claimed_at IS NULL
  RETURNING r.id, r.user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION mastermind_private.mastermind_checkin_web(uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION mastermind_private.mastermind_auto_absent() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION mastermind_private.mastermind_auto_absent() TO service_role;
REVOKE ALL ON FUNCTION mastermind_private.claim_mastermind_meeting_reminders() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION mastermind_private.claim_mastermind_meeting_reminders() TO service_role;

CREATE OR REPLACE FUNCTION public.mastermind_checkin_web(p_meeting_id uuid)
RETURNS jsonb
LANGUAGE sql
SECURITY INVOKER
SET search_path = public
AS $$ SELECT mastermind_private.mastermind_checkin_web(p_meeting_id) $$;
REVOKE ALL ON FUNCTION public.mastermind_checkin_web(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mastermind_checkin_web(uuid) TO authenticated, service_role;