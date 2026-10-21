export function moscowDate(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Moscow', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

export function reminderKind(deadline: string, today: string): 'day_before' | 'due_day' | null {
  const delta = (Date.parse(`${deadline}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86400000;
  return delta === 1 ? 'day_before' : delta === 0 ? 'due_day' : null;
}

export function eligible(task: { is_completed: boolean | null; is_failed: boolean | null; approval_status: string | null }, active: boolean): boolean {
  return active && !task.is_completed && !task.is_failed && !['pending', 'rejected'].includes(task.approval_status ?? 'approved');
}

export function payload(kind: string) {
  // Personal goals/results and task titles deliberately stay off the lock screen.
  return { title: 'Мастермайнд КЭМП', body: kind === 'day_before' ? 'Завтра срок задачи. Зафиксируйте результат в мастермайнде.' : 'Сегодня срок задачи. Зафиксируйте результат в мастермайнде.', url: '/app' };
}