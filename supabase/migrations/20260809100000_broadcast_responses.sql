-- Таблица откликов на интерактивные кнопки рассылок (buttons в broadcast_messages).
-- Одна строка на клик по конкретной кнопке конкретным пользователем.
-- UNIQUE (broadcast_message_id, user_id, button_index) — обработчик callback_query
-- в telegram-server использует конфликт вставки как сигнал "уже отмечено" и
-- не выполняет действие кнопки повторно (важно для request_reward — без этого
-- повторный клик списывал бы коины ещё раз).

CREATE TABLE IF NOT EXISTS public.broadcast_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  broadcast_message_id UUID NOT NULL REFERENCES public.broadcast_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  button_index INTEGER NOT NULL,
  action_type TEXT NOT NULL CHECK (action_type IN ('response', 'book_event', 'request_reward')),
  action_target_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (broadcast_message_id, user_id, button_index)
);

CREATE INDEX IF NOT EXISTS idx_broadcast_responses_broadcast ON public.broadcast_responses(broadcast_message_id);
CREATE INDEX IF NOT EXISTS idx_broadcast_responses_user ON public.broadcast_responses(user_id);

ALTER TABLE public.broadcast_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view broadcast responses"
ON public.broadcast_responses FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Users view own broadcast responses"
ON public.broadcast_responses FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

GRANT SELECT ON public.broadcast_responses TO authenticated;
GRANT ALL ON public.broadcast_responses TO service_role;
