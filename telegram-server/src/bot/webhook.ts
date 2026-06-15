import { Router, Request, Response } from 'express';
import { config } from '../config';
import { onStart } from './handlers/onStart';
import { onContact } from './handlers/onContact';
import { onLinkCode } from './handlers/onLinkCode';
import { onUnknown } from './handlers/onUnknown';

// Минимальные типы Telegram Update / Message
export interface TelegramUser {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
}

export interface TelegramContact {
  phone_number: string;
  first_name?: string;
  last_name?: string;
  user_id?: number;
}

export interface TelegramChat {
  id: number;
}

export interface TelegramMessage {
  message_id: number;
  from?: TelegramUser;
  chat: TelegramChat;
  text?: string;
  contact?: TelegramContact;
}

export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
}

export const webhookRouter = Router();

webhookRouter.post('/', async (req: Request, res: Response) => {
  // Проверяем секрет — Telegram шлёт его в заголовке
  const secret = req.headers['x-telegram-bot-api-secret-token'];
  if (secret !== config.telegram.webhookSecret) {
    res.sendStatus(403);
    return;
  }

  // Немедленно отвечаем Telegram 200 — он не ждёт долгой обработки
  res.sendStatus(200);

  const update: TelegramUpdate = req.body;
  const msg = update.message;
  if (!msg) return;

  try {
    if (msg.contact) {
      await onContact(msg);
      return;
    }

    const text = (msg.text ?? '').trim();

    if (text.startsWith('/start')) {
      await onStart(msg);
      return;
    }

    if (text.startsWith('/link ')) {
      await onLinkCode(msg);
      return;
    }

    await onUnknown(msg);
  } catch (err) {
    console.error('[webhook] Unhandled error:', err);
  }
});
