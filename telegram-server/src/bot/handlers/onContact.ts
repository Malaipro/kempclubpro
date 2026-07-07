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

interface ProfilePhoneRow {
  user_id: string;
  phone: string | null;
}

// Приводит номер телефона к единому виду: 11 цифр, начинающихся с 7.
// Telegram и профили в БД хранят номер в разных форматах (+7, 8, пробелы,
// скобки, дефисы) — без нормализации сравнение по phone не срабатывает.
export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  return digits.startsWith('8') ? `7${digits.slice(1)}` : digits;
}

// Ищет уже существующий профиль по нормализованному телефону и сразу
// привязывает telegram_id — без ручной привязки администратором через
// Lovable. Возвращает user_id привязанного профиля или null, если
// совпадений по телефону нет.
async function autoLinkByPhone(telegramId: string, rawPhone: string): Promise<string | null> {
  const normalizedIncoming = normalizePhone(rawPhone);

  const { data, error } = await supabase
    .from('profiles')
    .select('user_id, phone')
    .not('phone', 'is', null);

  if (error) {
    console.error('[onContact] autoLinkByPhone lookup error:', error.message);
    return null;
  }

  const match = (data as ProfilePhoneRow[] | null ?? []).find(
    (p) => p.phone && normalizePhone(p.phone) === normalizedIncoming
  );

  if (!match) return null;

  const { error: updateError } = await supabase
    .from('profiles')
    .update({ telegram_id: telegramId })
    .eq('user_id', match.user_id);

  if (updateError) {
    console.error('[onContact] autoLinkByPhone update error:', updateError.message);
    return null;
  }

  return match.user_id;
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

  // Сначала пробуем найти уже существующий профиль по номеру телефона и
  // привязать его напрямую — без ручной привязки администратором.
  const autoLinkedUserId = await autoLinkByPhone(telegramId, contact.phone_number);

  if (autoLinkedUserId) {
    await logBotEvent({
      telegram_id: telegramId,
      event_type: 'linked',
      payload: { user_id: autoLinkedUserId, referral_code: referralCode, method: 'phone_auto_link' },
    });
    await clearSession(telegramId);
    await sendMiniAppButton(chatId, '✅ Твой Telegram привязан к аккаунту КЭМП!');
    return;
  }

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
