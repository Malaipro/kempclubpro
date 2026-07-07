import { Router, Request, Response } from 'express';
import { config } from '../config';
import { supabase } from '../db/supabase';
import { sendBroadcastMessage, BroadcastButton } from '../bot/telegram';

export const broadcastRouter = Router();

interface BroadcastMessageRow {
  text: string;
  audience: string;
  buttons: BroadcastButton[] | null;
  file_url: string | null;
}

// audience → участники profiles с этим participant_status
const AUDIENCE_STATUSES: Record<string, string[]> = {
  intensive: ['intensive_active'],
  resident: ['club_resident'],
  all: ['intensive_active', 'club_resident'],
};

broadcastRouter.post('/', async (req: Request, res: Response) => {
  // Секрет из env — эндпоинт вызывается сервером/крон-джобом, не браузером
  const secret = req.header('X-Broadcast-Secret');
  if (!secret || secret !== config.broadcast.secret) {
    res.status(401).json({ ok: false, error: 'invalid_secret' });
    return;
  }

  const { broadcastId } = req.body as { broadcastId?: string };
  if (!broadcastId || typeof broadcastId !== 'string') {
    res.status(400).json({ ok: false, error: 'missing_broadcast_id' });
    return;
  }

  // 1. Загружаем рассылку
  const { data: broadcast, error: fetchError } = await supabase
    .from('broadcast_messages')
    .select('text, audience, buttons, file_url')
    .eq('id', broadcastId)
    .single<BroadcastMessageRow>();

  if (fetchError || !broadcast) {
    console.error('[broadcast] fetch error:', fetchError?.message);
    res.status(404).json({ ok: false, error: 'not_found' });
    return;
  }

  const statuses = AUDIENCE_STATUSES[broadcast.audience];
  if (!statuses) {
    res.status(400).json({ ok: false, error: 'unknown_audience' });
    return;
  }

  // 2. Получаем telegram_id всех участников нужной аудитории
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('telegram_id')
    .in('participant_status', statuses)
    .not('telegram_id', 'is', null);

  if (profilesError) {
    console.error('[broadcast] profiles error:', profilesError.message);
    res.status(500).json({ ok: false, error: 'rpc_error' });
    return;
  }

  const recipients = (profiles ?? [])
    .map((p) => p.telegram_id as string | null)
    .filter((id): id is string => !!id);

  // 3. Рассылаем каждому
  await Promise.all(
    recipients.map((telegramId) =>
      sendBroadcastMessage(telegramId, broadcast.text, broadcast.buttons, broadcast.file_url)
    )
  );

  const sentCount = recipients.length;

  // 4. Обновляем статус рассылки
  const { error: updateError } = await supabase
    .from('broadcast_messages')
    .update({
      status: 'sent',
      sent_at: new Date().toISOString(),
      recipients_count: sentCount,
    })
    .eq('id', broadcastId);

  if (updateError) {
    console.error('[broadcast] update error:', updateError.message);
  }

  // 5. Ответ
  res.json({ ok: true, sent: sentCount });
});
