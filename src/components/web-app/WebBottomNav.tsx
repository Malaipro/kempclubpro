import React from 'react';
import { Home, Calendar, ClipboardList, BarChart2, User } from 'lucide-react';
import type { Section } from '@/components/telegram-app/TelegramAppShell';

interface Props {
  active: Section;
  onNavigate: (section: Section) => void;
  status?: string | null;
}

interface Item {
  section: Section;
  label: string;
  icon: React.ReactNode;
  intensiveOnly?: boolean;
}

const ITEMS: Item[] = [
  { section: 'home', label: 'Главная', icon: <Home className="w-5 h-5" /> },
  { section: 'schedule', label: 'Расписание', icon: <Calendar className="w-5 h-5" /> },
  { section: 'homework', label: 'ДЗ', icon: <ClipboardList className="w-5 h-5" />, intensiveOnly: true },
  { section: 'rating', label: 'Рейтинг', icon: <BarChart2 className="w-5 h-5" />, intensiveOnly: true },
  { section: 'profile', label: 'Профиль', icon: <User className="w-5 h-5" /> },
];

export const WebBottomNav: React.FC<Props> = ({ active, onNavigate, status }) => {
  const items = ITEMS.filter((i) => !i.intensiveOnly || status === 'intensive_active');

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto max-w-lg grid" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
        {items.map((item) => {
          const isActive = active === item.section;
          return (
            <button
              key={item.section}
              type="button"
              onClick={() => onNavigate(item.section)}
              className={`flex flex-col items-center gap-1 py-2.5 transition-colors ${
                isActive ? 'text-kamp-primary' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {item.icon}
              <span className="text-[10px] font-medium leading-none">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
