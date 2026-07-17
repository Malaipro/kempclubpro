DROP FUNCTION IF EXISTS public.get_participant_timeline(uuid);
DROP FUNCTION IF EXISTS public.get_broadcast_audience(jsonb);

CREATE FUNCTION public.get_participant_timeline(_user_id uuid)
RETURNS TABLE (
  event_type   text,
  event_time   timestamptz,
  actor_id     uuid,
  payload      jsonb
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: admin only';
  END IF;

  RETURN QUERY
  SELECT
    'status_change'::text,
    h.changed_at,
    h.changed_by,
    jsonb_build_object(
      'old_status', h.old_status,
      'new_status', h.new_status,
      'stream_id',  h.stream_id
    )
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

  ORDER BY 2 DESC;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_participant_timeline(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_participant_timeline(uuid) TO authenticated;

CREATE FUNCTION public.get_broadcast_audience(filter_json jsonb)
RETURNS TABLE(total_count bigint, user_ids uuid[])
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_statuses   text[];
  v_stream_ids uuid[];
  v_tag_ids    uuid[];
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: admin only';
  END IF;

  v_statuses   := array(SELECT jsonb_array_elements_text(COALESCE(filter_json->'statuses',   '[]'::jsonb)));
  v_stream_ids := array(SELECT jsonb_array_elements_text(COALESCE(filter_json->'stream_ids', '[]'::jsonb)));
  v_tag_ids    := array(SELECT jsonb_array_elements_text(COALESCE(filter_json->'tag_ids',    '[]'::jsonb)));

  RETURN QUERY
  WITH filtered_profiles AS (
    SELECT DISTINCT p.user_id
    FROM profiles p
    LEFT JOIN profile_tags pt ON pt.profile_user_id = p.user_id
    WHERE p.telegram_id IS NOT NULL
      AND p.approved = true
      AND (array_length(v_statuses, 1) IS NULL
           OR p.participant_status::text = ANY(v_statuses))
      AND (array_length(v_stream_ids, 1) IS NULL
           OR p.current_stream_id = ANY(v_stream_ids::uuid[]))
      AND (array_length(v_tag_ids, 1) IS NULL
           OR pt.tag_id = ANY(v_tag_ids::uuid[]))
  )
  SELECT COUNT(*)::bigint, array_agg(user_id)
  FROM filtered_profiles;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_broadcast_audience(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_broadcast_audience(jsonb) TO authenticated;