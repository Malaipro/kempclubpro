import { getPublicUrl } from '../lib/assets';
import { useV005Design } from '../lib/playtest';

export type NavSection = 'path' | 'cells' | 'reflections' | 'profile';

interface BottomNavProps {
  active: NavSection;
  onNavigate: (section: NavSection) => void;
}

const items: Array<{ id: NavSection; label: string; icon: string }> = [
  { id: 'path', label: 'Путь', icon: '/icons/nav_path.svg' },
  { id: 'cells', label: 'Клетки', icon: '/icons/nav_map.svg' },
  { id: 'reflections', label: 'Размышления', icon: '/icons/nav_journal.svg' },
  { id: 'profile', label: 'Профиль', icon: '/icons/nav_profile.svg' },
];

export function BottomNav({ active, onNavigate }: BottomNavProps) {
  return (
    <nav
      aria-label="Основная навигация"
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-bronze/20 bg-ink/95 backdrop-blur"
    >
      <div className="mx-auto flex h-[calc(72px+env(safe-area-inset-bottom))] max-w-[430px] items-start px-2 pt-2 pb-[env(safe-area-inset-bottom)]">
        {items.map((item) => {
          const isActive = active === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`flex min-h-touch flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-opacity ${
                isActive ? 'text-bronze opacity-100' : 'text-muted opacity-55 hover:opacity-80'
              }`}
            >
              <img src={getPublicUrl(useV005Design ? `/v005/navigation/nav_${item.id}@2x.png` : item.icon)} alt="" width={24} height={24} aria-hidden="true" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
