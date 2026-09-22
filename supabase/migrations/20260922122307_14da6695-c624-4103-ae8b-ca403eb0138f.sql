-- web-app-stage-3: веб-доступ (/app) к разделам
-- Рейтинг / Профиль / Ежедневник / Магазин / Челленджи / Мастермайнд /
-- Пирамида КЭМП / Правила / Точка А-Б
--
-- Принцип тот же, что и на этапе 2: существующие telegram-функции НЕ изменяются.
-- Добавляются новые функции с суффиксом _web, работающие по auth.uid().
-- Нутрициолог в эту миграцию не входит (будет Edge Function отдельным шагом).

-- 1. РЕЙТИНГ -----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_rating_web()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id   UUID := auth.uid();
  v_stream_id UUID;
  v_my        JSONB;
  v_board     JSONB;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('found', false, 'error', 'not_authenticated');
  END IF;

  SELECT p.current_stream_id INTO v_stream_id
  FROM profiles p WHERE p.user_id = v_user_id LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('found', false, 'error', 'profile_not_found');
  END IF;

  SELECT jsonb_build_object(
    'rank_position', p.rank_position,
    'total_points',  COALESCE(l.total_points, p.total_points, 0),
    'breakdown', jsonb_build_object(
      'bjj',          COALESCE(l.bjj_points, 0),
      'kickboxing',   COALESCE(l.kickboxing_points, 0),
      'ofp',          COALESCE(l.ofp_points, 0),
      'theory',       COALESCE(l.theory_points, 0),
      'tactical',     COALESCE(l.tactical_points, 0),
      'nutrition',    COALESCE(l.nutrition_points, 0),
      'kamp_pyramid', COALESCE(l.kamp_pyramid_points, 0),
      'challenges',   COALESCE(l.challenges_points, 0)
    ),
    'attendance', (
      SELECT jsonb_build_object(
        'total',   COALESCE(SUM(t.cnt), 0),
        'by_type', COALESCE(jsonb_agg(
                     jsonb_build_object('activity_type', t.activity_type, 'count', t.cnt)
                     ORDER BY t.activity_type
                   ), '[]'::jsonb)
      )
      FROM (
        SELECT activity_type, COUNT(*) AS cnt
        FROM   public.activity_checkins
        WHERE  user_id = v_user_id
        GROUP BY activity_type
      ) t
    )
  )
  INTO v_my
  FROM   profiles p
  LEFT JOIN leaderboard l ON l.user_id = p.user_id
  WHERE  p.user_id = v_user_id;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'user_id',       x.user_id,
      'display_name',  x.display_name,
      'first_name',    x.first_name,
      'last_name',     x.last_name,
      'avatar_url',    x.avatar_url,
      'rank_position', x.rank_position,
      'total_points',  x.total_points,
      'is_me',         x.user_id = v_user_id
    ) ORDER BY x.rank_position ASC
  ), '[]'::jsonb)
  INTO v_board
  FROM (
    SELECT p2.user_id, p2.display_name, p2.first_name, p2.last_name, p2.avatar_url,
           p2.rank_position, COALESCE(l2.total_points, p2.total_points, 0) AS total_points
    FROM   profiles p2
    LEFT JOIN leaderboard l2 ON l2.user_id = p2.user_id
    WHERE  p2.current_stream_id = v_stream_id
      AND  p2.approved = true
      AND  COALESCE(p2.leaderboard_visible, true) = true
      AND  COALESCE(p2.profile_private, false) = false
      AND  p2.rank_position IS NOT NULL
      AND  p2.user_id NOT IN (
             SELECT ur.user_id FROM user_roles ur WHERE ur.role IN ('admin', 'super_admin')
           )
    ORDER BY p2.rank_position ASC
    LIMIT 10
  ) x;

  RETURN jsonb_build_object('found', true, 'stream_id', v_stream_id,
                            'my', v_my, 'leaderboard', v_board);
END;
$function$;

-- 2. ПРОФИЛЬ -----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_profile_web()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id UUID := auth.uid();
  v_profile JSONB;
  v_cooper  JSONB;
  v_totems  JSONB;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('found', false, 'error', 'not_authenticated');
  END IF;

  SELECT jsonb_build_object(
    'first_name',    p.first_name,
    'last_name',     p.last_name,
    'avatar_url',    p.avatar_url,
    'weight_kg',     p.weight_kg,
    'height_cm',     p.height_cm,
    'date_of_birth', p.date_of_birth
  )
  INTO v_profile
  FROM profiles p WHERE p.user_id = v_user_id;

  IF v_profile IS NULL THEN
    RETURN jsonb_build_object('found', false, 'error', 'profile_not_found');
  END IF;

  SELECT jsonb_build_object(
    'test_date',     c.test_date,
    'total_minutes', c.total_minutes,
    'total_seconds', c.total_seconds,
    'fitness_level', c.fitness_level
  )
  INTO v_cooper
  FROM cooper_test_results c
  WHERE c.user_id = v_user_id
  ORDER BY c.test_date DESC
  LIMIT 1;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', t.id, 'name', t.name, 'discipline', t.discipline,
      'icon_name', t.icon_name, 'icon_color', t.icon_color,
      'assigned_at', ut.assigned_at
    ) ORDER BY ut.assigned_at DESC
  ), '[]'::jsonb)
  INTO v_totems
  FROM user_totems ut
  JOIN totems t ON t.id = ut.totem_id
  WHERE ut.user_id = v_user_id;

  RETURN jsonb_build_object('found', true, 'profile', v_profile,
                            'cooper_test', v_cooper, 'totems', v_totems);
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_profile_web(
  p_weight_kg integer,
  p_height_cm integer,
  p_date_of_birth date
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  UPDATE profiles
  SET weight_kg = p_weight_kg,
      height_cm = p_height_cm,
      date_of_birth = p_date_of_birth
  WHERE user_id = v_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'profile_not_found');
  END IF;

  RETURN jsonb_build_object('ok', true, 'weight_kg', p_weight_kg,
                            'height_cm', p_height_cm, 'date_of_birth', p_date_of_birth);
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_avatar_web(p_avatar_url text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  UPDATE profiles SET avatar_url = p_avatar_url WHERE user_id = v_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'profile_not_found');
  END IF;

  RETURN jsonb_build_object('ok', true, 'avatar_url', p_avatar_url);
END;
$function$;

-- 3. ЕЖЕДНЕВНИК --------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_journal_web(p_date date DEFAULT CURRENT_DATE)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id  UUID := auth.uid();
  v_day_type TEXT;
  v_prompts  JSONB;
  v_entry_id UUID;
  v_entry    JSONB;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('found', false, 'error', 'not_authenticated');
  END IF;

  v_day_type := CASE EXTRACT(DOW FROM p_date)
                  WHEN 1 THEN 'monday'
                  WHEN 3 THEN 'wednesday'
                  WHEN 5 THEN 'friday'
                  WHEN 6 THEN 'saturday'
                  WHEN 0 THEN 'sunday'
                  ELSE 'monday'
                END;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object('id', jp.id, 'question_text', jp.question_text, 'sort_order', jp.sort_order)
    ORDER BY jp.sort_order
  ), '[]'::jsonb)
  INTO v_prompts
  FROM public.journal_prompts jp
  WHERE jp.day_type = v_day_type AND jp.is_active = true;

  SELECT je.id INTO v_entry_id
  FROM public.journal_entries je
  WHERE je.user_id = v_user_id AND je.entry_date = p_date
  LIMIT 1;

  IF v_entry_id IS NOT NULL THEN
    SELECT jsonb_build_object(
      'id', je.id,
      'entry_date', je.entry_date,
      'day_type', je.day_type,
      'is_reviewed', je.is_reviewed,
      'emotions', (
        SELECT COALESCE(jsonb_agg(
          jsonb_build_object('emotion_name', em.emotion_name, 'intensity', em.intensity)
        ), '[]'::jsonb)
        FROM public.journal_emotions em WHERE em.entry_id = je.id
      ),
      'answers', (
        SELECT COALESCE(jsonb_agg(
          jsonb_build_object('id', a.id, 'prompt_id', a.prompt_id, 'answer_text', a.answer_text)
          ORDER BY a.created_at
        ), '[]'::jsonb)
        FROM public.journal_answers a WHERE a.entry_id = je.id
      )
    )
    INTO v_entry
    FROM public.journal_entries je
    WHERE je.id = v_entry_id;
  END IF;

  RETURN jsonb_build_object('found', true, 'date', p_date, 'day_type', v_day_type,
                            'prompts', v_prompts, 'entry', v_entry);
END;
$function$;

CREATE OR REPLACE FUNCTION public.save_journal_web(
  p_entry_date date,
  p_day_type text,
  p_emotions jsonb,
  p_answers jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id  UUID := auth.uid();
  v_entry_id UUID;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  IF p_day_type NOT IN ('monday','wednesday','friday','saturday','sunday','weekday') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_day_type');
  END IF;

  INSERT INTO public.journal_entries (user_id, entry_date, day_type)
  VALUES (v_user_id, p_entry_date, p_day_type)
  ON CONFLICT (user_id, entry_date) DO NOTHING
  RETURNING id INTO v_entry_id;

  IF v_entry_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_exists');
  END IF;

  INSERT INTO public.journal_emotions (entry_id, emotion_name, intensity)
  SELECT v_entry_id, elem->>'name', (elem->>'intensity')::int
  FROM jsonb_array_elements(COALESCE(p_emotions, '[]'::jsonb)) elem;

  INSERT INTO public.journal_answers (entry_id, prompt_id, answer_text)
  SELECT v_entry_id, (elem->>'prompt_id')::uuid, elem->>'text'
  FROM jsonb_array_elements(COALESCE(p_answers, '[]'::jsonb)) elem;

  RETURN jsonb_build_object(
    'ok', true,
    'entry', jsonb_build_object(
      'id', v_entry_id, 'entry_date', p_entry_date, 'day_type', p_day_type,
      'emotions', (SELECT COALESCE(jsonb_agg(jsonb_build_object(
                      'emotion_name', em.emotion_name, 'intensity', em.intensity)), '[]'::jsonb)
                   FROM public.journal_emotions em WHERE em.entry_id = v_entry_id),
      'answers', (SELECT COALESCE(jsonb_agg(jsonb_build_object(
                      'prompt_id', a.prompt_id, 'answer_text', a.answer_text)), '[]'::jsonb)
                  FROM public.journal_answers a WHERE a.entry_id = v_entry_id)
    )
  );
END;
$function$;

-- 4. МАГАЗИН -----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_shop_web()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('found', false, 'error', 'not_authenticated');
  END IF;

  RETURN jsonb_build_object(
    'found', true,
    'balance', COALESCE(public.get_user_coin_balance(v_user_id), 0),
    'rewards', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', r.id, 'title', r.title, 'description', r.description,
        'image_url', r.image_url, 'cost_coins', r.cost_coins, 'stock', r.stock
      ) ORDER BY r.sort_order), '[]'::jsonb)
      FROM public.rewards r WHERE r.is_active = true
    ),
    'my_requests', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', rq.id, 'status', rq.status, 'cost_coins', rq.cost_coins,
        'admin_comment', rq.admin_comment, 'created_at', rq.created_at,
        'reward_title', COALESCE(r2.title, 'Награда')
      ) ORDER BY rq.created_at DESC), '[]'::jsonb)
      FROM public.reward_requests rq
      LEFT JOIN public.rewards r2 ON r2.id = rq.reward_id
      WHERE rq.user_id = v_user_id
    )
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.purchase_reward_web(
  p_reward_id uuid,
  p_user_comment text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id UUID := auth.uid();
  v_request UUID;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  v_request := public.server_create_reward_request(
    v_user_id, p_reward_id, NULLIF(BTRIM(COALESCE(p_user_comment, '')), '')
  );

  RETURN jsonb_build_object('ok', true, 'request_id', v_request);
END;
$function$;

-- 5. ЧЕЛЛЕНДЖИ ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_challenges_web()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id UUID := auth.uid();
  v_code    TEXT;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('found', false, 'error', 'not_authenticated');
  END IF;

  SELECT p.referral_code INTO v_code
  FROM profiles p WHERE p.user_id = v_user_id LIMIT 1;

  RETURN jsonb_build_object(
    'found', true,
    'referral_code', v_code,
    'challenges', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', c.id, 'name', c.name, 'description', c.description,
        'prize_description', c.prize_description, 'start_date', c.start_date,
        'end_date', c.end_date, 'max_per_day', c.max_per_day, 'is_active', c.is_active
      ) ORDER BY c.created_at DESC), '[]'::jsonb)
      FROM public.challenges c WHERE c.is_active = true
    ),
    'entries', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', e.id, 'challenge_id', e.challenge_id,
        'entry_date', e.entry_date, 'created_at', e.created_at
      ) ORDER BY e.entry_date DESC), '[]'::jsonb)
      FROM public.challenge_entries e WHERE e.user_id = v_user_id
    )
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.challenge_checkin_web(p_challenge_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;
  RETURN public.server_challenge_checkin(v_user_id, p_challenge_id);
END;
$function$;

-- 6. МАСТЕРМАЙНД -------------------------------------------------------------
-- В вебе group_id не передаётся — берём активное участие пользователя.
CREATE OR REPLACE FUNCTION public.get_mastermind_web(p_group_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id UUID := auth.uid();
  v_member  RECORD;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('found', false, 'error', 'not_authenticated');
  END IF;

  SELECT m.id, m.group_id, m.request, m.plan, m.start_date, m.end_date, m.is_active
  INTO   v_member
  FROM   public.mastermind_members m
  WHERE  m.user_id = v_user_id
    AND  m.is_active = true
    AND  (p_group_id IS NULL OR m.group_id = p_group_id)
  ORDER BY m.start_date DESC NULLS LAST
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('found', true, 'is_member', false);
  END IF;

  RETURN jsonb_build_object(
    'found', true,
    'is_member', true,
    'member', jsonb_build_object(
      'id', v_member.id, 'group_id', v_member.group_id, 'request', v_member.request,
      'plan', v_member.plan, 'start_date', v_member.start_date,
      'end_date', v_member.end_date, 'is_active', v_member.is_active
    ),
    'tasks', (
      SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY t.sort_order), '[]'::jsonb)
      FROM public.mastermind_tasks t WHERE t.member_id = v_member.id
    ),
    'entries', (
      SELECT COALESCE(jsonb_agg(to_jsonb(e) ORDER BY e.created_at DESC), '[]'::jsonb)
      FROM public.mastermind_entries e WHERE e.member_id = v_member.id
    )
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.complete_mastermind_task_web(
  p_task_id uuid,
  p_comment text DEFAULT NULL,
  p_file_url text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;
  RETURN public.server_complete_mastermind_task(
    v_user_id, p_task_id,
    NULLIF(BTRIM(COALESCE(p_comment, '')), ''),
    NULLIF(BTRIM(COALESCE(p_file_url, '')), '')
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.create_mastermind_task_web(
  p_title text,
  p_description text DEFAULT NULL,
  p_deadline date DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;
  RETURN public.server_create_mastermind_task(
    v_user_id, p_title,
    NULLIF(BTRIM(COALESCE(p_description, '')), ''),
    p_deadline
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.submit_mastermind_entry_web(
  p_summary text,
  p_my_tasks text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;
  IF NULLIF(BTRIM(COALESCE(p_summary, '')), '') IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'missing_summary');
  END IF;
  RETURN public.server_submit_mastermind_entry(
    v_user_id, BTRIM(p_summary),
    NULLIF(BTRIM(COALESCE(p_my_tasks, '')), '')
  );
END;
$function$;

-- 7. ПИРАМИДА КЭМП -----------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_pyramid_web()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('found', false, 'error', 'not_authenticated');
  END IF;

  RETURN jsonb_build_object('found', true, 'levels', (
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id', l.id, 'level_number', l.level_number, 'title', l.title,
      'description', l.description, 'presentation_url', l.presentation_url,
      'is_unlocked', l.is_unlocked
    ) ORDER BY l.level_number ASC), '[]'::jsonb)
    FROM public.pyramid_levels l
  ));
END;
$function$;

-- 8. ПРАВИЛА -----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_rules_web()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id UUID := auth.uid();
  v_docs    JSONB;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('found', false, 'error', 'not_authenticated');
  END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'doc_type', r.doc_type, 'title', r.title,
           'content',  r.content,  'file_url', r.file_url
         )), '[]'::jsonb)
  INTO   v_docs
  FROM   public.get_rules_for_user(v_user_id) r;

  RETURN jsonb_build_object('found', true, 'documents', v_docs);
END;
$function$;

-- 9. ТОЧКА А / Б -------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_checkpoint_web(p_checkpoint_type text DEFAULT 'A')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id   UUID := auth.uid();
  v_stream_id UUID;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('found', false, 'error', 'not_authenticated');
  END IF;

  SELECT p.current_stream_id INTO v_stream_id
  FROM profiles p WHERE p.user_id = v_user_id LIMIT 1;

  IF v_stream_id IS NULL THEN
    RETURN jsonb_build_object('found', false, 'error', 'no_stream');
  END IF;

  RETURN jsonb_build_object(
    'found', true,
    'stream_id', v_stream_id,
    'checkpoint', (
      SELECT to_jsonb(c) FROM public.participant_checkpoints c
      WHERE c.user_id = v_user_id
        AND c.stream_id = v_stream_id
        AND c.checkpoint_type = p_checkpoint_type
      LIMIT 1
    ),
    'questions', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', q.id, 'question_text', q.question_text, 'sort_order', q.sort_order
      ) ORDER BY q.sort_order), '[]'::jsonb)
      FROM public.checkpoint_questions q WHERE q.is_active = true
    )
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.save_checkpoint_web(
  p_checkpoint_type text,
  p_data jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id   UUID := auth.uid();
  v_stream_id UUID;
  v_id        UUID;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  IF p_data IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'missing_data');
  END IF;

  SELECT p.current_stream_id INTO v_stream_id
  FROM profiles p WHERE p.user_id = v_user_id LIMIT 1;

  IF v_stream_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'no_stream');
  END IF;

  SELECT c.id INTO v_id
  FROM public.participant_checkpoints c
  WHERE c.user_id = v_user_id
    AND c.stream_id = v_stream_id
    AND c.checkpoint_type = p_checkpoint_type
  LIMIT 1;

  IF v_id IS NULL THEN
    INSERT INTO public.participant_checkpoints (
      user_id, stream_id, checkpoint_type, weight_kg, waist_cm, belly_cm, chest_cm,
      hips_cm, body_fat_pct, pyramid_scores, pyramid_average, personal_goal,
      personal_result, main_achievement, filled_by, updated_at
    ) VALUES (
      v_user_id, v_stream_id, p_checkpoint_type,
      NULLIF(p_data->>'weight_kg','')::numeric,
      NULLIF(p_data->>'waist_cm','')::numeric,
      NULLIF(p_data->>'belly_cm','')::numeric,
      NULLIF(p_data->>'chest_cm','')::numeric,
      NULLIF(p_data->>'hips_cm','')::numeric,
      NULLIF(p_data->>'body_fat_pct','')::numeric,
      p_data->'pyramid_scores',
      NULLIF(p_data->>'pyramid_average','')::numeric,
      NULLIF(p_data->>'personal_goal',''),
      NULLIF(p_data->>'personal_result',''),
      NULLIF(p_data->>'main_achievement',''),
      v_user_id, now()
    )
    RETURNING id INTO v_id;
  ELSE
    UPDATE public.participant_checkpoints SET
      weight_kg        = NULLIF(p_data->>'weight_kg','')::numeric,
      waist_cm         = NULLIF(p_data->>'waist_cm','')::numeric,
      belly_cm         = NULLIF(p_data->>'belly_cm','')::numeric,
      chest_cm         = NULLIF(p_data->>'chest_cm','')::numeric,
      hips_cm          = NULLIF(p_data->>'hips_cm','')::numeric,
      body_fat_pct     = NULLIF(p_data->>'body_fat_pct','')::numeric,
      pyramid_scores   = p_data->'pyramid_scores',
      pyramid_average  = NULLIF(p_data->>'pyramid_average','')::numeric,
      personal_goal    = NULLIF(p_data->>'personal_goal',''),
      personal_result  = NULLIF(p_data->>'personal_result',''),
      main_achievement = NULLIF(p_data->>'main_achievement',''),
      filled_by        = v_user_id,
      updated_at       = now()
    WHERE id = v_id;
  END IF;

  RETURN jsonb_build_object('ok', true, 'id', v_id);
END;
$function$;

-- 10. ПРАВА ------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION
  public.get_rating_web(),
  public.get_profile_web(),
  public.update_profile_web(integer, integer, date),
  public.update_avatar_web(text),
  public.get_journal_web(date),
  public.save_journal_web(date, text, jsonb, jsonb),
  public.get_shop_web(),
  public.purchase_reward_web(uuid, text),
  public.get_challenges_web(),
  public.challenge_checkin_web(uuid),
  public.get_mastermind_web(uuid),
  public.complete_mastermind_task_web(uuid, text, text),
  public.create_mastermind_task_web(text, text, date),
  public.submit_mastermind_entry_web(text, text),
  public.get_pyramid_web(),
  public.get_rules_web(),
  public.get_checkpoint_web(text),
  public.save_checkpoint_web(text, jsonb)
FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION
  public.get_rating_web(),
  public.get_profile_web(),
  public.update_profile_web(integer, integer, date),
  public.update_avatar_web(text),
  public.get_journal_web(date),
  public.save_journal_web(date, text, jsonb, jsonb),
  public.get_shop_web(),
  public.purchase_reward_web(uuid, text),
  public.get_challenges_web(),
  public.challenge_checkin_web(uuid),
  public.get_mastermind_web(uuid),
  public.complete_mastermind_task_web(uuid, text, text),
  public.create_mastermind_task_web(text, text, date),
  public.submit_mastermind_entry_web(text, text),
  public.get_pyramid_web(),
  public.get_rules_web(),
  public.get_checkpoint_web(text),
  public.save_checkpoint_web(text, jsonb)
TO authenticated, service_role;

-- DOWN (откат):
-- DROP FUNCTION IF EXISTS public.get_rating_web(), public.get_profile_web(),
--   public.update_profile_web(integer,integer,date), public.update_avatar_web(text),
--   public.get_journal_web(date), public.save_journal_web(date,text,jsonb,jsonb),
--   public.get_shop_web(), public.purchase_reward_web(uuid,text),
--   public.get_challenges_web(), public.challenge_checkin_web(uuid),
--   public.get_mastermind_web(uuid), public.complete_mastermind_task_web(uuid,text,text),
--   public.create_mastermind_task_web(text,text,date), public.submit_mastermind_entry_web(text,text),
--   public.get_pyramid_web(), public.get_rules_web(),
--   public.get_checkpoint_web(text), public.save_checkpoint_web(text,jsonb);