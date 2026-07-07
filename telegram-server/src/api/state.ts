import { Router, Request, Response } from 'express';
import { config } from '../config';
import { verifyInitData, checkAuthDate, extractTelegramUser } from './verifyInitData';
import { supabase } from '../db/supabase';

export const stateRouter = Router();

const NUTRITIONIST_MODEL = 'claude-sonnet-4-6';

const NUTRITIONIST_SYSTEM_PROMPT = `Ты Макс — опытный нутрициолог, специализирующийся на питании для спорта и единоборств.
Знаешь принципы построения рациона под тренировочные нагрузки, сушку, набор массы, сгонку веса перед соревнованиями и восстановление.
Отвечай кратко и по делу, без воды и лишних вступлений. Только чистый текст, без markdown-разметки.`;

interface ChatHistoryMessage {
  role: string;
  content: string;
}

async function callNutritionist(message: string, history: ChatHistoryMessage[]): Promise<string> {
  const apiKey = process.env['ANTHROPIC_API_KEY'];
  if (!apiKey) {
    throw new Error('Missing ANTHROPIC_API_KEY');
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: NUTRITIONIST_MODEL,
      max_tokens: 1024,
      system: NUTRITIONIST_SYSTEM_PROMPT,
      messages: [
        ...history.map((h) => ({ role: h.role, content: h.content })),
        { role: 'user', content: message },
      ],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Anthropic API error ${response.status}: ${errText}`);
  }

  const data = (await response.json()) as {
    content: Array<{ type: string; text?: string }>;
  };

  const textBlock = data.content.find((block) => block.type === 'text');
  return textBlock?.text ?? '';
}

stateRouter.post('/', async (req: Request, res: Response) => {
  const { initData, action = 'get_state', schedule_id, from, days, message, history, activity_type } = req.body as {
    initData?: string;
    action?: string;
    schedule_id?: string;
    from?: string;
    days?: number;
    message?: string;
    history?: ChatHistoryMessage[];
    activity_type?: string;
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

  if (action === 'check_in') {
    if (!activity_type || typeof activity_type !== 'string') {
      res.status(400).json({ ok: false, error: 'missing_activity_type' });
      return;
    }

    const { data, error } = await supabase.rpc('check_in_activity', {
      p_telegram_id: telegramId,
      p_activity_type: activity_type,
    });

    if (error) {
      console.error('[state/check_in] RPC error:', error.message);
      res.status(500).json({ ok: false, error: 'rpc_error' });
      return;
    }

    res.json({ ok: true, data });
    return;
  }

  if (action === 'nutrition_chat') {
    if (!message || typeof message !== 'string') {
      res.status(400).json({ ok: false, error: 'missing_message' });
      return;
    }

    try {
      const reply = await callNutritionist(message, Array.isArray(history) ? history : []);
      res.json({ ok: true, data: { reply } });
    } catch (err) {
      console.error('[state/nutrition_chat] error:', err instanceof Error ? err.message : err);
      res.status(500).json({ ok: false, error: 'nutrition_chat_error' });
    }
    return;
  }

  // Неизвестный action — зарезервировано для будущих расширений
  res.status(400).json({ ok: false, error: 'unknown_action' });
});
