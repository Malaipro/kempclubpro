-- Rewards catalog
CREATE TABLE public.rewards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  cost_coins INTEGER NOT NULL CHECK (cost_coins >= 0),
  stock INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage rewards"
ON public.rewards FOR ALL
TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Club residents view active rewards"
ON public.rewards FOR SELECT
TO authenticated
USING (
  is_active = true
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
      AND p.participant_status = 'club_resident'::participant_status_type
  )
);

CREATE TRIGGER update_rewards_updated_at
BEFORE UPDATE ON public.rewards
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Reward requests
CREATE TABLE public.reward_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  reward_id UUID NOT NULL REFERENCES public.rewards(id) ON DELETE RESTRICT,
  cost_coins INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | approved | rejected | fulfilled | cancelled
  user_comment TEXT,
  admin_comment TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  fulfilled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.reward_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage all reward requests"
ON public.reward_requests FOR ALL
TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Users view own reward requests"
ON public.reward_requests FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE TRIGGER update_reward_requests_updated_at
BEFORE UPDATE ON public.reward_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_reward_requests_user ON public.reward_requests(user_id);
CREATE INDEX idx_reward_requests_status ON public.reward_requests(status);

-- Helper: compute user's coin balance
CREATE OR REPLACE FUNCTION public.get_user_coin_balance(p_user_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(amount), 0)::INTEGER
  FROM public.coin_transactions
  WHERE user_id = p_user_id;
$$;

-- RPC: create reward request (resident only, atomic coin debit)
CREATE OR REPLACE FUNCTION public.create_reward_request(
  p_reward_id UUID,
  p_user_comment TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_status participant_status_type;
  v_cost INTEGER;
  v_active BOOLEAN;
  v_stock INTEGER;
  v_balance INTEGER;
  v_request_id UUID;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT participant_status INTO v_status
  FROM public.profiles WHERE user_id = v_user_id;

  IF v_status IS DISTINCT FROM 'club_resident'::participant_status_type THEN
    RAISE EXCEPTION 'Награды доступны только резидентам клуба';
  END IF;

  SELECT cost_coins, is_active, stock
    INTO v_cost, v_active, v_stock
  FROM public.rewards WHERE id = p_reward_id FOR UPDATE;

  IF NOT FOUND OR NOT v_active THEN
    RAISE EXCEPTION 'Награда недоступна';
  END IF;

  IF v_stock IS NOT NULL AND v_stock <= 0 THEN
    RAISE EXCEPTION 'Награда закончилась';
  END IF;

  v_balance := public.get_user_coin_balance(v_user_id);
  IF v_balance < v_cost THEN
    RAISE EXCEPTION 'Недостаточно коинов (баланс: %, требуется: %)', v_balance, v_cost;
  END IF;

  INSERT INTO public.reward_requests (user_id, reward_id, cost_coins, user_comment)
  VALUES (v_user_id, p_reward_id, v_cost, p_user_comment)
  RETURNING id INTO v_request_id;

  -- Debit coins immediately (hold). On reject — refund.
  INSERT INTO public.coin_transactions (user_id, amount, reason, source_type, source_id, created_by)
  VALUES (v_user_id, -v_cost, 'Заказ награды (резерв)', 'reward_request', v_request_id, v_user_id);

  IF v_stock IS NOT NULL THEN
    UPDATE public.rewards SET stock = stock - 1 WHERE id = p_reward_id;
  END IF;

  RETURN v_request_id;
END;
$$;

-- RPC: review reward request (admin)
CREATE OR REPLACE FUNCTION public.review_reward_request(
  p_request_id UUID,
  p_new_status TEXT,
  p_admin_comment TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin UUID := auth.uid();
  v_req RECORD;
BEGIN
  IF NOT is_admin(v_admin) THEN
    RAISE EXCEPTION 'Только админ';
  END IF;

  IF p_new_status NOT IN ('approved','rejected','fulfilled','cancelled') THEN
    RAISE EXCEPTION 'Недопустимый статус';
  END IF;

  SELECT * INTO v_req FROM public.reward_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Заявка не найдена';
  END IF;

  -- Refund on reject/cancel if not already refunded
  IF p_new_status IN ('rejected','cancelled') AND v_req.status NOT IN ('rejected','cancelled') THEN
    INSERT INTO public.coin_transactions (user_id, amount, reason, source_type, source_id, created_by)
    VALUES (v_req.user_id, v_req.cost_coins, 'Возврат коинов (отмена награды)', 'reward_request', v_req.id, v_admin);

    -- Restore stock if tracked
    UPDATE public.rewards SET stock = stock + 1
    WHERE id = v_req.reward_id AND stock IS NOT NULL;
  END IF;

  UPDATE public.reward_requests
  SET status = p_new_status,
      admin_comment = COALESCE(p_admin_comment, admin_comment),
      reviewed_by = v_admin,
      reviewed_at = now(),
      fulfilled_at = CASE WHEN p_new_status = 'fulfilled' THEN now() ELSE fulfilled_at END
  WHERE id = p_request_id;
END;
$$;

-- Storage policies for rewards images in existing 'content' bucket
CREATE POLICY "Admins upload reward images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'content'
  AND (storage.foldername(name))[1] = 'rewards'
  AND is_admin(auth.uid())
);

CREATE POLICY "Admins update reward images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'content'
  AND (storage.foldername(name))[1] = 'rewards'
  AND is_admin(auth.uid())
);

CREATE POLICY "Admins delete reward images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'content'
  AND (storage.foldername(name))[1] = 'rewards'
  AND is_admin(auth.uid())
);