import React from 'react';
import { Home, Calendar, ClipboardList, Activity, Flame, Users, User, Salad } from 'lucide-react';
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
  { section: 'home', label: 'Главная', icon: <Home className="w-5 h-5" /> },
  { section: 'schedule', label: 'Расписание', icon: <Calendar className="w-5 h-5" /> },
  { section: 'activities', label: 'Отметки', icon: <Activity className="w-5 h-5" />, intensiveOnly: true },
  { section: 'ascetics', label: 'Аскезы', icon: <Flame className="w-5 h-5" />, intensiveOnly: true },
  { section: 'homework', label: 'ДЗ', icon: <ClipboardList className="w-5 h-5" />, intensiveOnly: true },
  { section: 'nutrition', label: 'Нутрициолог', icon: <Salad className="w-5 h-5" /> },
  { section: 'mastermind_personal', label: 'Мастермайнд', icon: <Users className="w-5 h-5" />, residentOnly: true },
  { section: 'profile', label: 'Профиль', icon: <User className="w-5 h-5" />, residentOnly: true },
];

export const WebBottomNav: React.FC<Props> = ({ active, onNavigate, status }) => {
  const items = ITEMS.filter((i) => (!i.intensiveOnly || status === 'intensive_active') && (!i.residentOnly || status === 'club_resident'));

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto max-w-lg grid" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
        {items.map((item) => {
          const isActive = active === item.section;
          return (
            <Button
              key={item.section}
              type="button"
              variant="ghost"
              onClick={() => onNavigate(item.section)}
              className={`h-auto min-w-0 rounded-none px-1 py-2.5 flex flex-col items-center gap-1 transition-colors ${
                isActive ? 'text-kamp-primary' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {item.icon}
              <span className="text-[10px] font-medium leading-none">{item.label}</span>
            </Button>
          );
        })}
      </div>
    </nav>
  );
};
