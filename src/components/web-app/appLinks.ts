export const PUSH_SECTIONS = ['home', 'schedule', 'activities', 'profile', 'chat', 'nutrition', 'mastermind_business', 'mastermind_personal'] as const;
export function safeAppLink(value: string): string {
  const url = new URL(value, 'https://kemp-app.ru');
  if (url.origin !== 'https://kemp-app.ru' || url.pathname !== '/app' || url.hash || [...url.searchParams.keys()].some(k => k !== 'section')) throw new Error('Выберите существующий раздел приложения');
  const section = url.searchParams.get('section');
  if (section && !PUSH_SECTIONS.includes(section as typeof PUSH_SECTIONS[number])) throw new Error('Раздел недоступен для перехода');
  return section ? `/app?section=${section}` : '/app';
}