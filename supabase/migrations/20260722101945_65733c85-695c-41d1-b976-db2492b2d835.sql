CREATE OR REPLACE FUNCTION public.get_participant_timeline(_user_id uuid)
 RETURNS TABLE(event_type text, event_time timestamp with time zone, actor_id uuid, payload jsonb)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _rows int;
  _current_status text;
  _updated_at timestamptz;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: admin only';
  END IF;

  RETURN QUERY
  SELECT * FROM (
    SELECT
      'status_change'::text AS event_type,
      h.changed_at AS event_time,
      h.changed_by AS actor_id,
      jsonb_build_object(
        'old_status', h.old_status,
        'new_status', h.new_status,
        'stream_id',  h.stream_id
      ) AS payload
    FROM participant_status_history h
    WHERE h.profile_user_id = _user_id

    UNION ALL
    SELECT
      'note'::text,
      n.created_at,
      n.author_id,
      jsonb_build_object('note', n.note)
    FROM participant_notes n
    WHERE n.profile_user_id = _user_id

    UNION ALL
    SELECT
      'audit'::text,
      a.timestamp,
      a.user_id,
      jsonb_build_object(
        'action',     a.action,
        'table_name', a.table_name,
        'record_id',  a.record_id
      )
    FROM audit_log a
    WHERE a.record_id = _user_id

    UNION ALL
    SELECT
      'application'::text,
      cs.created_at,
      cs.processed_by,
      jsonb_build_object(
        'phone',         cs.phone,
        'name',          cs.name,
        'course',        cs.course,
        'social',        cs.social,
        'referral_code', COALESCE(cs.referral_code, cs.ref_code),
        'status',        cs.status,
        'stream_id',     cs.stream_id,
        'submission_id', cs.id
      )
    FROM contact_submissions cs
    WHERE cs.enrolled_user_id = _user_id
  ) t
  ORDER BY t.event_time DESC;

  GET DIAGNOSTICS _rows = ROW_COUNT;

  IF _rows = 0 THEN
    SELECT p.participant_status::text, p.updated_at
      INTO _current_status, _updated_at
    FROM profiles p
    WHERE p.user_id = _user_id
    LIMIT 1;

    IF _current_status IS NOT NULL THEN
      RETURN QUERY SELECT
        'current_status'::text,
        COALESCE(_updated_at, now()),
        NULL::uuid,
        jsonb_build_object('status', _current_status);
    END IF;
  END IF;
END;
$function$;