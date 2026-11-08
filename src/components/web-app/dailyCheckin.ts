export type DailyCheckin = { date: string; activities: string[] };

export function moscowDay(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Moscow', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

export function checkedActivities(value: unknown, date: string): string[] {
  if (!value || typeof value !== 'object') return [];
  const record = value as Partial<DailyCheckin>;
  if (record.date !== date || !Array.isArray(record.activities)) return [];
  return record.activities.filter((type): type is string => typeof type === 'string');
}

export function markActivity(value: unknown, date: string, activity: string): DailyCheckin {
  return { date, activities: [...new Set([...checkedActivities(value, date), activity])] };
}