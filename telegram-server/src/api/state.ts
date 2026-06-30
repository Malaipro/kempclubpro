import { Router, Request, Response } from 'express';
import { config } from '../config';
import { verifyInitData, checkAuthDate, extractTelegramUser } from './verifyInitData';
import { supabase } from '../db/supabase';

export const stateRouter = Router();

stateRouter.post('/', async (req: Request, res: Response) => {
  const { initData, action = 'get_state', schedule_id, from, days } = req.body as {
    initData?: string;
    action?: string;
    schedule_id?: string;
    from?: string;
    days?: number;
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

  if (action === 'get_schedule') {
    const { data, error } = await supabase.rpc('get_schedule_for_user', {
      p_telegram_id: telegramId,
      p_from: from ?? new Date().toISOString(),
      p_days: days ?? 7,
    });

    if (error) {
      console.error('[state/get_schedule] RPC error:', error.message);
      res.status(500).json({ ok: false, error: 'rpc_error' });
      return;
    }

    res.json({ ok: true, action, data });
    return;
  }

  if (action === 'book_session') {
    if (!schedule_id || typeof schedule_id !== 'string') {
      res.status(400).json({ ok: false, error: 'missing_schedule_id' });
      return;
    }

    const { data, error } = await supabase.rpc('book_schedule_session', {
      p_telegram_id: telegramId,
      p_schedule_id: schedule_id,
    });

    if (error) {
      console.error('[state/book_session] RPC error:', error.message);
      res.status(500).json({ ok: false, error: 'rpc_error' });
      return;
    }

    res.json({ ok: true, action, data });
    return;
  }

  // Неизвестный action — зарезервировано для будущих расширений
  res.status(400).json({ ok: false, error: 'unknown_action' });
});
