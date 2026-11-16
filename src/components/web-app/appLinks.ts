export const PUSH_SECTIONS = ['home', 'schedule', 'activities', 'profile', 'chat', 'nutrition', 'mastermind_business', 'mastermind_personal'] as const;
export function safeAppLink(value: string): string {
  const url = new URL(value, 'https://kemp-app.ru');
  if (url.origin !== 'https://kemp-app.ru' || url.pathname !== '/app' || url.hash || [...url.searchParams.keys()].some(k => k !== 'section')) throw new Error('Выберите существующий раздел приложения');
  const section = url.searchParams.get('section');
  if (section && !PUSH_SECTIONS.includes(section as typeof PUSH_SECTIONS[number])) throw new Error('Раздел недоступен для перехода');
  return section ? `/app?section=${section}` : '/app';
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// Ссылки входа/открытия приложения: всё, что принимает safeAppLink, плюс
// /app?section=schedule&event=<uuid> для открытия конкретной карточки (будущие кнопки Telegram).
// Push-ссылки по-прежнему проверяются safeAppLink без изменений.
export function safeAppReturnLink(value: string): string {
  const url = new URL(value, 'https://kemp-app.ru');
  const event = url.searchParams.get('event');
  if (event !== null) {
    if (url.origin !== 'https://kemp-app.ru' || url.pathname !== '/app' || url.hash
      || [...url.searchParams.keys()].some(k => k !== 'section' && k !== 'event')
      || url.searchParams.getAll('event').length !== 1
      || url.searchParams.get('section') !== 'schedule' || !UUID.test(event)) throw new Error('Некорректная ссылка на мероприятие');
    return `/app?section=schedule&event=${event.toLowerCase()}`;
  }
  return safeAppLink(value);
}
export function eventIdFromAppLink(link: string): string | null {
  return new URL(link, 'https://kemp-app.ru').searchParams.get('event');
}
