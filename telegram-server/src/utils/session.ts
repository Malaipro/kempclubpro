import { supabase } from '../db/supabase';

interface BotSession {
  referral_code: string | null;
}

// Сохраняет сессию бота (upsert по telegram_id, TTL 1 час).
// Вызывается в onStart при наличии referral_code в payload.
export async function saveSession(
  telegramId: string,
  referralCode: string
): Promise<void> {
  const { error } = await supabase
    .from('telegram_bot_sessions')
    .upsert(
      {
        telegram_id: telegramId,
        referral_code: referralCode,
        expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      },
      { onConflict: 'telegram_id' }
    );

  if (error) {
    console.error('[session] saveSession error:', error.message);
  }
}

// Читает сессию по telegram_id, если она не истекла.
// Возвращает null, если сессии нет или она устарела.
export async function getSession(telegramId: string): Promise<BotSession | null> {
  const { data, error } = await supabase
    .from('telegram_bot_sessions')
    .select('referral_code')
    .eq('telegram_id', telegramId)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();

  if (error) {
    console.error('[session] getSession error:', error.message);
    return null;
  }

  return data as BotSession | null;
}

// Удаляет сессию после успешной обработки contact.
export async function clearSession(telegramId: string): Promise<void> {
  const { error } = await supabase
    .from('telegram_bot_sessions')
    .delete()
    .eq('telegram_id', telegramId);

  if (error) {
    console.error('[session] clearSession error:', error.message);
  }
}
