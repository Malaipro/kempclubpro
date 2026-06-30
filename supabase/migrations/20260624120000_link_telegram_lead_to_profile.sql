-- Atomic RPC: link telegram_lead to a profile + award referral coins.
--
-- Replaces the two-step client-side flow in TelegramLeadsManagement.tsx where
-- admin had to: (1) UPDATE profiles, (2) UPDATE telegram_leads — without any
-- coin award for the referrer even when referral_code was present.
--
-- After this migration the client calls one RPC and the entire operation
-- (profile update + lead status + referral coins) is a single transaction.

-- Dedup guard: same pattern as uq_coin_tx_referral_lead for referral_lead source.
CREATE UNIQUE INDEX IF NOT EXISTS uq_coin_tx_telegram_lead
  ON public.coin_transactions(source_id)
  WHERE source_type = 'telegram_lead';

-- Seed coin rule for telegram referral signups (idempotent).
-- Admins can change coin_amount later via the Coins → Rules admin panel.
INSERT INTO public.coin_rules (code, name, description, coin_amount, is_active)
SELECT
  'referral_telegram_signup',
  'Реферал через Telegram-бот',
  'Начисляется рефереру, когда администратор привязывает Telegram-заявку к профилю участника.',
  10,
  true
WHERE NOT EXISTS (
  SELECT 1 FROM public.coin_rules WHERE code = 'referral_telegram_signup'
);

-- Main function.
CREATE OR REPLACE FUNCTION public.link_telegram_lead_to_profile(
  p_lead_id    uuid,
  p_profile_id uuid   -- user_id from profiles
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_lead            public.telegram_leads%ROWTYPE;
  v_referrer_id     uuid;
  v_award           jsonb := NULL;
  v_now             timestamptz := now();
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only admins can link telegram leads';
  END IF;

  SELECT * INTO v_lead
  FROM public.telegram_leads
  WHERE id = p_lead_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Telegram lead not found: %', p_lead_id;
  END IF;

  IF v_lead.status = 'linked' THEN
    RAISE EXCEPTION 'Telegram lead is already linked';
  END IF;

  -- 1. Stamp telegram fields onto the profile.
  UPDATE public.profiles
  SET
    telegram_id         = v_lead.telegram_id,
    telegram_username   = v_lead.telegram_username,
    telegram_first_name = v_lead.telegram_first_name,
    telegram_last_name  = v_lead.telegram_last_name,
    telegram_linked_at  = v_now,
    updated_at          = v_now
  WHERE user_id = p_profile_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found: %', p_profile_id;
  END IF;

  -- 2. Mark lead as processed.
  UPDATE public.telegram_leads
  SET
    status       = 'linked',
    processed_by = auth.uid(),
    processed_at = v_now,
    updated_at   = v_now
  WHERE id = p_lead_id;

  -- 3. Award referral coins if this lead arrived via a referral link.
  IF v_lead.referral_code IS NOT NULL THEN
    SELECT user_id INTO v_referrer_id
    FROM public.profiles
    WHERE referral_code = v_lead.referral_code
    LIMIT 1;

    IF v_referrer_id IS NOT NULL THEN
      -- award_coins_by_rule is idempotent: the UNIQUE index on
      -- coin_transactions(source_id) WHERE source_type='telegram_lead'
      -- prevents double-awarding if this function is called twice.
      v_award := public.award_coins_by_rule(
        p_user_id     => v_referrer_id,
        p_rule_code   => 'referral_telegram_signup',
        p_source_type => 'telegram_lead',
        p_source_id   => p_lead_id,
        p_reason      => 'Реферал через Telegram-бот'
      );
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'linked',          true,
    'lead_id',         p_lead_id,
    'profile_id',      p_profile_id,
    'referral_code',   v_lead.referral_code,
    'referrer_id',     v_referrer_id,
    'referral_award',  v_award
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.link_telegram_lead_to_profile(uuid, uuid) TO authenticated;
