import { TelegramMessage } from '../webhook';
import { sendMiniAppButton, sendMessage } from '../telegram';
import { logBotEvent } from '../../utils/logger';
import { supabase } from '../../db/supabase';

interface LinkCodeResult {
  linked: boolean;
  message?: string;
}

// Резервный сценарий: /link CODE
// Используется когда пользователь получил код привязки через сайт (TelegramLinkCard)
export async function onLinkCode(msg: TelegramMessage): Promise<void> {
  const chatId = msg.chat.id;
  const from = msg.from;
  const telegramId = String(from?.id ?? chatId);

  const parts = (msg.text ?? '').trim().split(' ');
  const code = parts[1] ?? '';

  await logBotEvent({
    telegram_id: telegramId,
    event_type: 'link_code_attempt',
    payload: { code_provided: !!code },
  });

  if (!code) {
    await sendMessage(chatId, 'Укажи код после команды: /link КОД');
    return;
  }

  const { data, error } = await supabase.rpc('link_telegram_profile', {
    p_telegram_id: telegramId,
    p_telegram_username: from?.username ?? null,
    p_telegram_first_name: from?.first_name ?? null,
    p_telegram_last_name: from?.last_name ?? null,
    p_link_code: code,
  });

  if (error) {
    console.error('[onLinkCode] RPC error:', error.message);
    await logBotEvent({
      telegram_id: telegramId,
      event_type: 'link_code_failed',
      payload: { error: error.message },
    });
    await sendMessage(chatId, 'Код не найден или устарел. Получи новый в личном кабинете на сайте.');
    return;
  }

  const result = data as LinkCodeResult;

  if (result?.linked) {
    await logBotEvent({ telegram_id: telegramId, event_type: 'link_code_success' });
    await sendMiniAppButton(chatId, '✅ Telegram привязан к аккаунту КЭМП!');
  } else {
    await logBotEvent({
      telegram_id: telegramId,
      event_type: 'link_code_failed',
      payload: { message: result?.message ?? null },
    });
    await sendMessage(chatId, 'Код не найден или устарел. Получи новый в личном кабинете на сайте.');
  }
}
