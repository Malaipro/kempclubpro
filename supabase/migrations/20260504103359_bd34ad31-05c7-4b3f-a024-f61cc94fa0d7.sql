
-- =========================================
-- 1. Добавляем колонки в profiles
-- =========================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS referral_code text UNIQUE,
  ADD COLUMN IF NOT EXISTS referral_coins integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_profiles_referral_code ON public.profiles(referral_code);

-- =========================================
-- 2. referral_settings (синглтон)
-- =========================================
CREATE TABLE IF NOT EXISTS public.referral_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enabled boolean NOT NULL DEFAULT true,
  bonus_amount integer NOT NULL DEFAULT 10,
  default_invite_text text NOT NULL DEFAULT 'Приглашаю тебя в КЭМП — клуб для тех, кто хочет расти. Регистрируйся по моей ссылке:',
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.referral_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Settings readable by authenticated"
  ON public.referral_settings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Settings readable by anon for join page"
  ON public.referral_settings FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Admins manage settings"
  ON public.referral_settings FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

INSERT INTO public.referral_settings (enabled, bonus_amount, default_invite_text)
SELECT true, 10, 'Приглашаю тебя в КЭМП — клуб для тех, кто хочет расти. Регистрируйся по моей ссылке:'
WHERE NOT EXISTS (SELECT 1 FROM public.referral_settings);

-- =========================================
-- 3. referral_leads
-- =========================================
CREATE TABLE IF NOT EXISTS public.referral_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_user_id uuid NOT NULL,
  referral_code text NOT NULL,
  name text NOT NULL,
  phone text,
  telegram text,
  comment text,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','in_progress','confirmed','rejected')),
  bonus_awarded boolean NOT NULL DEFAULT false,
  bonus_amount integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  confirmed_at timestamptz,
  processed_by uuid
);

CREATE INDEX IF NOT EXISTS idx_referral_leads_referrer ON public.referral_leads(referrer_user_id);
CREATE INDEX IF NOT EXISTS idx_referral_leads_status ON public.referral_leads(status);
CREATE INDEX IF NOT EXISTS idx_referral_leads_code ON public.referral_leads(referral_code);

ALTER TABLE public.referral_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Referrer can view own leads"
  ON public.referral_leads FOR SELECT
  TO authenticated
  USING (auth.uid() = referrer_user_id);

CREATE POLICY "Admins can view all leads"
  ON public.referral_leads FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update leads"
  ON public.referral_leads FOR UPDATE
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete leads"
  ON public.referral_leads FOR DELETE
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- Анонимный INSERT с валидацией: код должен существовать у резидента, поля не пустые/ограничены по длине
CREATE POLICY "Anyone can submit referral lead with valid code"
  ON public.referral_leads FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    bonus_awarded = false
    AND status = 'new'
    AND length(trim(name)) BETWEEN 2 AND 100
    AND (phone IS NULL OR length(phone) BETWEEN 5 AND 30)
    AND (telegram IS NULL OR length(telegram) <= 100)
    AND (comment IS NULL OR length(comment) <= 1000)
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = referrer_user_id
        AND p.referral_code = referral_leads.referral_code
        AND p.referral_code IS NOT NULL
    )
  );

-- =========================================
-- 4. coin_transactions
-- =========================================
CREATE TABLE IF NOT EXISTS public.coin_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  amount integer NOT NULL,
  reason text NOT NULL,
  source_type text,
  source_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);

CREATE INDEX IF NOT EXISTS idx_coin_tx_user ON public.coin_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_coin_tx_source ON public.coin_transactions(source_type, source_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_coin_tx_referral_lead
  ON public.coin_transactions(source_id)
  WHERE source_type = 'referral_lead';

ALTER TABLE public.coin_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own coin transactions"
  ON public.coin_transactions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins view all coin transactions"
  ON public.coin_transactions FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins manage coin transactions"
  ON public.coin_transactions FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- =========================================
-- 5. Функции
-- =========================================

-- Генерация уникального 8-символьного кода
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code text;
  v_exists boolean;
  v_attempts int := 0;
BEGIN
  LOOP
    v_code := upper(substring(md5(random()::text || clock_timestamp()::text) FROM 1 FOR 8));
    SELECT EXISTS(SELECT 1 FROM public.profiles WHERE referral_code = v_code) INTO v_exists;
    EXIT WHEN NOT v_exists OR v_attempts > 10;
    v_attempts := v_attempts + 1;
  END LOOP;
  RETURN v_code;
END;
$$;

-- Гарантированно вернуть/создать referral_code пользователя
CREATE OR REPLACE FUNCTION public.ensure_referral_code(_user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code text;
BEGIN
  IF auth.uid() <> _user_id AND NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT referral_code INTO v_code FROM public.profiles WHERE user_id = _user_id;

  IF v_code IS NULL OR length(v_code) = 0 THEN
    v_code := public.generate_referral_code();
    UPDATE public.profiles SET referral_code = v_code WHERE user_id = _user_id;
  END IF;

  RETURN v_code;
END;
$$;

-- Подтверждение заявки + начисление бонуса (атомарно, без двойного зачисления)
CREATE OR REPLACE FUNCTION public.confirm_referral_lead(_lead_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead public.referral_leads%ROWTYPE;
  v_bonus integer;
  v_enabled boolean;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only admins can confirm referral leads';
  END IF;

  SELECT * INTO v_lead FROM public.referral_leads WHERE id = _lead_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lead not found';
  END IF;

  IF v_lead.bonus_awarded THEN
    RAISE EXCEPTION 'Bonus already awarded for this lead';
  END IF;

  SELECT enabled, bonus_amount INTO v_enabled, v_bonus
  FROM public.referral_settings
  ORDER BY updated_at DESC
  LIMIT 1;

  IF NOT COALESCE(v_enabled, false) THEN
    RAISE EXCEPTION 'Referral program is disabled';
  END IF;

  -- Обновляем заявку
  UPDATE public.referral_leads
  SET status = 'confirmed',
      bonus_awarded = true,
      bonus_amount = v_bonus,
      confirmed_at = now(),
      processed_by = auth.uid()
  WHERE id = _lead_id;

  -- Обновляем баланс приглашающего
  UPDATE public.profiles
  SET referral_coins = COALESCE(referral_coins, 0) + v_bonus
  WHERE user_id = v_lead.referrer_user_id;

  -- Журнал транзакций (UNIQUE по source_id защитит от дубля)
  INSERT INTO public.coin_transactions (user_id, amount, reason, source_type, source_id, created_by)
  VALUES (v_lead.referrer_user_id, v_bonus, 'Реферальный бонус за приглашение', 'referral_lead', _lead_id, auth.uid());
END;
$$;

-- Обновление updated_at для referral_settings
DROP TRIGGER IF EXISTS trg_referral_settings_updated_at ON public.referral_settings;
CREATE TRIGGER trg_referral_settings_updated_at
BEFORE UPDATE ON public.referral_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
