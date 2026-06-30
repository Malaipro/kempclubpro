import { TelegramMessage } from '../webhook';
import { sendMiniAppButton, removeKeyboard, sendMessage } from '../telegram';
import { logBotEvent } from '../../utils/logger';
import { getSession, clearSession } from '../../utils/session';
import { supabase } from '../../db/supabase';

// Результат RPC link_or_create_telegram_profile
interface LinkResult {
  linked: boolean;
  status: 'linked' | 'application_created' | 'waiting_admin_approval' | string;
  user_id?: string;
}

export async function onContact(msg: TelegramMessage): Promise<void> {
  const chatId = msg.chat.id;
  const contact = msg.contact!;
  const from = msg.from;
  const telegramId = String(from?.id ?? chatId);

  await logBotEvent({
    telegram_id: telegramId,
    event_type: 'contact_received',
    payload: { username: from?.username ?? null },
  });

  // Достаём referral_code из сессии (сохранён в onStart, если был payload)
  const session = await getSession(telegramId);
  const referralCode = session?.referral_code ?? null;

  const { data, error } = await supabase.rpc('link_or_create_telegram_profile', {
    p_telegram_id: telegramId,
    p_telegram_username: from?.username ?? null,
    p_telegram_first_name: from?.first_name ?? null,
    p_telegram_last_name: from?.last_name ?? null,
    p_phone: contact.phone_number,
    p_referral_code: referralCode,
  });

  if (error) {
    console.error('[onContact] RPC error:', error.message);
    await logBotEvent({
      telegram_id: telegramId,
      event_type: 'error',
      payload: { rpc: 'link_or_create_telegram_profile', error: error.message },
    });
    await sendMessage(chatId, 'Что-то пошло не так. Попробуй ещё раз или обратись к администратору.');
    return;
  }

  const result = data as LinkResult;

  // Очищаем сессию после обработки (независимо от результата)
  await clearSession(telegramId);

  if (result.linked) {
    await logBotEvent({
      telegram_id: telegramId,
      event_type: 'linked',
      payload: {
        user_id: result.user_id ?? null,
        referral_code: referralCode,
      },
    });
    await sendMiniAppButton(chatId, '✅ Твой Telegram привязан к аккаунту КЭМП!');
    return;
  }

  // Заявка создана / ожидает одобрения администратора.
  // Монеты рефереру начисляются атомарно в link_telegram_lead_to_profile (SQL)
  // при привязке заявки администратором — через award_coins_by_rule('referral_telegram_signup').
  await logBotEvent({
    telegram_id: telegramId,
    event_type: 'application_created',
    payload: { status: result.status, referral_code: referralCode },
  });
  await removeKeyboard(
    chatId,
    '📋 Заявка отправлена администратору. Как только она будет одобрена — ты получишь доступ к личному кабинету КЭМП.'
  );
}
