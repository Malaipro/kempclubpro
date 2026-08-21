// Работа со временем в фиксированном часовом поясе Москвы (UTC+3, без перехода на летнее время).
// Все времена, которые вводит пользователь в формах расписания, трактуются как московские.

export const MSK_OFFSET_MS = 3 * 60 * 60 * 1000;

const pad = (n: number) => String(n).padStart(2, '0');

/**
 * Собирает ISO-строку UTC из выбранной даты (календарь) и времени "HH:mm" по Москве.
 * UTC = введённое время - 3 часа.
 */
export function mskToUtcISO(date: Date, time: string): string {
  const [h, m] = (time || '').split(':').map(Number);
  const utcMs =
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), h || 0, m || 0, 0, 0) -
    MSK_OFFSET_MS;
  return new Date(utcMs).toISOString();
}

/** Дата, сдвинутая так, что её UTC-поля соответствуют московскому времени. */
function shifted(iso: string | Date): Date {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  return new Date(d.getTime() + MSK_OFFSET_MS);
}

/** Календарная дата по Москве (как локальная Date с 00:00) — для инпутов календаря. */
export function mskCalendarDate(iso: string | Date): Date {
  const s = shifted(iso);
  return new Date(s.getUTCFullYear(), s.getUTCMonth(), s.getUTCDate());
}

/** "dd.MM.yyyy" по Москве. */
export function formatMskDate(iso: string | Date): string {
  const s = shifted(iso);
  return `${pad(s.getUTCDate())}.${pad(s.getUTCMonth() + 1)}.${s.getUTCFullYear()}`;
}

/** "HH:mm" по Москве. */
export function formatMskTime(iso: string | Date): string {
  const s = shifted(iso);
  return `${pad(s.getUTCHours())}:${pad(s.getUTCMinutes())}`;
}

/** "HH:mm:ss" по Москве. */
export function formatMskTimeSec(iso: string | Date): string {
  const s = shifted(iso);
  return `${formatMskTime(iso)}:${pad(s.getUTCSeconds())}`;
}

const DAYS = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];

/** День недели по Москве. */
export function mskDayOfWeek(iso: string | Date): string {
  return DAYS[shifted(iso).getUTCDay()];
}
