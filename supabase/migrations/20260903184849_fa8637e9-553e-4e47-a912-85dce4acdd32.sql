CREATE OR REPLACE FUNCTION public.get_public_rating_breakdown(p_user_ids uuid[])
RETURNS TABLE (user_id uuid, category text, points numeric)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
  v_stream RECORD;
  v_days INT;
  v_checkins INT;
  v_scheduled INT;
  v_hw_submitted INT;
  v_hw_total INT;
  v_journal_days INT;
  v_pyramid_a NUMERIC;
  v_pyramid_b NUMERIC;
  v_count INT;
  v_val NUMERIC;
BEGIN
  FOR r IN
    SELECT p.user_id AS uid, p.current_stream_id AS sid
    FROM profiles p
    WHERE p.user_id = ANY(p_user_ids)
      AND public.is_public_participant(p.user_id)
      AND p.current_stream_id IS NOT NULL
  LOOP
    SELECT start_date, end_date INTO v_stream FROM streams WHERE id = r.sid;
    CONTINUE WHEN NOT FOUND;

    v_days := GREATEST(1, LEAST(CURRENT_DATE, v_stream.end_date) - v_stream.start_date + 1);

    -- Посещение (макс 40)
    SELECT COUNT(*) INTO v_checkins FROM activity_checkins
      WHERE activity_checkins.user_id = r.uid AND stream_id = r.sid;
    SELECT COUNT(*) INTO v_scheduled FROM schedules
      WHERE stream_id = r.sid AND is_active = true
        AND start_time <= (now() AT TIME ZONE 'Europe/Moscow');
    IF v_scheduled > 0 THEN
      v_val := LEAST(40, ROUND(40.0 * v_checkins / v_scheduled, 1));
      IF v_val > 0 THEN
        user_id := r.uid; category := 'attendance'; points := v_val; RETURN NEXT;
      END IF;
    END IF;

    -- Тактика (макс 4)
    SELECT COUNT(*) INTO v_count FROM tactical_sessions
      WHERE tactical_sessions.user_id = r.uid AND verified = true
        AND created_at >= v_stream.start_date;
    v_val := LEAST(4, v_count * 2);
    IF v_val > 0 THEN
      user_id := r.uid; category := 'tactics'; points := v_val; RETURN NEXT;
    END IF;

    -- ДЗ (макс 12)
    SELECT COUNT(*) INTO v_hw_total FROM homework_assignments
      WHERE stream_id = r.sid AND is_active = true
        AND (target_user_id IS NULL OR target_user_id = r.uid);
    SELECT COUNT(*) INTO v_hw_submitted
      FROM homework_submissions hs
      JOIN homework_assignments ha ON ha.id = hs.assignment_id
      WHERE hs.user_id = r.uid AND ha.stream_id = r.sid
        AND hs.status IN ('approved', 'pending');
    IF v_hw_total > 0 THEN
      v_val := LEAST(12, ROUND(12.0 * v_hw_submitted / v_hw_total, 1));
      IF v_val > 0 THEN
        user_id := r.uid; category := 'homework'; points := v_val; RETURN NEXT;
      END IF;
    END IF;

    -- Ежедневник (макс 8)
    SELECT COUNT(DISTINCT entry_date) INTO v_journal_days FROM journal_entries
      WHERE journal_entries.user_id = r.uid
        AND entry_date >= v_stream.start_date
        AND entry_date <= LEAST(CURRENT_DATE, v_stream.end_date);
    v_val := LEAST(8, ROUND(8.0 * v_journal_days / v_days, 1));
    IF v_val > 0 THEN
      user_id := r.uid; category := 'journal'; points := v_val; RETURN NEXT;
    END IF;

    -- Краш-тест BJJ (8)
    IF EXISTS (SELECT 1 FROM crash_tests ct WHERE ct.user_id = r.uid AND ct.passed = true
      AND (ct.test_type ILIKE '%bjj%' OR ct.test_type ILIKE '%бжж%')
      AND ct.test_date >= v_stream.start_date) THEN
      user_id := r.uid; category := 'crash_bjj'; points := 8; RETURN NEXT;
    END IF;

    -- Краш-тест Кикбоксинг (8)
    IF EXISTS (SELECT 1 FROM crash_tests ct WHERE ct.user_id = r.uid AND ct.passed = true
      AND (ct.test_type ILIKE '%kick%' OR ct.test_type ILIKE '%кик%')
      AND ct.test_date >= v_stream.start_date) THEN
      user_id := r.uid; category := 'crash_kick'; points := 8; RETURN NEXT;
    END IF;

    -- Героическая гонка (8)
    IF EXISTS (SELECT 1 FROM hero_races hr WHERE hr.user_id = r.uid AND hr.finished = true
      AND hr.race_date >= v_stream.start_date) THEN
      user_id := r.uid; category := 'hero_race'; points := 8; RETURN NEXT;
    END IF;

    -- Аскезы (макс 5)
    SELECT COUNT(*) INTO v_count FROM ascetic_activities aa
      WHERE aa.user_id = r.uid AND aa.verified = true AND aa.created_at >= v_stream.start_date;
    v_val := LEAST(5, v_count);
    IF v_val > 0 THEN
      user_id := r.uid; category := 'ascetics'; points := v_val; RETURN NEXT;
    END IF;

    -- Рост Пирамиды (макс 7)
    SELECT pyramid_average INTO v_pyramid_a FROM participant_checkpoints pc
      WHERE pc.user_id = r.uid AND pc.stream_id = r.sid AND pc.checkpoint_type = 'A';
    SELECT pyramid_average INTO v_pyramid_b FROM participant_checkpoints pc
      WHERE pc.user_id = r.uid AND pc.stream_id = r.sid AND pc.checkpoint_type = 'B';
    IF v_pyramid_a IS NOT NULL AND v_pyramid_b IS NOT NULL AND v_pyramid_b > v_pyramid_a THEN
      v_val := LEAST(7, ROUND((v_pyramid_b - v_pyramid_a) * 2, 1));
      IF v_val > 0 THEN
        user_id := r.uid; category := 'pyramid'; points := v_val; RETURN NEXT;
      END IF;
    END IF;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.get_public_rating_breakdown(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_rating_breakdown(uuid[]) TO anon, authenticated, service_role;