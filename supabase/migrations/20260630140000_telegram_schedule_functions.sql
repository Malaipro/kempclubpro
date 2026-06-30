-- Telegram Mini App: schedule read + booking
--
-- 1. UNIQUE index on schedule_participants(schedule_id, user_id)
--    — защита от дублей на уровне БД (нужен для ON CONFLICT ниже)
-- 2. get_schedule_for_user  — читает расписание для участника по telegram_id
-- 3. book_schedule_session  — атомарная запись на занятие по telegram_id

-- ────────────────────────────────────────────────────────────────
-- 1. Уникальный индекс (идемпотентный)
-- ────────────────────────────────────────────────────────────────
CREATE UNIQUE INDEX IF NOT EXISTS uq_schedule_participants_user
  ON public.schedule_participants(schedule_id, user_id);


-- ────────────────────────────────────────────────────────────────
-- 2. get_schedule_for_user
-- ────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_schedule_for_user(
  p_telegram_id TEXT,
  p_from        TIMESTAMPTZ DEFAULT now(),
  p_days        INT         DEFAULT 7
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id   UUID;
  v_stream_id UUID;
  v_status    TEXT;
BEGIN
  -- Ищем профиль по telegram_id (тот же паттерн что в get_participant_full_state_by_telegram)
  SELECT p.user_id,
         p.current_stream_id,
         p.participant_status::TEXT
  INTO   v_user_id, v_stream_id, v_status
  FROM   profiles p
  WHERE  p.telegram_id = p_telegram_id
  LIMIT  1;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('found', false, 'error', 'not_linked');
  END IF;

  RETURN jsonb_build_object(
    'found',     true,
    'stream_id', v_stream_id,
    'status',    v_status,
    'schedule',  (
      SELECT COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'id',               s.id,
            'title',            s.title,
            'activity_type',    s.activity_type,
            'description',      s.description,
            'start_time',       s.start_time,
            'end_time',         s.end_time,
            'location',         s.location,
            'color',            s.color,
            'max_participants', s.max_participants,
            'booked_count',     (
              SELECT COUNT(*)
              FROM   schedule_participants sp2
              WHERE  sp2.schedule_id = s.id
            ),
            'instructor', CASE
              WHEN t.id IS NULL THEN NULL
              ELSE jsonb_build_object('id', t.id, 'name', t.name, 'role', t.role)
            END,
            'booked', EXISTS (
              SELECT 1
              FROM   schedule_participants sp
              WHERE  sp.schedule_id = s.id
                AND  sp.user_id     = v_user_id
            ),
            'attended', (
              SELECT sp.attended
              FROM   schedule_participants sp
              WHERE  sp.schedule_id = s.id
                AND  sp.user_id     = v_user_id
              LIMIT  1
            )
          )
          ORDER BY s.start_time
        ),
        '[]'::jsonb
      )
      FROM   schedules s
      LEFT JOIN trainers t ON t.id = s.instructor_id
      WHERE  s.is_active = true
        AND  s.start_time >= p_from
        AND  s.start_time <  p_from + (p_days || ' days')::INTERVAL
        AND  (
          -- Участники интенсива: видят только занятия своего потока (или без потока)
          (     v_status IN ('intensive_active', 'intensive_completed')
            AND s.schedule_type = 'intensive'
            AND (s.stream_id = v_stream_id OR s.stream_id IS NULL)
          )
          OR
          -- Резиденты клуба и выпускники: видят клубное расписание
          (     v_status IN ('club_resident', 'alumni')
            AND s.schedule_type = 'club'
          )
        )
    )
  );
END;
$$;


-- ────────────────────────────────────────────────────────────────
-- 3. book_schedule_session
-- ────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.book_schedule_session(
  p_telegram_id TEXT,
  p_schedule_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id       UUID;
  v_max_part      INT;
  v_current_count BIGINT;
  v_rows_inserted INT;
BEGIN
  -- Шаг 1: найти профиль по telegram_id
  SELECT user_id INTO v_user_id
  FROM   profiles
  WHERE  telegram_id = p_telegram_id
  LIMIT  1;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('booked', false, 'reason', 'not_linked');
  END IF;

  -- Шаг 2: проверить что занятие существует и активно.
  -- FOR UPDATE блокирует строку до конца транзакции — гарантирует атомарность
  -- подсчёта мест и последующего INSERT (исключает race condition).
  SELECT max_participants INTO v_max_part
  FROM   schedules
  WHERE  id = p_schedule_id
    AND  is_active = true
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('booked', false, 'reason', 'schedule_not_found');
  END IF;

  -- Шаг 3: проверить наполненность (только если лимит задан)
  IF v_max_part IS NOT NULL THEN
    SELECT COUNT(*) INTO v_current_count
    FROM   schedule_participants
    WHERE  schedule_id = p_schedule_id;

    IF v_current_count >= v_max_part THEN
      RETURN jsonb_build_object(
        'booked',           false,
        'reason',           'session_full',
        'current_count',    v_current_count,
        'max_participants', v_max_part
      );
    END IF;
  END IF;

  -- Шаг 4: атомарный INSERT — UNIQUE index (schedule_id, user_id) защищает от race condition
  INSERT INTO schedule_participants (schedule_id, user_id)
  VALUES (p_schedule_id, v_user_id)
  ON CONFLICT (schedule_id, user_id) DO NOTHING;

  GET DIAGNOSTICS v_rows_inserted = ROW_COUNT;

  IF v_rows_inserted = 0 THEN
    RETURN jsonb_build_object('booked', false, 'reason', 'already_booked');
  END IF;

  RETURN jsonb_build_object('booked', true);
END;
$$;
