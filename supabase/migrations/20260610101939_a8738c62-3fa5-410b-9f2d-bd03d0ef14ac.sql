-- 1. Extend referral_leads with email, reward flag and Bitrix24 placeholder fields
ALTER TABLE public.referral_leads
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS reward_issued boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS bitrix_lead_id text,
  ADD COLUMN IF NOT EXISTS bitrix_deal_id text,
  ADD COLUMN IF NOT EXISTS bitrix_status text,
  ADD COLUMN IF NOT EXISTS bitrix_synced_at timestamptz;

-- 2. Relax status CHECK to allow new business statuses (keep legacy in_progress)
ALTER TABLE public.referral_leads DROP CONSTRAINT IF EXISTS referral_leads_status_check;
ALTER TABLE public.referral_leads
  ADD CONSTRAINT referral_leads_status_check
  CHECK (status = ANY (ARRAY['new','in_progress','contacted','paid','confirmed','rejected','rewarded']));

-- 3. Admin RPC: confirm referral and award coins via rule (idempotent)
CREATE OR REPLACE FUNCTION public.admin_confirm_referral(p_lead_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_lead public.referral_leads%ROWTYPE;
  v_award jsonb;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Только администратор может подтверждать рефералов';
  END IF;

  SELECT * INTO v_lead FROM public.referral_leads WHERE id = p_lead_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Заявка не найдена';
  END IF;

  -- Award coins by rule; award_coins_by_rule guards against duplicates
  v_award := public.award_coins_by_rule(
    p_user_id      => v_lead.referrer_user_id,
    p_rule_code    => 'referral_confirmed',
    p_source_type  => 'referral_lead',
    p_source_id    => v_lead.id,
    p_reason       => 'Подтверждённый реферал'
  );

  -- Update lead state
  UPDATE public.referral_leads
  SET status = 'rewarded',
      reward_issued = true,
      bonus_awarded = true,
      bonus_amount = COALESCE((v_award->>'amount')::int, bonus_amount),
      confirmed_at = COALESCE(confirmed_at, now()),
      processed_by = auth.uid()
  WHERE id = p_lead_id;

  RETURN jsonb_build_object(
    'lead_id', p_lead_id,
    'award', v_award
  );
END;
$$;

-- 4. Admin RPC: list participants with coin balances for the Coins tab
CREATE OR REPLACE FUNCTION public.admin_list_coin_balances()
RETURNS TABLE (
  user_id uuid,
  display_name text,
  first_name text,
  last_name text,
  email text,
  participant_status text,
  stream_name text,
  balance integer,
  tx_count bigint,
  last_tx_at timestamptz
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Только администратор может просматривать балансы';
  END IF;

  RETURN QUERY
  SELECT
    p.user_id,
    p.display_name,
    p.first_name,
    p.last_name,
    p.email,
    p.participant_status::text,
    s.name AS stream_name,
    COALESCE(ct.balance, 0)::integer AS balance,
    COALESCE(ct.tx_count, 0) AS tx_count,
    ct.last_tx_at
  FROM public.profiles p
  LEFT JOIN public.intensive_streams s ON s.id = p.current_stream_id
  LEFT JOIN (
    SELECT user_id,
           SUM(amount) AS balance,
           COUNT(*) AS tx_count,
           MAX(created_at) AS last_tx_at
    FROM public.coin_transactions
    GROUP BY user_id
  ) ct ON ct.user_id = p.user_id
  ORDER BY COALESCE(ct.balance, 0) DESC, p.display_name ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_confirm_referral(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_coin_balances() TO authenticated;