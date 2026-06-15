import { TelegramMessage } from '../webhook';
import { sendMessage } from '../telegram';
import { logBotEvent } from '../../utils/logger';

export async function onUnknown(msg: TelegramMessage): Promise<void> {
  const chatId = msg.chat.id;
  const telegramId = String(msg.from?.id ?? chatId);

  await logBotEvent({
    telegram_id: telegramId,
    event_type: 'unknown_message',
    payload: { text: msg.text ?? null },
  });

  await sendMessage(chatId, 'Отправь /start для начала работы.');
}
