-- PREPARED ONLY. Apply only after a separate production approval and a fresh schema review.
-- Persists recurring free club trainings. One RPC call is one PostgreSQL transaction.
\set ON_ERROR_STOP on
BEGIN;

CREATE TABLE public.club_recurring_series (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identity_key text NOT NULL UNIQUE,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  frequency text NOT NULL CHECK (frequency IN ('weekly', 'monthly')),
  first_date date NOT NULL,
  until_date date NOT NULL CHECK (until_date >= first_date),
  local_start_time time without time zone NOT NULL,
  local_end_time time without time zone NOT NULL CHECK (local_end_time > local_start_time),
  title text NOT NULL,
  club_kind text NOT NULL CHECK (club_kind IN ('training_bjj', 'training_ofp', 'training_kick')),
  description text,
  location text,
  normalized_location text NOT NULL,
  color text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.club_recurring_occurrences (
  occurrence_key text PRIMARY KEY,
  series_id uuid NOT NULL REFERENCES public.club_recurring_series(id) ON DELETE RESTRICT,
  occurrence_date date NOT NULL,
  original_start timestamptz NOT NULL,
  original_end timestamptz NOT NULL,
  original_location text NOT NULL,
  original_week_anchor date NOT NULL,
  schedule_id uuid REFERENCES public.schedules(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (series_id, occurrence_date)
);

CREATE UNIQUE INDEX club_recurring_occurrences_schedule_unique_idx
  ON public.club_recurring_occurrences(schedule_id)
  WHERE schedule_id IS NOT NULL;
CREATE INDEX club_recurring_schedule_match_idx
  ON public.schedules(start_time, end_time)
  WHERE schedule_type = 'club';

ALTER TABLE public.club_recurring_series ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_recurring_occurrences ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.club_recurring_series, public.club_recurring_occurrences FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.club_recurring_clean_location(p_location text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT btrim(regexp_replace(COALESCE(p_location, ''), '[[:space:]]+', ' ', 'g'))
$$;

CREATE FUNCTION public.club_recurring_normalize_location(p_location text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT lower(translate(
    public.club_recurring_clean_location(p_location),
    'АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ',
    'абвгдеёжзийклмнопрстуфхцчшщъыьэюя'
  ))
$$;

CREATE FUNCTION public.club_recurring_occurrence_key(
  p_kind text,
  p_start timestamptz,
  p_end timestamptz,
  p_location text
)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT jsonb_build_array(
    p_kind,
    extract(epoch FROM p_start),
    extract(epoch FROM p_end),
    public.club_recurring_normalize_location(p_location)
  )::text
$$;

CREATE FUNCTION public.club_recurring_training_kind(p_title text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT CASE lower(translate(
    trim(COALESCE(p_title, '')),
    'АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ',
    'абвгдеёжзийклмнопрстуфхцчшщъыьэюя'
  ))
    WHEN 'bjj' THEN 'training_bjj'
    WHEN 'бжж' THEN 'training_bjj'
    WHEN 'офп' THEN 'training_ofp'
    WHEN 'кикбоксинг' THEN 'training_kick'
    ELSE NULL
  END
$$;

CREATE FUNCTION public.club_recurring_can_manage(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles roles
    WHERE roles.user_id = p_user_id
      AND roles.role::text IN ('admin', 'super_admin', 'trainer')
  )
$$;

CREATE FUNCTION public.club_recurring_plan_dates(
  p_first_date date,
  p_until_date date,
  p_frequency text
)
RETURNS TABLE(occurrence_date date, skipped_month date)
LANGUAGE plpgsql
IMMUTABLE
SET search_path = ''
AS $$
DECLARE
  v_cursor date;
  v_last_day date;
  v_months integer;
  v_count integer;
  v_offset integer;
BEGIN
  IF p_first_date IS NULL OR p_until_date IS NULL OR p_until_date < p_first_date THEN
    RAISE EXCEPTION 'club_recurring_invalid_dates';
  END IF;
  IF p_frequency NOT IN ('weekly', 'monthly') THEN
    RAISE EXCEPTION 'club_recurring_invalid_frequency';
  END IF;

  IF p_frequency = 'weekly' THEN
    v_count := ((p_until_date - p_first_date) / 7) + 1;
    IF v_count > 520 THEN RAISE EXCEPTION 'club_recurring_too_many_occurrences'; END IF;
    FOR v_offset IN 0..(v_count - 1) LOOP
      occurrence_date := p_first_date + (v_offset * 7);
      skipped_month := NULL;
      RETURN NEXT;
    END LOOP;
    RETURN;
  END IF;

  v_months := ((extract(year FROM p_until_date)::integer - extract(year FROM p_first_date)::integer) * 12)
    + extract(month FROM p_until_date)::integer - extract(month FROM p_first_date)::integer + 1;
  IF v_months > 520 THEN RAISE EXCEPTION 'club_recurring_too_many_occurrences'; END IF;
  v_cursor := date_trunc('month', p_first_date)::date;
  WHILE v_cursor <= p_until_date LOOP
    v_last_day := (v_cursor + interval '1 month - 1 day')::date;
    IF extract(day FROM p_first_date)::integer <= extract(day FROM v_last_day)::integer THEN
      occurrence_date := make_date(
        extract(year FROM v_cursor)::integer,
        extract(month FROM v_cursor)::integer,
        extract(day FROM p_first_date)::integer
      );
      skipped_month := NULL;
      IF occurrence_date BETWEEN p_first_date AND p_until_date THEN RETURN NEXT; END IF;
    ELSE
      occurrence_date := NULL;
      skipped_month := v_cursor;
      RETURN NEXT;
    END IF;
    v_cursor := (v_cursor + interval '1 month')::date;
  END LOOP;
END
$$;

CREATE FUNCTION public.club_recurring_series_preview(
  p_title text,
  p_start_date date,
  p_until_date date,
  p_frequency text,
  p_start_time time without time zone,
  p_end_time time without time zone,
  p_location text
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
SET TimeZone = 'Europe/Moscow'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_kind text := public.club_recurring_training_kind(p_title);
  v_location text := public.club_recurring_normalize_location(p_location);
  v_plan record;
  v_start timestamptz;
  v_end timestamptz;
  v_week date;
  v_key text;
  v_status text;
  v_schedule_id uuid;
  v_schedule_active boolean;
  v_schedule_start timestamptz;
  v_schedule_end timestamptz;
  v_schedule_location text;
  v_schedule_occurrence_key text;
  v_occurrences jsonb := '[]'::jsonb;
  v_skipped jsonb := '[]'::jsonb;
  v_total integer := 0;
  v_existing integer := 0;
  v_occupied integer := 0;
BEGIN
  IF v_uid IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated'); END IF;
  IF NOT public.club_recurring_can_manage(v_uid) THEN RETURN jsonb_build_object('ok', false, 'error', 'forbidden'); END IF;
  IF v_kind IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'not_free_club_training'); END IF;
  IF p_start_time IS NULL OR p_end_time IS NULL OR p_end_time <= p_start_time THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_time');
  END IF;

  FOR v_plan IN SELECT * FROM public.club_recurring_plan_dates(p_start_date, p_until_date, p_frequency) LOOP
    IF v_plan.skipped_month IS NOT NULL THEN
      v_skipped := v_skipped || jsonb_build_array(to_char(v_plan.skipped_month, 'YYYY-MM'));
      CONTINUE;
    END IF;

    v_start := (v_plan.occurrence_date + p_start_time) AT TIME ZONE 'Europe/Moscow';
    v_end := (v_plan.occurrence_date + p_end_time) AT TIME ZONE 'Europe/Moscow';
    v_week := date_trunc('week', v_plan.occurrence_date::timestamp)::date;
    v_key := public.club_recurring_occurrence_key(v_kind, v_start, v_end, v_location);
    v_schedule_id := NULL;
    v_schedule_active := NULL;
    v_schedule_start := NULL;
    v_schedule_end := NULL;
    v_schedule_location := NULL;
    v_schedule_occurrence_key := NULL;

    SELECT occurrence.schedule_id, schedule.is_active, schedule.start_time, schedule.end_time,
           public.club_recurring_normalize_location(schedule.location)
      INTO v_schedule_id, v_schedule_active, v_schedule_start, v_schedule_end, v_schedule_location
    FROM public.club_recurring_occurrences occurrence
    LEFT JOIN public.schedules schedule ON schedule.id = occurrence.schedule_id
    WHERE occurrence.occurrence_key = v_key;

    IF FOUND THEN
      v_status := CASE
        WHEN v_schedule_id IS NULL OR v_schedule_active IS DISTINCT FROM true THEN 'cancelled'
        WHEN v_schedule_start IS DISTINCT FROM v_start OR v_schedule_end IS DISTINCT FROM v_end OR v_schedule_location IS DISTINCT FROM v_location THEN 'moved'
        ELSE 'existing'
      END;
    ELSE
      SELECT schedule.id, schedule.is_active, schedule.start_time, schedule.end_time,
             public.club_recurring_normalize_location(schedule.location)
        INTO v_schedule_id, v_schedule_active, v_schedule_start, v_schedule_end, v_schedule_location
      FROM public.schedules schedule
      WHERE schedule.schedule_type::text = 'club'
        AND COALESCE(schedule.booking_mode, 'free') = 'free'
        AND COALESCE(
          schedule.club_kind,
          public.club_recurring_training_kind(schedule.activity_type),
          public.club_recurring_training_kind(schedule.title)
        ) = v_kind
        AND schedule.start_time = v_start
        AND schedule.end_time = v_end
        AND public.club_recurring_normalize_location(schedule.location) = v_location
      ORDER BY schedule.is_active DESC, schedule.created_at, schedule.id
      LIMIT 1;
      IF v_schedule_id IS NULL THEN
        v_status := 'new';
      ELSE
        SELECT occurrence.occurrence_key
          INTO v_schedule_occurrence_key
        FROM public.club_recurring_occurrences occurrence
        WHERE occurrence.schedule_id = v_schedule_id;

        v_status := CASE
          WHEN v_schedule_occurrence_key IS NOT NULL AND v_schedule_occurrence_key <> v_key THEN 'occupied_moved'
          WHEN v_schedule_active IS TRUE THEN 'existing'
          ELSE 'cancelled'
        END;
      END IF;
    END IF;

    v_total := v_total + 1;
    IF v_status <> 'new' THEN v_existing := v_existing + 1; END IF;
    IF v_status = 'occupied_moved' THEN v_occupied := v_occupied + 1; END IF;
    v_occurrences := v_occurrences || jsonb_build_array(jsonb_build_object(
      'date', v_plan.occurrence_date,
      'start', v_start,
      'end', v_end,
      'week', v_week,
      'status', v_status,
      'schedule_id', v_schedule_id
    ));
  END LOOP;

  RETURN jsonb_build_object(
    'ok', true,
    'total', v_total,
    'existing', v_existing,
    'occupied', v_occupied,
    'create', v_total - v_existing,
    'occurrences', v_occurrences,
    'skipped', v_skipped
  );
END
$$;

CREATE FUNCTION public.club_recurring_series_save(
  p_title text,
  p_description text,
  p_color text,
  p_start_date date,
  p_until_date date,
  p_frequency text,
  p_start_time time without time zone,
  p_end_time time without time zone,
  p_location text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
SET TimeZone = 'Europe/Moscow'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_kind text := public.club_recurring_training_kind(p_title);
  v_location text := public.club_recurring_normalize_location(p_location);
  v_identity_key text;
  v_series_id uuid;
  v_plan record;
  v_start timestamptz;
  v_end timestamptz;
  v_week date;
  v_occurrence_key text;
  v_claimed text;
  v_schedule_id uuid;
  v_schedule_active boolean;
  v_schedule_start timestamptz;
  v_schedule_end timestamptz;
  v_schedule_location text;
  v_schedule_occurrence_key text;
  v_status text;
  v_created integer := 0;
  v_existing integer := 0;
  v_cancelled integer := 0;
  v_moved integer := 0;
  v_occupied integer := 0;
  v_occurrences jsonb := '[]'::jsonb;
  v_skipped jsonb := '[]'::jsonb;
BEGIN
  IF v_uid IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated'); END IF;
  IF NOT public.club_recurring_can_manage(v_uid) THEN RETURN jsonb_build_object('ok', false, 'error', 'forbidden'); END IF;
  IF v_kind IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'not_free_club_training'); END IF;
  IF p_start_time IS NULL OR p_end_time IS NULL OR p_end_time <= p_start_time THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_time');
  END IF;

  -- The identity deliberately excludes until_date: extending the same series reuses its ledger.
  v_identity_key := jsonb_build_array(v_kind, p_start_date, p_frequency, p_start_time, p_end_time, v_location)::text;
  PERFORM pg_advisory_xact_lock(hashtextextended(v_identity_key, 0));

  INSERT INTO public.club_recurring_series(
    identity_key, created_by, frequency, first_date, until_date, local_start_time, local_end_time,
    title, club_kind, description, location, normalized_location, color
  ) VALUES (
    v_identity_key, v_uid, p_frequency, p_start_date, p_until_date, p_start_time, p_end_time,
    p_title, v_kind, p_description, NULLIF(public.club_recurring_clean_location(p_location), ''), v_location, p_color
  )
  ON CONFLICT (identity_key) DO UPDATE SET
    until_date = GREATEST(public.club_recurring_series.until_date, EXCLUDED.until_date),
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    color = EXCLUDED.color,
    updated_at = now()
  RETURNING id INTO v_series_id;

  FOR v_plan IN SELECT * FROM public.club_recurring_plan_dates(p_start_date, p_until_date, p_frequency) LOOP
    IF v_plan.skipped_month IS NOT NULL THEN
      v_skipped := v_skipped || jsonb_build_array(to_char(v_plan.skipped_month, 'YYYY-MM'));
      CONTINUE;
    END IF;

    v_start := (v_plan.occurrence_date + p_start_time) AT TIME ZONE 'Europe/Moscow';
    v_end := (v_plan.occurrence_date + p_end_time) AT TIME ZONE 'Europe/Moscow';
    v_week := date_trunc('week', v_plan.occurrence_date::timestamp)::date;
    v_occurrence_key := public.club_recurring_occurrence_key(v_kind, v_start, v_end, v_location);
    v_claimed := NULL;
    v_schedule_id := NULL;
    v_schedule_active := NULL;
    v_schedule_start := NULL;
    v_schedule_end := NULL;
    v_schedule_location := NULL;
    v_schedule_occurrence_key := NULL;

    SELECT occurrence.schedule_id, schedule.is_active, schedule.start_time, schedule.end_time,
           public.club_recurring_normalize_location(schedule.location)
      INTO v_schedule_id, v_schedule_active, v_schedule_start, v_schedule_end, v_schedule_location
    FROM public.club_recurring_occurrences occurrence
    LEFT JOIN public.schedules schedule ON schedule.id = occurrence.schedule_id
    WHERE occurrence.occurrence_key = v_occurrence_key;

    IF FOUND THEN
      v_status := CASE
        WHEN v_schedule_id IS NULL OR v_schedule_active IS DISTINCT FROM true THEN 'cancelled'
        WHEN v_schedule_start IS DISTINCT FROM v_start OR v_schedule_end IS DISTINCT FROM v_end OR v_schedule_location IS DISTINCT FROM v_location THEN 'moved'
        ELSE 'existing'
      END;
      v_existing := v_existing + 1;
      IF v_status = 'cancelled' THEN v_cancelled := v_cancelled + 1; END IF;
      IF v_status = 'moved' THEN v_moved := v_moved + 1; END IF;
      v_occurrences := v_occurrences || jsonb_build_array(jsonb_build_object(
        'date', v_plan.occurrence_date,
        'status', v_status,
        'schedule_id', v_schedule_id
      ));
      CONTINUE;
    END IF;

    SELECT schedule.id, schedule.is_active, schedule.start_time, schedule.end_time,
           public.club_recurring_normalize_location(schedule.location)
      INTO v_schedule_id, v_schedule_active, v_schedule_start, v_schedule_end, v_schedule_location
    FROM public.schedules schedule
    WHERE schedule.schedule_type::text = 'club'
      AND COALESCE(schedule.booking_mode, 'free') = 'free'
      AND COALESCE(
        schedule.club_kind,
        public.club_recurring_training_kind(schedule.activity_type),
        public.club_recurring_training_kind(schedule.title)
      ) = v_kind
      AND schedule.start_time = v_start
      AND schedule.end_time = v_end
      AND public.club_recurring_normalize_location(schedule.location) = v_location
    ORDER BY schedule.is_active DESC, schedule.created_at, schedule.id
    LIMIT 1
    FOR UPDATE;

    IF v_schedule_id IS NOT NULL THEN
      SELECT occurrence.occurrence_key
        INTO v_schedule_occurrence_key
      FROM public.club_recurring_occurrences occurrence
      WHERE occurrence.schedule_id = v_schedule_id;

      IF v_schedule_occurrence_key IS NOT NULL AND v_schedule_occurrence_key <> v_occurrence_key THEN
        v_existing := v_existing + 1;
        v_occupied := v_occupied + 1;
        v_occurrences := v_occurrences || jsonb_build_array(jsonb_build_object(
          'date', v_plan.occurrence_date,
          'status', 'occupied_moved',
          'schedule_id', v_schedule_id
        ));
        CONTINUE;
      END IF;
    END IF;

    INSERT INTO public.club_recurring_occurrences(
      occurrence_key, series_id, occurrence_date, original_start, original_end,
      original_location, original_week_anchor
    ) VALUES (
      v_occurrence_key, v_series_id, v_plan.occurrence_date, v_start, v_end, v_location, v_week
    )
    ON CONFLICT DO NOTHING
    RETURNING occurrence_key INTO v_claimed;

    IF v_claimed IS NULL THEN
      SELECT occurrence.schedule_id, schedule.is_active, schedule.start_time, schedule.end_time,
             public.club_recurring_normalize_location(schedule.location)
        INTO v_schedule_id, v_schedule_active, v_schedule_start, v_schedule_end, v_schedule_location
      FROM public.club_recurring_occurrences occurrence
      LEFT JOIN public.schedules schedule ON schedule.id = occurrence.schedule_id
      WHERE occurrence.occurrence_key = v_occurrence_key
         OR (occurrence.series_id = v_series_id AND occurrence.occurrence_date = v_plan.occurrence_date)
      ORDER BY (occurrence.occurrence_key = v_occurrence_key) DESC
      LIMIT 1;

      v_status := CASE
        WHEN v_schedule_id IS NULL OR v_schedule_active IS DISTINCT FROM true THEN 'cancelled'
        WHEN v_schedule_start IS DISTINCT FROM v_start OR v_schedule_end IS DISTINCT FROM v_end OR v_schedule_location IS DISTINCT FROM v_location THEN 'moved'
        ELSE 'existing'
      END;
      v_existing := v_existing + 1;
      IF v_status = 'cancelled' THEN v_cancelled := v_cancelled + 1; END IF;
      IF v_status = 'moved' THEN v_moved := v_moved + 1; END IF;
      v_occurrences := v_occurrences || jsonb_build_array(jsonb_build_object(
        'date', v_plan.occurrence_date,
        'status', v_status,
        'schedule_id', v_schedule_id
      ));
      CONTINUE;
    END IF;

    IF v_schedule_id IS NOT NULL THEN
      UPDATE public.schedules
      SET club_kind = COALESCE(club_kind, v_kind),
          week_anchor = COALESCE(week_anchor, v_week)
      WHERE id = v_schedule_id;
      v_status := CASE WHEN v_schedule_active IS TRUE THEN 'existing' ELSE 'cancelled' END;
      v_existing := v_existing + 1;
      IF v_status = 'cancelled' THEN v_cancelled := v_cancelled + 1; END IF;
    ELSE
      INSERT INTO public.schedules(
        title, description, activity_type, start_time, end_time, instructor_id,
        max_participants, location, is_active, color, schedule_type, stream_id,
        mastermind_group_id, club_kind, week_anchor, booking_mode
      ) VALUES (
        p_title, p_description, p_title, v_start, v_end, NULL,
        NULL, NULLIF(public.club_recurring_clean_location(p_location), ''), true, p_color, 'club', NULL,
        NULL, v_kind, v_week, 'free'
      )
      RETURNING id INTO v_schedule_id;
      v_status := 'created';
      v_created := v_created + 1;
    END IF;

    UPDATE public.club_recurring_occurrences
    SET schedule_id = v_schedule_id
    WHERE occurrence_key = v_occurrence_key;

    v_occurrences := v_occurrences || jsonb_build_array(jsonb_build_object(
      'date', v_plan.occurrence_date,
      'status', v_status,
      'schedule_id', v_schedule_id
    ));
  END LOOP;

  RETURN jsonb_build_object(
    'ok', true,
    'series_id', v_series_id,
    'created', v_created,
    'existing', v_existing,
    'cancelled', v_cancelled,
    'moved', v_moved,
    'occupied', v_occupied,
    'total', v_created + v_existing,
    'occurrences', v_occurrences,
    'skipped', v_skipped
  );
END
$$;

REVOKE ALL ON FUNCTION public.club_recurring_clean_location(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.club_recurring_normalize_location(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.club_recurring_occurrence_key(text, timestamptz, timestamptz, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.club_recurring_training_kind(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.club_recurring_can_manage(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.club_recurring_plan_dates(date, date, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.club_recurring_series_preview(text, date, date, text, time without time zone, time without time zone, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.club_recurring_series_save(text, text, text, date, date, text, time without time zone, time without time zone, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.club_recurring_series_preview(text, date, date, text, time without time zone, time without time zone, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.club_recurring_series_save(text, text, text, date, date, text, time without time zone, time without time zone, text) TO authenticated;

COMMIT;
