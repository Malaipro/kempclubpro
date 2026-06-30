import React from 'react';
import {
  Coins, Trophy, Star, BookOpen, Users,
  Activity, Calendar, ClipboardList, BarChart2,
  Salad, ScrollText, ShieldCheck, Home,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { ParticipantFullState } from '@/services/participantService';
import type { Section } from './TelegramAppShell';

interface Props {
  data: ParticipantFullState;
  activeSection: Section;
  onNavigate: (section: Section) => void;
}

// ---------- Stat card ----------

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}

const StatCard: React.FC<StatCardProps> = ({ icon, label, value }) => (
  <Card>
    <CardContent className="flex items-center gap-3 py-3">
      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-base font-bold truncate">{value}</p>
      </div>
    </CardContent>
  </Card>
);

// ---------- Section card ----------

interface SectionCardProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
}

const SectionCard: React.FC<SectionCardProps> = ({ icon, label, active = false, onClick }) => {
  if (active) {
    return (
      <div
        onClick={onClick}
        className={`flex flex-col items-center justify-center gap-1.5 rounded-xl border border-kamp-primary bg-kamp-primary/10 px-2 py-3 text-center${onClick ? ' cursor-pointer' : ''}`}
      >
        <div className="text-kamp-primary">{icon}</div>
        <span className="text-xs font-semibold text-kamp-primary leading-tight">{label}</span>
      </div>
    );
  }

  if (onClick) {
    return (
      <div
        onClick={onClick}
        className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-border bg-muted/40 px-2 py-3 text-center cursor-pointer hover:bg-muted/60 transition-colors"
      >
        <div className="text-muted-foreground">{icon}</div>
        <span className="text-xs font-medium text-muted-foreground leading-tight">{label}</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-border bg-muted/40 px-2 py-3 text-center opacity-50 cursor-not-allowed select-none">
      <div className="text-muted-foreground">{icon}</div>
      <span className="text-xs font-medium text-muted-foreground leading-tight">{label}</span>
      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">Скоро</Badge>
    </div>
  );
};

// ---------- Data ----------

const STATUS_LABELS: Record<string, string> = {
  active: 'Активный',
  club_resident: 'Резидент клуба',
  graduated: 'Выпускник',
  inactive: 'Неактивный',
};

// ---------- View ----------

export const TelegramParticipantView: React.FC<Props> = ({ data, activeSection, onNavigate }) => {
  const {
    profile, status, coins_balance, total_points,
    rank_position, current_totem, totems_count,
    upcoming_homework, referrals_count,
  } = data;

  const displayName = profile?.display_name ?? profile?.first_name ?? 'Участник';
  const statusLabel = status ? (STATUS_LABELS[status] ?? status) : null;
  const totem = current_totem as { name?: string; discipline?: string } | null;
  const homework = upcoming_homework as { title?: string; deadline?: string | null } | null;

  return (
    <div className="min-h-screen bg-background pb-8">

      {/* ── Header ── */}
      <div className="bg-kamp-primary px-4 pt-8 pb-6 flex flex-col items-center gap-2">
        <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center">
          <span className="text-white text-2xl font-black">K</span>
        </div>
        <h1 className="text-white text-xl font-bold text-center">{displayName}</h1>
        {statusLabel && (
          <Badge className="bg-white/20 text-white border-white/30 hover:bg-white/30">
            {statusLabel}
          </Badge>
        )}
      </div>

      {/* ── Stats grid ── */}
      <div className="px-4 pt-4 grid grid-cols-2 gap-3">
        <StatCard icon={<Coins className="w-4 h-4" />} label="Монеты" value={coins_balance ?? 0} />
        <StatCard icon={<Trophy className="w-4 h-4" />} label="Очки" value={total_points ?? 0} />
        {rank_position != null && (
          <StatCard icon={<Star className="w-4 h-4" />} label="Место в рейтинге" value={`#${rank_position}`} />
        )}
        {referrals_count != null && referrals_count > 0 && (
          <StatCard icon={<Users className="w-4 h-4" />} label="Рефералы" value={referrals_count} />
        )}
      </div>

      {/* ── Totem ── */}
      {totem?.name && (
        <div className="px-4 pt-3">
          <Card>
            <CardContent className="py-3 px-4">
              <p className="text-xs text-muted-foreground mb-1">
                Тотем{totems_count != null && totems_count > 1 ? ` (${totems_count} всего)` : ''}
              </p>
              <p className="font-semibold">{totem.name}</p>
              {totem.discipline && (
                <p className="text-xs text-muted-foreground mt-0.5">{totem.discipline}</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Upcoming homework ── */}
      {homework?.title && (
        <div className="px-4 pt-3">
          <Card>
            <CardContent className="py-3 px-4 flex items-start gap-3">
              <BookOpen className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground mb-1">Ближайшее ДЗ</p>
                <p className="font-medium text-sm leading-snug">{homework.title}</p>
                {homework.deadline && (
                  <p className="text-xs text-muted-foreground mt-1">
                    До {new Date(homework.deadline).toLocaleDateString('ru-RU')}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Sections grid ── */}
      <div className="px-4 pt-6">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Разделы КЭМП
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <SectionCard
            icon={<Home className="w-5 h-5" />}
            label="Главная"
            active={activeSection === 'home'}
            onClick={() => onNavigate('home')}
          />
          <SectionCard icon={<Activity className="w-5 h-5" />} label="Активности" />
          <SectionCard
            icon={<Calendar className="w-5 h-5" />}
            label="Расписание"
            active={activeSection === 'schedule'}
            onClick={() => onNavigate('schedule')}
          />
          <SectionCard icon={<ClipboardList className="w-5 h-5" />} label="ДЗ" />
          <SectionCard icon={<BarChart2 className="w-5 h-5" />} label="Рейтинг" />
          {/* TODO: Нутрициолог — встроить отдельный модуль/бот, когда будет готов API */}
          <SectionCard icon={<Salad className="w-5 h-5" />} label="Нутрициолог" />
          <SectionCard icon={<ScrollText className="w-5 h-5" />} label="Правила" />
          <SectionCard icon={<ShieldCheck className="w-5 h-5" />} label="Админ" />
        </div>
      </div>

    </div>
  );
};
