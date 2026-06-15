import { supabase } from '../db/supabase';

export type BotEventType =
  | 'start'
  | 'contact_received'
  | 'linked'
  | 'application_created'
  | 'link_code_attempt'
  | 'link_code_success'
  | 'link_code_failed'
  | 'unknown_message'
  | 'error';

interface LogEntry {
  telegram_id?: string;
  event_type: BotEventType;
  payload?: Record<string, unknown>;
}

export async function logBotEvent(entry: LogEntry): Promise<void> {
  const { error } = await supabase
    .from('telegram_bot_logs')
    .insert({
      telegram_id: entry.telegram_id ?? null,
      event_type: entry.event_type,
      payload: entry.payload ?? null,
    });

  // Не бросаем исключение — лог не должен ломать основной флоу бота.
  if (error) {
    console.error('[logger] Failed to write bot log:', error.message);
  }
}
