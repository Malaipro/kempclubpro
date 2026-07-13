-- Начисление монет за сдачу ДЗ (Telegram Mini App).
--
-- 1. Сид правила 'homework_submission' в coin_rules (идемпотентно, как
--    referral_telegram_signup в 20260624120000). 1 монета за сам факт сдачи —
--    баллы за проверенное ДЗ начисляются отдельно, вручную, через админку.
-- 2. submit_homework — добавляем submission_id и user_id в успешный ответ,
--    чтобы telegram-server мог вызвать award_coins_by_rule без лишнего RPC.

INSERT INTO public.coin_rules (code, name, description, coin_amount, is_active)
SELECT
  'homework_submission',
  'Сдача ДЗ',
  'Начисляется участнику при сдаче домашнего задания через Telegram Mini App.',
  1,
  true
WHERE NOT EXISTS (
  SELECT 1 FROM public.coin_rules WHERE code = 'homework_submission'
);


-- ────────────────────────────────────────────────────────────────
-- submit_homework: + submission_id, user_id в успешном ответе
-- ────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.submit_homework(
  p_telegram_id   TEXT,
  p_assignment_id UUID,
  p_content       TEXT,
  p_file_url      TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id       UUID;
  v_stream_id     UUID;
  v_assignment    public.homework_assignments%ROWTYPE;
  v_submission    public.homework_submissions%ROWTYPE;
  v_submission_id UUID;
  v_content       TEXT := NULLIF(BTRIM(COALESCE(p_content, '')), '');
  v_file_url      TEXT := NULLIF(BTRIM(COALESCE(p_file_url, '')), '');
BEGIN
  IF v_content IS NULL AND v_file_url IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'empty_submission');
  END IF;

  SELECT p.user_id, p.current_stream_id
  INTO   v_user_id, v_stream_id
  FROM   profiles p
  WHERE  p.telegram_id = p_telegram_id
  LIMIT  1;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_linked');
  END IF;

  SELECT * INTO v_assignment
  FROM   public.homework_assignments
  WHERE  id = p_assignment_id
    AND  is_active = true
    AND  (
      target_user_id = v_user_id
      OR (v_stream_id IS NOT NULL AND stream_id = v_stream_id)
    );

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;

  SELECT * INTO v_submission
  FROM   public.homework_submissions
  WHERE  assignment_id = p_assignment_id
    AND  user_id = v_user_id
  ORDER BY created_at DESC
  LIMIT  1
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.homework_submissions
      (user_id, assignment_id, homework_type, content, file_url, status)
    VALUES
      (v_user_id, p_assignment_id, 'assignment', v_content, v_file_url, 'submitted')
    RETURNING id INTO v_submission_id;

    RETURN jsonb_build_object(
      'ok',            true,
      'status',        'submitted',
      'submission_id', v_submission_id,
      'user_id',       v_user_id
    );
  END IF;

  IF v_submission.status <> 'rework' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_submitted');
  END IF;

  UPDATE public.homework_submissions
  SET content = v_content,
      file_url = v_file_url,
      status = 'submitted',
      admin_comment = NULL,
      reviewed_at = NULL,
      reviewed_by = NULL,
      verified = false,
      points_earned = 0
  WHERE id = v_submission.id;

  RETURN jsonb_build_object(
    'ok',            true,
    'status',        'submitted',
    'submission_id', v_submission.id,
    'user_id',       v_user_id
  );
END;
$$;
