import React from 'react';
import { Home, Calendar, MessageCircle, User } from 'lucide-react';
import type { Section } from './WebAppShell';
import { Button } from '@/components/ui/button';

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
  residentOnly?: boolean;
}

const ITEMS: Item[] = [
  { section: 'home', label: 'Главная', icon: <Home className="w-7 h-7" /> },
  { section: 'schedule', label: 'Расписание', icon: <Calendar className="w-7 h-7" /> },
  { section: 'chat', label: 'Чат', icon: <MessageCircle className="w-7 h-7" /> },
  { section: 'profile', label: 'Профиль', icon: <User className="w-7 h-7" /> },
];

export const WebBottomNav: React.FC<Props> = ({ active, onNavigate, status }) => {
  const items = ITEMS.filter((i) => (!i.intensiveOnly || status === 'intensive_active') && (!i.residentOnly || status === 'club_resident'));

  return (
    <nav aria-label="Основная навигация" className="web-photo-bottom-nav fixed bottom-0 inset-x-0 z-50 border-t border-app-nav-border bg-app-nav">
      <div className="mx-auto max-w-lg grid" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
        {items.map((item) => {
          const isActive = active === item.section;
          return (
            <Button
              key={item.section}
              type="button"
              variant="ghost"
              aria-current={isActive ? 'page' : undefined}
              onClick={() => onNavigate(item.section)}
              className={`relative h-auto min-w-0 rounded-none hover:bg-transparent px-1 pt-2.5 pb-4 flex flex-col items-center gap-1 transition-colors ${
                isActive ? 'text-app-nav-active hover:text-app-nav-active' : 'text-app-nav-inactive hover:text-app-nav-inactive'
              }`}
            >
              {item.icon}
              <span className="text-[11px] font-medium leading-none">{item.label}</span>
              {isActive && <span className="photo-nav-indicator" aria-hidden="true" />}
            </Button>
          );
        })}
      </div>
    </nav>
  );
};
