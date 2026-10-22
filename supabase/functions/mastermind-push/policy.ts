export function moscowDate(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Moscow', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

export function moscowMinutes(now = new Date()): number {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Moscow', hour: '2-digit', minute: '2-digit', hour12: false }).format(now).split(':');
  return Number(parts[0]) * 60 + Number(parts[1]);
}

export function reminderKind(deadline: string, today: string): 'day_before' | 'due_day' | null {
  const delta = (Date.parse(`${deadline}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86400000;
  return delta === 1 ? 'day_before' : delta === 0 ? 'due_day' : null;
}

export function eligible(task: { is_completed: boolean | null; is_failed: boolean | null; approval_status: string | null }, active: boolean): boolean {
  return active && !task.is_completed && !task.is_failed && !['pending', 'rejected'].includes(task.approval_status ?? 'approved');
}

// Self check-in is open only on the meeting's Moscow calendar day until 23:55 MSK.
export function canCheckin(meetingIso: string, now = new Date()): boolean {
  return moscowDate(new Date(meetingIso)) === moscowDate(now) && moscowMinutes(now) <= 23 * 60 + 55;
}

export type JobKind = 'tasks' | 'meetings' | 'auto_absent';

export function parseKind(value: unknown): JobKind | null {
  if (value === undefined) return 'tasks';
  return value === 'tasks' || value === 'meetings' || value === 'auto_absent' ? value : null;
}

export function payload(kind: string) {
  // Personal goals/results and task titles deliberately stay off the lock screen.
  if (kind === 'meeting') return { title: 'Мастермайнд КЭМП', body: 'Сегодня встреча мастермайнда. Отметьтесь в приложении до 23:55 МСК.', url: '/app' };
  return { title: 'Мастермайнд КЭМП', body: kind === 'day_before' ? 'Завтра срок задачи. Зафиксируйте результат в мастермайнде.' : 'Сегодня срок задачи. Зафиксируйте результат в мастермайнде.', url: '/app' };
}
