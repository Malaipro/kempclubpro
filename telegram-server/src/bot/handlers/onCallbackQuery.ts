import { TelegramCallbackQuery } from '../webhook';
import { answerCallbackQuery, BroadcastButtonType } from '../telegram';
import { supabase } from '../../db/supabase';
import config from '../../config';

// callback_data формата "bc:BROADCAST_MSG_ID:BUTTON_INDEX" — см. sendBroadcastMessage
const CALLBACK_DATA_RE = /^bc:([0-9a-f-]{36}):(\d+)$/i;

interface BroadcastButtonRow {
  id?: string;
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
    .match({ broadcast_id: broadcastMessageId, user_id: userId, button_id: buttonIndex });

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

  // 3. Атомарно фиксируем клик — UNIQUE(broadcast_id, user_id, button_id)
  // защищает от повторного выполнения действия при повторном нажатии.
  const { error: responseErr } = await supabase
    .from('broadcast_responses')
    .insert({
      broadcast_id: broadcastMessageId,
      user_id: profile.user_id,
      display_name: profile.display_name,
      phone: profile.phone,
      telegram_id: telegramId,
      button_id: button.id || String(buttonIndex),
      button_label: button.label,
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


// Обработка кнопок из группового чата (gc:TARGET_ID:ACTION_TYPE)
export async function onGroupCallbackQuery(cbq: any): Promise<void> {
  const data = cbq.data as string;
  if (!data || !data.startsWith('gc:')) return;

  const parts = data.split(':');
  const targetId = parts[1];
  const actionType = parts[2]; // book_event, checkin, request_reward
  const telegramId = String(cbq.from.id);

  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_id, display_name, phone, telegram_id')
      .eq('telegram_id', telegramId)
      .maybeSingle();

    if (!profile) {
      await answerCallbackQuery(cbq.id, 'Профиль не найден. Напишите /start боту в личку.');
      return;
    }

    if (actionType === 'book_event' && targetId) {
      const { error } = await supabase
        .from('schedule_participants')
        .insert({ schedule_id: targetId, user_id: profile.user_id });

      if (error) {
        if (error.code === '23505') {
          await answerCallbackQuery(cbq.id, 'Вы уже записаны');
        } else {
          console.error('[onGroupCallbackQuery] book error:', error.message);
          await answerCallbackQuery(cbq.id, 'Ошибка записи');
        }
        return;
      }
      // Показать заметное уведомление
      await answerCallbackQuery(cbq.id, 'Вы записаны на мероприятие');

      // Изменить текст кнопки на "Записан"
      try {
        await fetch('https://api.telegram.org/bot' + config.telegram.botToken + '/editMessageReplyMarkup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: cbq.message.chat.id,
            message_id: cbq.message.message_id,
            reply_markup: JSON.stringify({ inline_keyboard: [[{ text: 'Записан', callback_data: 'gc:done:noop' }]] }),
          }),
        });
      } catch (e) {}
    } else if (actionType === 'checkin') {
      await answerCallbackQuery(cbq.id, 'Отмечено');
    } else {
      await answerCallbackQuery(cbq.id, 'Принято');
    }
  } catch (err: any) {
    console.error('[onGroupCallbackQuery] error:', err.message);
    await answerCallbackQuery(cbq.id, 'Ошибка');
  }
}


// Обработка кнопок из группового чата (gc:TARGET_ID:ACTION_TYPE)
