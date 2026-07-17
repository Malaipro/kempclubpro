-- =========================================================
-- Набор C: RPC для CRM карточки участника
-- =========================================================

-- ---------------------------------------------------------
-- 1) get_participant_timeline(_user_id uuid)
--    Единая лента событий по участнику
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_participant_timeline(_user_id uuid)
RETURNS TABLE(
  event_type  text,
  event_time  timestamptz,
  title       text,
  description text,
  author_name text,
  metadata    jsonb
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY

  -- 1. Смены статуса
  SELECT
    'status_change'::text AS event_type,
    psh.changed_at        AS event_time,
    'Смена статуса'::text AS title,
    format('%s → %s', psh.old_status::text, psh.new_status::text) AS description,
    COALESCE(a.full_name, a.email, 'Система')::text AS author_name,
    jsonb_build_object(
      'old_status', psh.old_status::text,
      'new_status', psh.new_status::text,
      'reason', psh.reason
    ) AS metadata
  FROM participant_status_history psh
  LEFT JOIN profiles a ON a.user_id = psh.changed_by
  WHERE psh.user_id = _user_id

  UNION ALL

  -- 2. Заметки админов
  SELECT
    'note'::text          AS event_type,
    pn.created_at         AS event_time,
    'Заметка администратора'::text AS title,
    pn.note               AS description,
    COALESCE(a.full_name, a.email, 'Админ')::text AS author_name,
    jsonb_build_object(
      'note_id', pn.id,
      'note_type', pn.note_type
    ) AS metadata
  FROM participant_notes pn
  LEFT JOIN profiles a ON a.user_id = pn.created_by
  WHERE pn.user_id = _user_id

  UNION ALL

  -- 3. Аудит профиля
  SELECT
    'profile_audit'::text AS event_type,
    pal.changed_at        AS event_time,
    'Изменение профиля'::text AS title,
    format('Поле: %s', pal.field_name) AS description,
    COALESCE(a.full_name, a.email, 'Система')::text AS author_name,
    jsonb_build_object(
      'field_name', pal.field_name,
      'old_value', pal.old_value,
      'new_value', pal.new_value
    ) AS metadata
  FROM profiles_audit_log pal
  LEFT JOIN profiles a ON a.user_id = pal.changed_by
  WHERE pal.user_id = _user_id

  UNION ALL

  -- 4. Аудит договора
  SELECT
    'contract_audit'::text AS event_type,
    cal.changed_at         AS event_time,
    'Изменение договора'::text AS title,
    format('Поле: %s', cal.field_name) AS description,
    COALESCE(a.full_name, a.email, 'Система')::text AS author_name,
    jsonb_build_object(
      'field_name', cal.field_name,
      'old_value', cal.old_value,
      'new_value', cal.new_value
    ) AS metadata
  FROM contract_data_audit_log cal
  LEFT JOIN profiles a ON a.user_id = cal.changed_by
  WHERE cal.user_id = _user_id

  UNION ALL

  -- 5. Записи на события календаря
  SELECT
    'event_attendance'::text AS event_type,
    COALESCE(sp.attended_at, sp.registered_at, se.start_time) AS event_time,
    se.title AS title,
    COALESCE(se.description, '') AS description,
    COALESCE(e.full_name, e.email, '')::text AS author_name,
    jsonb_build_object(
      'event_id', se.id,
      'attended', sp.attended,
      'registered_at', sp.registered_at
    ) AS metadata
  FROM schedule_participants sp
  JOIN schedule_events se ON se.id = sp.event_id
  LEFT JOIN profiles e ON e.user_id = se.created_by
  WHERE sp.user_id = _user_id

  ORDER BY event_time DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_participant_timeline(uuid) TO authenticated;

-- ---------------------------------------------------------
-- 2) get_broadcast_audience(filter_json jsonb)
--    Аудитория для массовой рассылки с фильтрами
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_broadcast_audience(filter_json jsonb)
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
  -- Парсим фильтры из JSON; пустой массив или null = "без фильтра"
  v_statuses   := array(SELECT jsonb_array_elements_text(COALESCE(filter_json->'statuses',   '[]'::jsonb)));
  v_stream_ids := array(SELECT jsonb_array_elements_text(COALESCE(filter_json->'stream_ids', '[]'::jsonb)));
  v_tag_ids    := array(SELECT jsonb_array_elements_text(COALESCE(filter_json->'tag_ids',    '[]'::jsonb)));

  RETURN QUERY
  WITH filtered_profiles AS (
    SELECT DISTINCT p.user_id
    FROM profiles p
    LEFT JOIN profile_tags pt ON pt.profile_user_id = p.user_id
    WHERE
      -- Только одобренные участники с привязанным Telegram
      p.telegram_id IS NOT NULL
      AND p.approved = true

      -- Фильтр по статусу (опционально)
      AND (
        array_length(v_statuses, 1) IS NULL
        OR p.participant_status::text = ANY(v_statuses)
      )

      -- Фильтр по потоку (опционально)
      AND (
        array_length(v_stream_ids, 1) IS NULL
        OR p.current_stream_id = ANY(v_stream_ids::uuid[])
      )

      -- Фильтр по тегам (опционально)
      AND (
        array_length(v_tag_ids, 1) IS NULL
        OR pt.tag_id = ANY(v_tag_ids::uuid[])
      )
  )
  SELECT
    COUNT(*)::bigint        AS total_count,
    array_agg(user_id)      AS user_ids
  FROM filtered_profiles;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_broadcast_audience(jsonb) TO authenticated;