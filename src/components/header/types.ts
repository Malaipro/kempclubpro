
export interface NavigationItem {
  id: string;
  title: string;
  href: string;
}

export interface MenuItem {
  id: string;
  label: string;
  href?: string; // Опциональная ссылка на внешнюю страницу
}

export const navigationItems: NavigationItem[] = [
  { id: 'about', title: 'О нас', href: '#about' },
  { id: 'philosophy', title: 'Философия', href: '#philosophy' },
  { id: 'program', title: 'Программа', href: '#program' },
  { id: 'trainers', title: 'Тренеры', href: '#trainers' },
  { id: 'services', title: 'Пакеты услуг', href: '#services' },
  { id: 'gallery', title: 'Галерея', href: '#gallery' },
  { id: 'leaderboard', title: 'Лидерборд', href: '#leaderboard' },
  { id: 'testimonials', title: 'Отзывы', href: '#testimonials' },
  { id: 'contact', title: 'Контакты', href: '#contact' }
];
