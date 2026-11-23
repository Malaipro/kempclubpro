/**
 * Заглушка reminders для предпросмотра в кабинете.
 * Без Telegram-контекста уведомления всегда unavailable.
 */
export type ReminderStatus = 'unknown' | 'scheduled' | 'unavailable' | 'error';
export type ReminderScheduleMode = 'start' | 'reconcile';

export async function scheduleVisitReminders(_args: unknown): Promise<ReminderStatus> {
  return 'unavailable';
}

export async function cancelVisitReminders(_initData: string, _visitId: string): Promise<void> {
  // no-op
}
