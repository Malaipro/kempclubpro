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
