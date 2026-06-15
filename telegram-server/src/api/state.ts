import { Router, Request, Response } from 'express';
import { config } from '../config';
import { verifyInitData, checkAuthDate, extractTelegramUser } from './verifyInitData';
import { supabase } from '../db/supabase';

export const stateRouter = Router();

stateRouter.post('/', async (req: Request, res: Response) => {
  const { initData, action = 'get_state' } = req.body as {
    initData?: string;
    action?: string;
  };

  // Базовая валидация тела запроса
  if (!initData || typeof initData !== 'string') {
    res.status(400).json({ ok: false, error: 'missing_init_data' });
    return;
  }

  // Проверка HMAC-подписи — на сервере, с botToken из ENV
  if (!verifyInitData(initData, config.telegram.botToken)) {
    res.status(401).json({ ok: false, error: 'invalid_init_data' });
    return;
  }

  // Проверка свежести auth_date (не старше 24 часов)
  if (!checkAuthDate(initData)) {
    res.status(401).json({ ok: false, error: 'init_data_expired' });
    return;
  }

  // Извлекаем пользователя из initData
  const user = extractTelegramUser(initData);
  if (!user) {
    res.status(400).json({ ok: false, error: 'missing_user' });
    return;
  }

  const telegramId = String(user.id);

  if (action === 'get_state') {
    const { data, error } = await supabase.rpc(
      'get_participant_full_state_by_telegram',
      { p_telegram_id: telegramId }
    );

    if (error) {
      console.error('[state] RPC error:', error.message);
      res.status(500).json({ ok: false, error: 'rpc_error' });
      return;
    }

    // RPC вернул null — telegram_id не привязан ни к одному профилю
    if (data === null || data === undefined) {
      res.json({ ok: false, error: 'not_linked' });
      return;
    }

    res.json({ ok: true, action, data });
    return;
  }

  // Неизвестный action — зарезервировано для будущих расширений
  res.status(400).json({ ok: false, error: 'unknown_action' });
});
