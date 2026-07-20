ALTER TABLE public.broadcast_messages
  ADD COLUMN IF NOT EXISTS target_user_ids uuid[] NULL,
  ADD COLUMN IF NOT EXISTS filter_snapshot jsonb NULL;

COMMENT ON COLUMN public.broadcast_messages.target_user_ids IS 'Явный список user_id получателей (используется при рассылке из фильтрованного списка участников). Если NULL — работает выбор audience.';
COMMENT ON COLUMN public.broadcast_messages.filter_snapshot IS 'Снимок фильтров списка участников на момент отправки (statuses, streams, tag_ids) — для журнала.';