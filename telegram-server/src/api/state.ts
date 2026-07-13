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
  const {
    initData, action = 'get_state', schedule_id, from, days, message, history,
    activity_type, text, ascetic_id, assignment_id, content, file_url,
    file_name, file_base64, weight, height, birth_date,
  } = req.body as {
    initData?: string;
    action?: string;
    schedule_id?: string;
    from?: string;
    days?: number;
    message?: string;
    history?: ChatHistoryMessage[];
    activity_type?: string;
    text?: string;
    ascetic_id?: string;
    assignment_id?: string;
    content?: string;
    file_url?: string;
    file_name?: string;
    file_base64?: string;
    weight?: number;
    height?: number;
    birth_date?: string;
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

  if (action === 'get_ascetics') {
    const { data, error } = await supabase.rpc('get_ascetic_for_user', {
      p_telegram_id: telegramId,
    });

    if (error) {
      console.error('[state/get_ascetics] RPC error:', error.message);
      res.status(500).json({ ok: false, error: 'rpc_error' });
      return;
    }

    if (!data?.found) {
      res.json({ ok: false, error: 'not_linked' });
      return;
    }

    res.json({ ok: true, data });
    return;
  }

  if (action === 'take_ascetic') {
    if (!text || typeof text !== 'string' || !text.trim()) {
      res.status(400).json({ ok: false, error: 'missing_text' });
      return;
    }

    const { data, error } = await supabase.rpc('take_ascetic', {
      p_telegram_id: telegramId,
      p_text: text.trim(),
    });

    if (error) {
      console.error('[state/take_ascetic] RPC error:', error.message);
      res.status(500).json({ ok: false, error: 'rpc_error' });
      return;
    }

    if (!data?.ok) {
      res.status(400).json({ ok: false, error: data?.error ?? 'take_ascetic_failed' });
      return;
    }

    res.json({ ok: true, data });
    return;
  }

  if (action === 'checkin_ascetic') {
    if (!ascetic_id || typeof ascetic_id !== 'string') {
      res.status(400).json({ ok: false, error: 'missing_ascetic_id' });
      return;
    }

    const { data, error } = await supabase.rpc('checkin_ascetic', {
      p_telegram_id: telegramId,
      p_ascetic_id: ascetic_id,
    });

    if (error) {
      console.error('[state/checkin_ascetic] RPC error:', error.message);
      res.status(500).json({ ok: false, error: 'rpc_error' });
      return;
    }

    if (!data?.ok) {
      res.status(400).json({ ok: false, error: data?.error ?? 'checkin_ascetic_failed' });
      return;
    }

    res.json({ ok: true, data });
    return;
  }

  // TODO: напоминалки (например, ежедневный пуш "Не забудь отметить аскезу")
  // — реализуем отдельно, требует Telegram push-уведомлений по расписанию.

  if (action === 'get_homework') {
    const { data, error } = await supabase.rpc('get_homework_for_user', {
      p_telegram_id: telegramId,
    });

    if (error) {
      console.error('[state/get_homework] RPC error:', error.message);
      res.status(500).json({ ok: false, error: 'rpc_error' });
      return;
    }

    if (!data?.found) {
      res.json({ ok: false, error: 'not_linked' });
      return;
    }

    // Подписываем ссылки на прикреплённые к заданиям файлы (приватный bucket)
    const homework = Array.isArray(data.homework) ? data.homework : [];
    for (const hw of homework) {
      if (hw && typeof hw.file_url === 'string' && hw.file_url) {
        const { data: signed } = await supabase.storage
          .from('homework-files')
          .createSignedUrl(hw.file_url, 60 * 60);
        hw.file_signed_url = signed?.signedUrl ?? null;
      }
    }

    res.json({ ok: true, data: { ...data, homework } });
    return;
  }

  if (action === 'submit_homework') {
    if (!assignment_id || typeof assignment_id !== 'string') {
      res.status(400).json({ ok: false, error: 'missing_assignment_id' });
      return;
    }

    const hasContent = typeof content === 'string' && content.trim().length > 0;
    const hasFile = typeof file_url === 'string' && file_url.trim().length > 0;
    if (!hasContent && !hasFile) {
      res.status(400).json({ ok: false, error: 'missing_content' });
      return;
    }

    const { data, error } = await supabase.rpc('submit_homework', {
      p_telegram_id: telegramId,
      p_assignment_id: assignment_id,
      p_content: hasContent ? content!.trim() : '',
      p_file_url: hasFile ? file_url!.trim() : null,
    });

    if (error) {
      console.error('[state/submit_homework] RPC error:', error.message);
      res.status(500).json({ ok: false, error: 'rpc_error' });
      return;
    }

    if (!data?.ok) {
      res.status(400).json({ ok: false, error: data?.error ?? 'submit_homework_failed' });
      return;
    }

    // Начисление монет за сдачу ДЗ — если правила нет/неактивно, просто
    // пропускаем начисление, не проваливая сам ответ на submit_homework.
    if (data.user_id && data.submission_id) {
      const { error: awardError } = await supabase.rpc('award_coins_by_rule', {
        p_user_id: data.user_id,
        p_rule_code: 'homework_submission',
        p_source_type: 'homework_submission',
        p_source_id: data.submission_id,
        p_reason: 'Сдача ДЗ',
      });

      if (awardError) {
        console.warn('[state/submit_homework] award_coins_by_rule skipped:', awardError.message);
      }
    }

    res.json({ ok: true, data });
    return;
  }

  if (action === 'upload_homework_file') {
    if (!file_base64 || typeof file_base64 !== 'string') {
      res.status(400).json({ ok: false, error: 'missing_file' });
      return;
    }

    let buffer: Buffer;
    try {
      buffer = Buffer.from(file_base64, 'base64');
    } catch {
      res.status(400).json({ ok: false, error: 'invalid_file' });
      return;
    }

    if (buffer.length === 0 || buffer.length > 10 * 1024 * 1024) {
      res.status(400).json({ ok: false, error: 'file_too_large' });
      return;
    }

    // Имя: только безопасные символы, сохраняем расширение
    const rawName = typeof file_name === 'string' && file_name.trim() ? file_name.trim() : 'file';
    const safeName = rawName.replace(/[^a-zA-Z0-9а-яА-ЯёЁ._-]+/g, '_').slice(-80);
    const path = `submissions/${telegramId}/${Date.now()}-${safeName}`;

    const { error: uploadError } = await supabase.storage
      .from('homework-files')
      .upload(path, buffer, { upsert: false });

    if (uploadError) {
      console.error('[state/upload_homework_file] upload error:', uploadError.message);
      res.status(500).json({ ok: false, error: 'upload_failed' });
      return;
    }

    const { data: urlData } = supabase.storage.from('homework-files').getPublicUrl(path);
    res.json({ ok: true, data: { file_url: urlData.publicUrl } });
    return;
  }

  if (action === 'get_rating') {
    const { data, error } = await supabase.rpc('get_rating_for_user', {
      p_telegram_id: telegramId,
    });

    if (error) {
      console.error('[state/get_rating] RPC error:', error.message);
      res.status(500).json({ ok: false, error: 'rpc_error' });
      return;
    }

    if (!data?.found) {
      res.json({ ok: false, error: 'not_linked' });
      return;
    }

    res.json({ ok: true, data });
    return;
  }

  if (action === 'get_profile') {
    const { data, error } = await supabase.rpc('get_profile_for_user', {
      p_telegram_id: telegramId,
    });

    if (error) {
      console.error('[state/get_profile] RPC error:', error.message);
      res.status(500).json({ ok: false, error: 'rpc_error' });
      return;
    }

    if (!data?.found) {
      res.json({ ok: false, error: 'not_linked' });
      return;
    }

    res.json({ ok: true, data });
    return;
  }

  if (action === 'update_profile') {
    const hasWeight = weight !== undefined && weight !== null && !Number.isNaN(Number(weight));
    const hasHeight = height !== undefined && height !== null && !Number.isNaN(Number(height));
    const hasBirthDate = typeof birth_date === 'string' && birth_date.trim().length > 0;

    const { data, error } = await supabase.rpc('update_profile_for_user', {
      p_telegram_id: telegramId,
      p_weight_kg: hasWeight ? Math.round(Number(weight)) : null,
      p_height_cm: hasHeight ? Math.round(Number(height)) : null,
      p_date_of_birth: hasBirthDate ? birth_date!.trim() : null,
    });

    if (error) {
      console.error('[state/update_profile] RPC error:', error.message);
      res.status(500).json({ ok: false, error: 'rpc_error' });
      return;
    }

    if (!data?.ok) {
      res.status(400).json({ ok: false, error: data?.error ?? 'update_profile_failed' });
      return;
    }

    res.json({ ok: true, data });
    return;
  }

  if (action === 'upload_avatar') {
    if (!file_base64 || typeof file_base64 !== 'string') {
      res.status(400).json({ ok: false, error: 'missing_file' });
      return;
    }

    let buffer: Buffer;
    try {
      buffer = Buffer.from(file_base64, 'base64');
    } catch {
      res.status(400).json({ ok: false, error: 'invalid_file' });
      return;
    }

    if (buffer.length === 0 || buffer.length > 5 * 1024 * 1024) {
      res.status(400).json({ ok: false, error: 'file_too_large' });
      return;
    }

    const rawName = typeof file_name === 'string' && file_name.trim() ? file_name.trim() : 'avatar.jpg';
    const safeName = rawName.replace(/[^a-zA-Z0-9а-яА-ЯёЁ._-]+/g, '_').slice(-80);
    const path = `${telegramId}/${Date.now()}-${safeName}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, buffer, { upsert: false });

    if (uploadError) {
      console.error('[state/upload_avatar] upload error:', uploadError.message);
      res.status(500).json({ ok: false, error: 'upload_failed' });
      return;
    }

    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);

    const { data, error } = await supabase.rpc('update_avatar_for_user', {
      p_telegram_id: telegramId,
      p_avatar_url: urlData.publicUrl,
    });

    if (error) {
      console.error('[state/upload_avatar] RPC error:', error.message);
      res.status(500).json({ ok: false, error: 'rpc_error' });
      return;
    }

    if (!data?.ok) {
      res.status(400).json({ ok: false, error: data?.error ?? 'update_avatar_failed' });
      return;
    }

    res.json({ ok: true, data: { avatar_url: urlData.publicUrl } });
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
