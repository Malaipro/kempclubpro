import { TelegramMessage } from '../webhook';
import { sendContactRequest } from '../telegram';
import { logBotEvent } from '../../utils/logger';
import { saveSession } from '../../utils/session';

// /start [referral_code]
// Telegram передаёт payload после /start через пробел: "/start REF123"
export async function onStart(msg: TelegramMessage): Promise<void> {
  const chatId = msg.chat.id;
  const telegramId = String(msg.from?.id ?? chatId);

  // Извлекаем referral_code из payload, если есть
  const parts = (msg.text ?? '').trim().split(' ');
  const referralCode = parts.length > 1 && parts[1] ? parts[1] : null;

  await logBotEvent({
    telegram_id: telegramId,
    event_type: 'start',
    payload: {
      referral_code: referralCode,
      username: msg.from?.username ?? null,
    },
  });

  // Сохраняем referral_code в сессии только если он пришёл в payload
  if (referralCode) {
    await saveSession(telegramId, referralCode);
  }

  await sendContactRequest(
    chatId,
    'Привет! Чтобы получить доступ к личному кабинету КЭМП — поделись номером телефона. ' +
    'Нажми кнопку ниже 👇'
  );
}
