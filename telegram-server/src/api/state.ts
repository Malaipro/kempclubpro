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
    entry_date, day_type, emotions, answers,
    reward_id, comment, challenge_id,
    task_title, task_description, task_deadline,
    group_id, member_id,
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
    entry_date?: string;
    day_type?: string;
    emotions?: Array<{ name: string; intensity: number }>;
    answers?: Array<{ prompt_id: string; text: string }>;
    reward_id?: string;
    challenge_id?: string;
    comment?: string;
    task_title?: string;
    task_description?: string;
    task_deadline?: string;
    group_id?: string;
    member_id?: string;
  };

  // Обход initData для send_to_group с admin key
  const adminKeyHeader = req.headers['x-admin-key'] as string;
  const isAdminKeyAuth = action === 'send_to_group' && adminKeyHeader === config.telegram.webhookSecret;

  if (!isAdminKeyAuth) {
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
  }

  // Проверка свежести auth_date и извлечение пользователя
  let telegramId = '';
  if (!isAdminKeyAuth) {
    if (!checkAuthDate(initData as string)) {
      res.status(401).json({ ok: false, error: 'init_data_expired' });
      return;
    }
    const user = extractTelegramUser(initData as string);
    if (!user) {
      res.status(400).json({ ok: false, error: 'missing_user' });
      return;
    }
    telegramId = String(user.id);
  }

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

    // RPC возвращает { linked: bool, state: ParticipantFullState } — telegram_id
    // не привязан ни к одному профилю, если linked === false (или data пустой)
    if (!data || !data.linked) {
      res.json({ ok: false, error: 'not_linked' });
      return;
    }

    res.json({ ok: true, action, data: data.state });
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

    // Автодобавление в мастермайнд-группу, если событие к ней привязано.
    // Best-effort: ошибка здесь не должна ломать уже успешную запись на занятие.
    // Проверяем существующее членство вручную (select, затем insert), а не через
    // INSERT ... ON CONFLICT — на mastermind_members нет гарантированного unique-констрейнта
    // (user_id, group_id) в этом репозитории, таблица заведена напрямую в Lovable.
    try {
      const { data: schedule } = await supabase
        .from('schedules')
        .select('mastermind_group_id')
        .eq('id', schedule_id)
        .maybeSingle();

      if (schedule?.mastermind_group_id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('user_id')
          .eq('telegram_id', telegramId)
          .maybeSingle();

        if (profile?.user_id) {
          const { data: existingMember } = await supabase
            .from('mastermind_members')
            .select('id')
            .eq('user_id', profile.user_id)
            .eq('group_id', schedule.mastermind_group_id)
            .maybeSingle();

          if (!existingMember) {
            const { error: mmError } = await supabase
              .from('mastermind_members')
              .insert({ user_id: profile.user_id, group_id: schedule.mastermind_group_id, is_active: true });

            if (mmError) {
              console.error('[state/book_session] mastermind insert error:', mmError.message);
            }
          }
        }
      }
    } catch (mmErr) {
      console.error('[state/book_session] mastermind auto-add error:', mmErr);
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

  if (action === 'get_pyramid') {
    const { data, error } = await supabase.rpc('get_pyramid_for_user', {
      p_telegram_id: telegramId,
    });

    if (error) {
      console.error('[state/get_pyramid] RPC error:', error.message);
      res.status(500).json({ ok: false, error: 'rpc_error' });
      return;
    }

    if (!data?.found) {
      res.json({ ok: false, error: 'not_linked' });
      return;
    }

    if (Array.isArray(data.levels)) {
      await Promise.all(
        data.levels.map(async (level: { presentation_url: string | null }) => {
          if (level.presentation_url) {
            const { data: signed, error: signErr } = await supabase.storage
              .from('pyramid-materials')
              .createSignedUrl(level.presentation_url, 3600);
            if (signErr) {
              console.error('[state/get_pyramid] sign error:', signErr.message);
              level.presentation_url = null;
            } else {
              level.presentation_url = signed?.signedUrl ?? null;
            }
          }
        })
      );
    }

    res.json({ ok: true, data });
    return;
  }

  if (action === 'get_journal') {
    const hasDate = typeof entry_date === 'string' && entry_date.trim().length > 0;

    const { data, error } = await supabase.rpc('get_journal_for_user', {
      p_telegram_id: telegramId,
      ...(hasDate ? { p_date: entry_date!.trim() } : {}),
    });

    if (error) {
      console.error('[state/get_journal] RPC error:', error.message);
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

  if (action === 'save_journal') {
    if (!entry_date || typeof entry_date !== 'string') {
      res.status(400).json({ ok: false, error: 'missing_entry_date' });
      return;
    }

    if (!day_type || typeof day_type !== 'string') {
      res.status(400).json({ ok: false, error: 'missing_day_type' });
      return;
    }

    const { data, error } = await supabase.rpc('save_journal_entry', {
      p_telegram_id: telegramId,
      p_entry_date: entry_date,
      p_day_type: day_type,
      p_emotions: Array.isArray(emotions) ? emotions : [],
      p_answers: Array.isArray(answers) ? answers : [],
    });

    if (error) {
      console.error('[state/save_journal] RPC error:', error.message);
      res.status(500).json({ ok: false, error: 'rpc_error' });
      return;
    }

    if (!data?.ok) {
      res.status(400).json({ ok: false, error: data?.error ?? 'save_journal_failed' });
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

  if (action === 'get_shop') {
    // Находим user_id по telegram_id
    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('telegram_id', telegramId)
      .maybeSingle();

    if (profileErr || !profile) {
      res.json({ ok: false, error: 'not_linked' });
      return;
    }

    const userId = profile.user_id;

    const [rewardsRes, balanceRes, requestsRes] = await Promise.all([
      supabase
        .from('rewards')
        .select('id, title, description, image_url, cost_coins, stock')
        .eq('is_active', true)
        .order('sort_order'),
      supabase.rpc('get_user_coin_balance', { p_user_id: userId }),
      supabase
        .from('reward_requests')
        .select('id, status, cost_coins, admin_comment, created_at, reward:rewards(title)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false }),
    ]);

    if (rewardsRes.error || balanceRes.error || requestsRes.error) {
      console.error('[state/get_shop] error:',
        rewardsRes.error?.message, balanceRes.error?.message, requestsRes.error?.message);
      res.status(500).json({ ok: false, error: 'rpc_error' });
      return;
    }

    const myRequests = (requestsRes.data || []).map((r: any) => ({
      id: r.id,
      status: r.status,
      cost_coins: r.cost_coins,
      admin_comment: r.admin_comment,
      created_at: r.created_at,
      reward_title: r.reward?.title ?? 'Награда',
    }));

    res.json({
      ok: true,
      data: {
        rewards: rewardsRes.data || [],
        balance: Number(balanceRes.data) || 0,
        my_requests: myRequests,
      },
    });
    return;
  }

  if (action === 'purchase_reward') {
    if (!reward_id || typeof reward_id !== 'string') {
      res.status(400).json({ ok: false, error: 'missing_reward_id' });
      return;
    }

    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('telegram_id', telegramId)
      .maybeSingle();

    if (profileErr || !profile) {
      res.json({ ok: false, error: 'not_linked' });
      return;
    }

    const { data, error } = await supabase.rpc('server_create_reward_request', {
      p_user_id: profile.user_id,
      p_reward_id: reward_id,
      p_user_comment: typeof comment === 'string' && comment.trim() ? comment.trim() : null,
    });

    if (error) {
      console.error('[state/purchase_reward] RPC error:', error.message);
      const userMessage = error.message.includes('коинов') || error.message.includes('Награда') || error.message.includes('Магазин')
        ? error.message
        : 'rpc_error';
      res.status(400).json({ ok: false, error: userMessage });
      return;
    }

    res.json({ ok: true, data: { request_id: data } });
    return;
  }


  if (action === 'get_challenges') {
    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('user_id, participant_status, referral_code')
      .eq('telegram_id', telegramId)
      .maybeSingle();

    if (profileErr || !profile) {
      res.json({ ok: false, error: 'not_linked' });
      return;
    }

    // Таргетинг: фильтруем челленджи по статусу и тегам участника
    // target_statuses = null означает "для всех"

    const [chRes, entRes] = await Promise.all([
      supabase.from('challenges').select('id, name, description, prize_description, start_date, end_date, max_per_day, is_active').eq('is_active', true).order('created_at', { ascending: false }),
      supabase.from('challenge_entries').select('id, challenge_id, entry_date, created_at').eq('user_id', profile.user_id).order('entry_date', { ascending: false }),
    ]);

    if (chRes.error || entRes.error) {
      console.error('[state/get_challenges] error:', chRes.error?.message, entRes.error?.message);
      res.status(500).json({ ok: false, error: 'rpc_error' });
      return;
    }

    res.json({ ok: true, data: { challenges: chRes.data || [], entries: entRes.data || [], referral_code: profile.referral_code || null } });
    return;
  }

  if (action === 'challenge_checkin') {
    if (!challenge_id || typeof challenge_id !== 'string') {
      res.status(400).json({ ok: false, error: 'missing_challenge_id' });
      return;
    }

    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('user_id, participant_status')
      .eq('telegram_id', telegramId)
      .maybeSingle();

    if (profileErr || !profile) {
      res.json({ ok: false, error: 'not_linked' });
      return;
    }

    // Доступ к челленджам для всех связанных участников

    const { data, error } = await supabase.rpc('server_challenge_checkin', {
      p_user_id: profile.user_id,
      p_challenge_id: challenge_id,
    });

    if (error) {
      console.error('[state/challenge_checkin] RPC error:', error.message);
      res.status(400).json({ ok: false, error: error.message });
      return;
    }

    if (!data?.ok) {
      res.status(400).json({ ok: false, error: data?.error || 'checkin_failed' });
      return;
    }

    res.json({ ok: true, data });
    return;
  }


  if (action === 'cancel_booking') {
    if (!schedule_id || typeof schedule_id !== 'string') {
      res.status(400).json({ ok: false, error: 'missing_schedule_id' });
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('telegram_id', telegramId)
      .maybeSingle();

    if (!profile) {
      res.json({ ok: false, error: 'not_linked' });
      return;
    }

    const { data, error } = await supabase.rpc('server_unregister_from_event', {
      p_user_id: profile.user_id,
      p_schedule_id: schedule_id,
    });

    if (error) {
      console.error('[state/cancel_booking] RPC error:', error.message);
      res.status(400).json({ ok: false, error: error.message });
      return;
    }

    if (!data?.ok) {
      res.status(400).json({ ok: false, error: data?.error || 'cancel_failed' });
      return;
    }

    res.json({ ok: true, data });
    return;
  }


  if (action === 'get_mastermind') {
    if (!group_id || typeof group_id !== 'string') {
      res.status(400).json({ ok: false, error: 'missing_group_id' });
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('telegram_id', telegramId)
      .maybeSingle();

    if (!profile) {
      res.json({ ok: false, error: 'not_linked' });
      return;
    }

    const { data: member } = await supabase
      .from('mastermind_members')
      .select('id, request, plan, start_date, end_date, is_active')
      .eq('user_id', profile.user_id)
      .eq('group_id', group_id)
      .eq('is_active', true)
      .maybeSingle();

    if (!member) {
      res.json({ ok: true, data: { is_member: false } });
      return;
    }

    const [tasksRes, entriesRes] = await Promise.all([
      supabase.from('mastermind_tasks').select('*').eq('member_id', member.id).order('sort_order'),
      supabase.from('mastermind_entries').select('*').eq('member_id', member.id).order('created_at', { ascending: false }),
    ]);

    res.json({
      ok: true,
      data: {
        is_member: true,
        member,
        tasks: tasksRes.data || [],
        entries: entriesRes.data || [],
      },
    });
    return;
  }

  if (action === 'complete_mastermind_task') {
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('telegram_id', telegramId)
      .maybeSingle();

    if (!profile) {
      res.json({ ok: false, error: 'not_linked' });
      return;
    }

    const task_id = (req.body as any).task_id;
    const task_comment = (req.body as any).task_comment ?? (req.body as any).completion_comment;
    const task_file_url = (req.body as any).task_file_url ?? (req.body as any).completion_file_url;

    if (!task_id) {
      res.status(400).json({ ok: false, error: 'missing_task_id' });
      return;
    }

    const { data, error } = await supabase.rpc('server_complete_mastermind_task', {
      p_user_id: profile.user_id,
      p_task_id: task_id,
      p_comment: task_comment || null,
      p_file_url: task_file_url || null,
    });

    if (error) {
      console.error('[state/complete_mastermind_task] RPC error:', error.message);
      res.status(400).json({ ok: false, error: error.message });
      return;
    }

    if (!data?.ok) {
      res.status(400).json({ ok: false, error: data?.error || 'task_error' });
      return;
    }

    res.json({ ok: true, data });
    return;
  }

  if (action === 'submit_mastermind_entry') {
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('telegram_id', telegramId)
      .maybeSingle();

    if (!profile) {
      res.json({ ok: false, error: 'not_linked' });
      return;
    }

    const summary = (req.body as any).summary;
    const my_tasks = (req.body as any).my_tasks;

    if (!member_id || typeof member_id !== 'string') {
      res.status(400).json({ ok: false, error: 'missing_member_id' });
      return;
    }

    if (!summary || typeof summary !== 'string') {
      res.status(400).json({ ok: false, error: 'missing_summary' });
      return;
    }

    // Проверяем, что member_id действительно принадлежит этому пользователю.
    const { data: member } = await supabase
      .from('mastermind_members')
      .select('id')
      .eq('id', member_id)
      .eq('user_id', profile.user_id)
      .maybeSingle();

    if (!member) {
      res.status(403).json({ ok: false, error: 'not_member' });
      return;
    }

    const { data, error } = await supabase
      .from('mastermind_entries')
      .insert({
        member_id,
        summary,
        my_tasks: my_tasks || null,
      })
      .select('id')
      .single();

    if (error) {
      console.error('[state/submit_mastermind_entry] insert error:', error.message);
      res.status(400).json({ ok: false, error: error.message });
      return;
    }

    res.json({ ok: true, data: { entry_id: data.id } });
    return;
  }

  if (action === 'create_mastermind_task') {
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('telegram_id', telegramId)
      .maybeSingle();

    if (!profile) {
      res.json({ ok: false, error: 'not_linked' });
      return;
    }

    if (!member_id || typeof member_id !== 'string') {
      res.status(400).json({ ok: false, error: 'missing_member_id' });
      return;
    }

    if (!task_title || typeof task_title !== 'string' || !task_title.trim()) {
      res.status(400).json({ ok: false, error: 'missing_task_title' });
      return;
    }

    // Проверяем, что member_id действительно принадлежит этому пользователю —
    // иначе можно было бы подставить чужой member_id и создать задачу в чужой группе.
    const { data: member } = await supabase
      .from('mastermind_members')
      .select('id')
      .eq('id', member_id)
      .eq('user_id', profile.user_id)
      .maybeSingle();

    if (!member) {
      res.status(403).json({ ok: false, error: 'not_member' });
      return;
    }

    const { data: lastTask } = await supabase
      .from('mastermind_tasks')
      .select('sort_order')
      .eq('member_id', member_id)
      .order('sort_order', { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextSort = (lastTask?.sort_order ?? 0) + 1;

    const { data, error } = await supabase
      .from('mastermind_tasks')
      .insert({
        member_id,
        title: task_title.trim(),
        description: task_description || null,
        deadline: task_deadline || null,
        approval_status: 'pending',
        sort_order: nextSort,
      })
      .select('id')
      .single();

    if (error) {
      console.error('[state/create_mastermind_task] insert error:', error.message);
      res.status(400).json({ ok: false, error: error.message });
      return;
    }

    res.json({ ok: true, data: { task_id: data.id } });
    return;
  }


  if (action === 'get_rules') {
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('telegram_id', telegramId)
      .maybeSingle();

    if (!profile) {
      res.json({ ok: false, error: 'not_linked' });
      return;
    }

    const { data, error } = await supabase.rpc('get_rules_for_user', {
      p_user_id: profile.user_id,
    });

    if (error) {
      console.error('[state/get_rules] RPC error:', error.message);
      res.status(500).json({ ok: false, error: 'rpc_error' });
      return;
    }

    res.json({ ok: true, data: { documents: data || [] } });
    return;
  }


  if (action === 'get_captain_team') {
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('telegram_id', telegramId)
      .maybeSingle();

    if (!profile) {
      res.json({ ok: false, error: 'not_linked' });
      return;
    }

    // Проверяем роль капитана
    const { data: role } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', profile.user_id)
      .eq('role', 'captain')
      .maybeSingle();

    if (!role) {
      res.json({ ok: true, data: { is_captain: false } });
      return;
    }

    // Команды капитана с участниками
    const { data: teams, error: teamsErr } = await supabase
      .from('captain_teams')
      .select('id, name, stream_id, streams(name), captain_team_members(id, user_id, traffic_light, captain_comment, profiles(display_name, telegram_id, participant_status))')
      .eq('captain_user_id', profile.user_id)
      .order('created_at', { ascending: false });

    if (teamsErr) {
      console.error('[state/get_captain_team] error:', teamsErr.message);
      res.status(500).json({ ok: false, error: 'rpc_error' });
      return;
    }

    res.json({ ok: true, data: { is_captain: true, teams: teams || [] } });
    return;
  }

  if (action === 'update_traffic_light') {
    const member_id = (req.body as any).member_id;
    const new_light = (req.body as any).new_light;
    const reason = (req.body as any).reason;

    if (!member_id || !new_light) {
      res.status(400).json({ ok: false, error: 'missing_params' });
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('telegram_id', telegramId)
      .maybeSingle();

    if (!profile) {
      res.json({ ok: false, error: 'not_linked' });
      return;
    }

    // Проверяем что этот member в команде капитана
    const { data: member } = await supabase
      .from('captain_team_members')
      .select('id, traffic_light, team_id, captain_teams!inner(captain_user_id)')
      .eq('id', member_id)
      .maybeSingle();

    if (!member || (member as any).captain_teams?.captain_user_id !== profile.user_id) {
      res.status(403).json({ ok: false, error: 'not_your_team' });
      return;
    }

    // Создаём заявку на смену
    const { error: reqErr } = await supabase
      .from('traffic_light_requests')
      .insert({
        team_member_id: member_id,
        requested_by: profile.user_id,
        current_light: member.traffic_light,
        requested_light: new_light,
        reason: reason || null,
      });

    if (reqErr) {
      console.error('[state/update_traffic_light] error:', reqErr.message);
      res.status(400).json({ ok: false, error: reqErr.message });
      return;
    }

    // Сразу обновляем светофор (без одобрения админа для капитана)
    await supabase
      .from('captain_team_members')
      .update({ traffic_light: new_light })
      .eq('id', member_id);

    res.json({ ok: true });
    return;
  }

  if (action === 'update_captain_comment') {
    const member_id = (req.body as any).member_id;
    const captain_comment = (req.body as any).captain_comment;

    if (!member_id) {
      res.status(400).json({ ok: false, error: 'missing_member_id' });
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('telegram_id', telegramId)
      .maybeSingle();

    if (!profile) {
      res.json({ ok: false, error: 'not_linked' });
      return;
    }

    const { data: member } = await supabase
      .from('captain_team_members')
      .select('id, team_id, captain_teams!inner(captain_user_id)')
      .eq('id', member_id)
      .maybeSingle();

    if (!member || (member as any).captain_teams?.captain_user_id !== profile.user_id) {
      res.status(403).json({ ok: false, error: 'not_your_team' });
      return;
    }

    await supabase
      .from('captain_team_members')
      .update({ captain_comment: captain_comment || null, comment_updated_at: new Date().toISOString() })
      .eq('id', member_id);

    res.json({ ok: true });
    return;
  }


  if (action === 'get_checkpoint') {
    const checkpoint_type = (req.body as any).checkpoint_type || 'A';

    const { data: profile } = await supabase
      .from('profiles')
      .select('user_id, current_stream_id')
      .eq('telegram_id', telegramId)
      .maybeSingle();

    if (!profile || !profile.current_stream_id) {
      res.json({ ok: false, error: 'not_linked' });
      return;
    }

    const { data: checkpoint } = await supabase
      .from('participant_checkpoints')
      .select('*')
      .eq('user_id', profile.user_id)
      .eq('stream_id', profile.current_stream_id)
      .eq('checkpoint_type', checkpoint_type)
      .maybeSingle();

    const { data: questions } = await supabase
      .from('checkpoint_questions')
      .select('id, question_text, sort_order')
      .eq('is_active', true)
      .order('sort_order');

    res.json({
      ok: true,
      data: {
        checkpoint: checkpoint || null,
        questions: questions || [],
        stream_id: profile.current_stream_id,
      },
    });
    return;
  }

  if (action === 'save_checkpoint') {
    const checkpoint_type = (req.body as any).checkpoint_type || 'A';
    const checkpoint_data = (req.body as any).checkpoint_data;

    if (!checkpoint_data) {
      res.status(400).json({ ok: false, error: 'missing_data' });
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('user_id, current_stream_id')
      .eq('telegram_id', telegramId)
      .maybeSingle();

    if (!profile || !profile.current_stream_id) {
      res.json({ ok: false, error: 'not_linked' });
      return;
    }

    const row = {
      user_id: profile.user_id,
      stream_id: profile.current_stream_id,
      checkpoint_type,
      weight_kg: checkpoint_data.weight_kg || null,
      waist_cm: checkpoint_data.waist_cm || null,
      belly_cm: checkpoint_data.belly_cm || null,
      chest_cm: checkpoint_data.chest_cm || null,
      hips_cm: checkpoint_data.hips_cm || null,
      body_fat_pct: checkpoint_data.body_fat_pct || null,
      pyramid_scores: checkpoint_data.pyramid_scores || null,
      pyramid_average: checkpoint_data.pyramid_average || null,
      personal_goal: checkpoint_data.personal_goal || null,
      personal_result: checkpoint_data.personal_result || null,
      main_achievement: checkpoint_data.main_achievement || null,
      filled_by: profile.user_id,
      updated_at: new Date().toISOString(),
    };

    const { data: existing } = await supabase
      .from('participant_checkpoints')
      .select('id')
      .eq('user_id', profile.user_id)
      .eq('stream_id', profile.current_stream_id)
      .eq('checkpoint_type', checkpoint_type)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from('participant_checkpoints')
        .update(row)
        .eq('id', existing.id);

      if (error) {
        console.error('[state/save_checkpoint] update error:', error.message);
        res.status(500).json({ ok: false, error: error.message });
        return;
      }
    } else {
      const { error } = await supabase
        .from('participant_checkpoints')
        .insert(row);

      if (error) {
        console.error('[state/save_checkpoint] insert error:', error.message);
        res.status(500).json({ ok: false, error: error.message });
        return;
      }
    }

    res.json({ ok: true });
    return;
  }


  if (action === 'get_team_leaderboard') {
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_id, current_stream_id')
      .eq('telegram_id', telegramId)
      .maybeSingle();

    if (!profile || !profile.current_stream_id) {
      res.json({ ok: false, error: 'not_linked' });
      return;
    }

    const { data, error } = await supabase.rpc('get_stream_team_ratings', {
      p_stream_id: profile.current_stream_id,
    });

    if (error) {
      console.error('[state/get_team_leaderboard] error:', error.message);
      res.status(500).json({ ok: false, error: 'rpc_error' });
      return;
    }

    // Индивидуальный рейтинг текущего пользователя
    const { data: myRating } = await supabase.rpc('calculate_participant_rating', {
      p_user_id: profile.user_id,
      p_stream_id: profile.current_stream_id,
    });

    res.json({ ok: true, data: { teams: data || [], my_rating: myRating || 0 } });
    return;
  }


  if (action === 'admin_checkin') {
    const target_user_id = (req.body as any).target_user_id;
    const checkin_type = (req.body as any).checkin_type;
    const checkin_date = (req.body as any).checkin_date;

    if (!target_user_id || !checkin_type) {
      res.status(400).json({ ok: false, error: 'missing_params' });
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('telegram_id', telegramId)
      .maybeSingle();

    if (!profile) {
      res.json({ ok: false, error: 'not_linked' });
      return;
    }

    // Проверяем: капитан этого участника или админ
    const { data: isAdmin } = await supabase.rpc('is_admin', { p_user_id: profile.user_id });
    const { data: isCaptain } = await supabase.rpc('is_captain', { p_user_id: profile.user_id });

    if (!isAdmin && !isCaptain) {
      res.status(403).json({ ok: false, error: 'Недостаточно прав' });
      return;
    }

    // Если капитан — проверяем что участник в его команде
    if (!isAdmin && isCaptain) {
      const { data: inTeam } = await supabase
        .from('captain_team_members')
        .select('id, captain_teams!inner(captain_user_id)')
        .eq('user_id', target_user_id)
        .maybeSingle();

      if (!inTeam || (inTeam as any).captain_teams?.captain_user_id !== profile.user_id) {
        res.status(403).json({ ok: false, error: 'Участник не в вашей команде' });
        return;
      }
    }

    // Получаем stream_id участника
    const { data: targetProfile } = await supabase
      .from('profiles')
      .select('current_stream_id')
      .eq('user_id', target_user_id)
      .maybeSingle();

    if (!targetProfile?.current_stream_id) {
      res.status(400).json({ ok: false, error: 'Участник не привязан к потоку' });
      return;
    }

    // Вставляем отметку
    const { error: insertErr } = await supabase
      .from('activity_checkins')
      .insert({
        user_id: target_user_id,
        activity_type: checkin_type,
        checked_at: checkin_date || new Date().toISOString().split('T')[0],
        stream_id: targetProfile.current_stream_id,
      });

    if (insertErr) {
      if (insertErr.code === '23505') {
        res.status(400).json({ ok: false, error: 'Уже отмечен на эту дату' });
        return;
      }
      console.error('[state/admin_checkin] error:', insertErr.message);
      res.status(500).json({ ok: false, error: insertErr.message });
      return;
    }

    res.json({ ok: true });
    return;
  }


  if (action === 'send_to_group') {
    const group_text = (req.body as any).group_text;
    const topic_id = (req.body as any).topic_id;
    const group_buttons = (req.body as any).group_buttons;

    if (!group_text) {
      res.status(400).json({ ok: false, error: 'missing_text' });
      return;
    }

    // При admin key auth (isAdminKeyAuth) профиль не проверяем
    if (!isAdminKeyAuth) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('telegram_id', telegramId)
        .maybeSingle();

      if (!profile) {
        res.json({ ok: false, error: 'not_linked' });
        return;
      }

      const { data: adminCheck } = await supabase.rpc('is_admin', { p_user_id: profile.user_id });
      if (!adminCheck) {
        res.status(403).json({ ok: false, error: 'Только для админов' });
        return;
      }
    }

    const GROUP_CHAT_ID = '-1002751756177';

    const body: any = {
      chat_id: GROUP_CHAT_ID,
      text: group_text,
      parse_mode: 'HTML',
    };

    if (topic_id) {
      body.message_thread_id = Number(topic_id);
    }

    if (group_buttons && Array.isArray(group_buttons) && group_buttons.length > 0) {
      const keyboard = group_buttons.map((btn: any, i: number) => {
        if (btn.type === 'url' && btn.url) {
          return [{ text: btn.label, url: btn.url }];
        }
        return [{ text: btn.label, callback_data: 'gc:' + (btn.schedule_id || btn.target_id || i) + ':' + btn.type }];
      });
      body.reply_markup = JSON.stringify({ inline_keyboard: keyboard });
    }

    const tgRes = await fetch('https://api.telegram.org/bot' + config.telegram.botToken + '/sendMessage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const tgData = await tgRes.json() as any;

    if (!tgData.ok) {
      console.error('[state/send_to_group] TG error:', tgData.description);
      res.status(500).json({ ok: false, error: tgData.description });
      return;
    }

    res.json({ ok: true, data: { message_id: tgData.result.message_id } });
    return;
  }


  if (action === 'upload_checkpoint_photo') {
    const checkpoint_type = (req.body as any).checkpoint_type || 'A';
    const photo_type = (req.body as any).photo_type;
    const file_base64 = (req.body as any).file_base64;

    if (!photo_type || !file_base64) {
      res.status(400).json({ ok: false, error: 'missing_params' });
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('user_id, current_stream_id')
      .eq('telegram_id', telegramId)
      .maybeSingle();

    if (!profile || !profile.current_stream_id) {
      res.json({ ok: false, error: 'not_linked' });
      return;
    }

    const fileName = `${profile.user_id}/${checkpoint_type}_${photo_type}.jpg`;
    const buffer = Buffer.from(file_base64, 'base64');

    const { error: uploadErr } = await supabase.storage
      .from('checkpoints')
      .upload(fileName, buffer, { contentType: 'image/jpeg', upsert: true });

    if (uploadErr) {
      console.error('[state/upload_checkpoint_photo] upload error:', uploadErr.message);
      res.status(500).json({ ok: false, error: uploadErr.message });
      return;
    }

    const { data: urlData } = supabase.storage
      .from('checkpoints')
      .getPublicUrl(fileName);

    const publicUrl = `${urlData.publicUrl}?v=${Date.now()}`;

    // Обновляем photo_urls в participant_checkpoints
    const { data: existing } = await supabase
      .from('participant_checkpoints')
      .select('id, photo_urls')
      .eq('user_id', profile.user_id)
      .eq('stream_id', profile.current_stream_id)
      .eq('checkpoint_type', checkpoint_type)
      .maybeSingle();

    const photoUrls = (existing?.photo_urls as any) || {};
    photoUrls[photo_type] = publicUrl;

    if (existing) {
      await supabase
        .from('participant_checkpoints')
        .update({ photo_urls: photoUrls, updated_at: new Date().toISOString() })
        .eq('id', existing.id);
    } else {
      await supabase
        .from('participant_checkpoints')
        .insert({
          user_id: profile.user_id,
          stream_id: profile.current_stream_id,
          checkpoint_type,
          photo_urls: photoUrls,
          filled_by: profile.user_id,
        });
    }

    res.json({ ok: true, data: { url: publicUrl } });
    return;
  }


  if (action === 'delete_checkpoint_photo') {
    const checkpoint_type = (req.body as any).checkpoint_type || 'A';
    const photo_type = (req.body as any).photo_type;

    if (!photo_type) {
      res.status(400).json({ ok: false, error: 'missing_photo_type' });
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('user_id, current_stream_id')
      .eq('telegram_id', telegramId)
      .maybeSingle();

    if (!profile || !profile.current_stream_id) {
      res.json({ ok: false, error: 'not_linked' });
      return;
    }

    const fileName = profile.user_id + '/' + checkpoint_type + '_' + photo_type + '.jpg';

    await supabase.storage.from('checkpoints').remove([fileName]);

    const { data: existing } = await supabase
      .from('participant_checkpoints')
      .select('id, photo_urls')
      .eq('user_id', profile.user_id)
      .eq('stream_id', profile.current_stream_id)
      .eq('checkpoint_type', checkpoint_type)
      .maybeSingle();

    if (existing) {
      const photoUrls = (existing.photo_urls as any) || {};
      delete photoUrls[photo_type];
      await supabase
        .from('participant_checkpoints')
        .update({ photo_urls: photoUrls, updated_at: new Date().toISOString() })
        .eq('id', existing.id);
    }

    res.json({ ok: true });
    return;
  }


  if (action === 'update_mastermind_profile') {
    const mm_request = (req.body as any).mm_request;
    const mm_plan = (req.body as any).mm_plan;
    const member_id = (req.body as any).member_id;

    if (!member_id) {
      res.status(400).json({ ok: false, error: 'missing_member_id' });
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('telegram_id', telegramId)
      .maybeSingle();

    if (!profile) {
      res.json({ ok: false, error: 'not_linked' });
      return;
    }

    const { data: member } = await supabase
      .from('mastermind_members')
      .select('id, user_id')
      .eq('id', member_id)
      .eq('user_id', profile.user_id)
      .maybeSingle();

    if (!member) {
      res.status(403).json({ ok: false, error: 'not_your_membership' });
      return;
    }

    const updateData: any = { updated_at: new Date().toISOString() };
    if (mm_request !== undefined) updateData.request = mm_request;
    if (mm_plan !== undefined) updateData.plan = mm_plan;

    const { error } = await supabase
      .from('mastermind_members')
      .update(updateData)
      .eq('id', member_id);

    if (error) {
      console.error('[state/update_mastermind_profile] error:', error.message);
      res.status(500).json({ ok: false, error: error.message });
      return;
    }

    res.json({ ok: true });
    return;
  }


  if (action === 'get_daily_prompts') {
    const today = new Date();
    const moscowDay = new Date(today.getTime() + 3 * 60 * 60 * 1000).getUTCDay();

    const { data, error } = await supabase
      .from('daily_prompts')
      .select('id, question_text, activity_type, sort_order')
      .eq('day_of_week', moscowDay)
      .eq('is_active', true)
      .order('sort_order');

    if (error) {
      console.error('[state/get_daily_prompts] error:', error.message);
      res.status(500).json({ ok: false, error: 'rpc_error' });
      return;
    }

    res.json({ ok: true, data: { prompts: data || [], day_of_week: moscowDay } });
    return;
  }

  // Неизвестный action — зарезервировано для будущих расширений
  res.status(400).json({ ok: false, error: 'unknown_action' });
});
