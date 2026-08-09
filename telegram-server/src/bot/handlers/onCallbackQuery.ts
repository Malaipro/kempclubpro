import { TelegramCallbackQuery } from '../webhook';
import { answerCallbackQuery, BroadcastButtonType } from '../telegram';
import { supabase } from '../../db/supabase';

// callback_data формата "bc:BROADCAST_MSG_ID:BUTTON_INDEX" — см. sendBroadcastMessage
const CALLBACK_DATA_RE = /^bc:([0-9a-f-]{36}):(\d+)$/i;

interface BroadcastButtonRow {
  label: string;
  type?: BroadcastButtonType;
  url?: string;
  target_id?: string;
}

const ALREADY_MARKED = 'Уже отмечено';

// Убирает broadcast_responses-отметку, если само действие кнопки не удалось —
// иначе пользователь навсегда останется с false-положительной галочкой без результата.
async function rollbackResponse(broadcastMessageId: string, userId: string, buttonIndex: number): Promise<void> {
  const { error } = await supabase
    .from('broadcast_responses')
    .delete()
    .match({ broadcast_message_id: broadcastMessageId, user_id: userId, button_index: buttonIndex });

  if (error) {
    console.error('[onCallbackQuery] rollback error:', error.message);
  }
}

export async function onCallbackQuery(query: TelegramCallbackQuery): Promise<void> {
  const data = query.data ?? '';
  const match = CALLBACK_DATA_RE.exec(data);

  if (!match) {
    await answerCallbackQuery(query.id);
    return;
  }

  const [, broadcastMessageId, indexStr] = match;
  const buttonIndex = Number(indexStr);
  const telegramId = String(query.from.id);

  // 1. Профиль по telegram_id
  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('user_id, display_name, phone')
    .eq('telegram_id', telegramId)
    .maybeSingle();

  if (profileErr || !profile) {
    await answerCallbackQuery(query.id, 'Профиль не найден. Откройте Mini App, чтобы привязать аккаунт.', true);
    return;
  }

  // 2. Рассылка → buttons JSONB → нужная кнопка по индексу
  const { data: broadcast, error: broadcastErr } = await supabase
    .from('broadcast_messages')
    .select('buttons')
    .eq('id', broadcastMessageId)
    .maybeSingle<{ buttons: BroadcastButtonRow[] }>();

  if (broadcastErr || !broadcast) {
    await answerCallbackQuery(query.id, 'Рассылка не найдена', true);
    return;
  }

  const button = (broadcast.buttons ?? [])[buttonIndex];
  if (!button) {
    await answerCallbackQuery(query.id, 'Кнопка не найдена', true);
    return;
  }

  const actionType = button.type === 'book_event' || button.type === 'request_reward'
    ? button.type
    : 'response';

  // 3. Атомарно фиксируем клик — UNIQUE(broadcast_message_id, user_id, button_index)
  // защищает от повторного выполнения действия при повторном нажатии.
  const { error: responseErr } = await supabase
    .from('broadcast_responses')
    .insert({
      broadcast_message_id: broadcastMessageId,
      user_id: profile.user_id,
      button_index: buttonIndex,
      action_type: actionType,
      action_target_id: button.target_id ?? null,
    });

  if (responseErr) {
    if (responseErr.code === '23505') {
      await answerCallbackQuery(query.id, ALREADY_MARKED);
      return;
    }
    console.error('[onCallbackQuery] broadcast_responses insert error:', responseErr.message);
    await answerCallbackQuery(query.id, 'Ошибка, попробуйте позже', true);
    return;
  }

  // 4. Действие по типу кнопки
  if (button.type === 'book_event') {
    if (!button.target_id) {
      await rollbackResponse(broadcastMessageId, profile.user_id, buttonIndex);
      await answerCallbackQuery(query.id, 'Некорректная кнопка', true);
      return;
    }

    const { error: bookErr } = await supabase
      .from('schedule_participants')
      .insert({ schedule_id: button.target_id, user_id: profile.user_id });

    // 23505 у schedule_participants означает "уже был записан другим путём" — не ошибка.
    if (bookErr && bookErr.code !== '23505') {
      console.error('[onCallbackQuery] schedule_participants insert error:', bookErr.message);
      await rollbackResponse(broadcastMessageId, profile.user_id, buttonIndex);
      await answerCallbackQuery(query.id, 'Не удалось записаться, попробуйте позже', true);
      return;
    }

    await answerCallbackQuery(query.id, 'Вы записаны ✅');
    return;
  }

  if (button.type === 'request_reward') {
    if (!button.target_id) {
      await rollbackResponse(broadcastMessageId, profile.user_id, buttonIndex);
      await answerCallbackQuery(query.id, 'Некорректная кнопка', true);
      return;
    }

    const { error: rewardErr } = await supabase.rpc('server_create_reward_request', {
      p_user_id: profile.user_id,
      p_reward_id: button.target_id,
      p_user_comment: null,
    });

    if (rewardErr) {
      console.error('[onCallbackQuery] server_create_reward_request error:', rewardErr.message);
      await rollbackResponse(broadcastMessageId, profile.user_id, buttonIndex);
      const userMessage = rewardErr.message.includes('коинов') || rewardErr.message.includes('Награда')
        ? rewardErr.message
        : 'Не удалось оформить заявку';
      await answerCallbackQuery(query.id, userMessage, true);
      return;
    }

    await answerCallbackQuery(query.id, 'Заявка на награду отправлена ✅');
    return;
  }

  // 'callback' — просто фиксируем ответ, без побочного действия
  await answerCallbackQuery(query.id, 'Спасибо! Ваш ответ учтён ✅');
}
