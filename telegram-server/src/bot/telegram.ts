import { config } from '../config';

const API_BASE = `https://api.telegram.org/bot${config.telegram.botToken}`;

async function call(method: string, body: Record<string, unknown>): Promise<void> {
  const res = await fetch(`${API_BASE}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`[telegram] ${method} failed: ${res.status} ${text}`);
  }
}

// Простой текст
export function sendMessage(chatId: number, text: string): Promise<void> {
  return call('sendMessage', { chat_id: chatId, text });
}

// Текст + ReplyKeyboard (кнопка «Поделиться телефоном»)
export function sendContactRequest(chatId: number, text: string): Promise<void> {
  return call('sendMessage', {
    chat_id: chatId,
    text,
    reply_markup: {
      keyboard: [[{ text: '📱 Поделиться телефоном', request_contact: true }]],
      resize_keyboard: true,
      one_time_keyboard: true,
    },
  });
}

// Текст + InlineKeyboard с кнопкой Mini App
export function sendMiniAppButton(chatId: number, text: string): Promise<void> {
  return call('sendMessage', {
    chat_id: chatId,
    text,
    reply_markup: {
      // Убираем ReplyKeyboard после привязки
      remove_keyboard: true,
    },
  }).then(() =>
    call('sendMessage', {
      chat_id: chatId,
      text: '👇 Открыть личный кабинет:',
      reply_markup: {
        inline_keyboard: [[
          { text: '🏕 Открыть КЭМП', web_app: { url: config.server.miniAppUrl } },
        ]],
      },
    })
  );
}

// Удалить ReplyKeyboard (отправить пустой remove_keyboard)
export function removeKeyboard(chatId: number, text: string): Promise<void> {
  return call('sendMessage', {
    chat_id: chatId,
    text,
    reply_markup: { remove_keyboard: true },
  });
}

export type BroadcastButtonType = 'url' | 'callback' | 'book_event' | 'request_reward';

export interface BroadcastButton {
  label: string;
  // Кнопки без type — старый формат (только label+url), трактуем как 'url'.
  type?: BroadcastButtonType;
  url?: string;
  // reward_id / schedule_id для book_event и request_reward
  target_id?: string;
}

// Рассылка: текст (+опционально фото) + inline-кнопки. chat_id — telegram_id
// из profiles, хранится строкой, Telegram API принимает его как есть.
// broadcastMessageId нужен для формирования callback_data интерактивных кнопок
// (book_event/request_reward/callback) — по нему обработчик в webhook.ts находит
// саму рассылку и её buttons в БД.
export function sendBroadcastMessage(
  telegramId: string,
  text: string,
  buttons?: BroadcastButton[] | null,
  fileUrl?: string | null,
  broadcastMessageId?: string | null
): Promise<void> {
  const reply_markup =
    buttons && buttons.length > 0
      ? {
          inline_keyboard: buttons.map((b, index) => {
            const type = b.type ?? 'url';
            if (type === 'url') {
              return [{ text: b.label, url: b.url }];
            }
            return [{ text: b.label, callback_data: `bc:${broadcastMessageId}:${index}` }];
          }),
        }
      : undefined;

  if (fileUrl) {
    return call('sendPhoto', {
      chat_id: telegramId,
      photo: fileUrl,
      caption: text,
      ...(reply_markup ? { reply_markup } : {}),
    });
  }

  return call('sendMessage', {
    chat_id: telegramId,
    text,
    ...(reply_markup ? { reply_markup } : {}),
  });
}

// Ответ на нажатие inline-кнопки с callback_data — обязателен, иначе кнопка
// в клиенте Telegram остаётся в состоянии "часики" до таймаута.
// showAlert=true показывает всплывающее окно вместо тихого тоста (для ошибок).
export function answerCallbackQuery(
  callbackQueryId: string,
  text?: string,
  showAlert = false
): Promise<void> {
  return call('answerCallbackQuery', {
    callback_query_id: callbackQueryId,
    ...(text ? { text } : {}),
    show_alert: showAlert,
  });
}
