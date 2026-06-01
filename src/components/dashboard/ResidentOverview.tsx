import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Trophy, Medal, Coins, Calendar, BookOpen, Sparkles,
  User, FileText, Gift, Share2, Activity,
} from 'lucide-react';

interface ProfileData {
  total_points?: number | null;
  rank_position?: number | null;
  participant_status?: string | null;
  current_stream_id?: string | null;
  referral_coins?: number | null;
}

interface ResidentOverviewProps {
  profile: ProfileData | null;
  onNavigate: (tab: string) => void;
}

const StatCard: React.FC<{ icon: React.ReactNode; label: string; value: React.ReactNode; }> = ({ icon, label, value }) => (
  <Card>
    <CardContent className="flex items-center gap-3 py-4">
      <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center text-primary shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground truncate">{label}</p>
        <p className="text-lg font-bold truncate">{value}</p>
      </div>
    </CardContent>
  </Card>
);

export const ResidentOverview: React.FC<ResidentOverviewProps> = ({ profile, onNavigate }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [coins, setCoins] = useState<number | null>(null);
  const [nextEvent, setNextEvent] = useState<any>(null);
  const [homework, setHomework] = useState<any>(null);
  const [totem, setTotem] = useState<any>(null);

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      setLoading(true);
      // Coins balance (best-effort)
      try {
        const { data } = await supabase.rpc('get_user_coin_balance', { p_user_id: user.id });
        setCoins(typeof data === 'number' ? data : (profile?.referral_coins ?? 0));
      } catch {
        setCoins(profile?.referral_coins ?? 0);
      }
      // Nearest event (best-effort)
      try {
        const { data } = await supabase
          .from('schedules')
          .select('id, title, start_time')
          .eq('is_active', true)
          .gte('end_time', new Date().toISOString())
          .order('start_time', { ascending: true })
          .limit(1);
        setNextEvent(data?.[0] || null);
      } catch { setNextEvent(null); }
      // Actual homework (best-effort)
      try {
        const { data } = await supabase
          .from('homework_assignments')
          .select('id, title, deadline')
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(1);
        setHomework(data?.[0] || null);
      } catch { setHomework(null); }
      // Current totem (best-effort)
      try {
        const { data } = await supabase
          .from('user_totems')
          .select('id, totems ( name )')
          .eq('user_id', user.id)
          .order('assigned_at', { ascending: false })
          .limit(1);
        setTotem(data?.[0] || null);
      } catch { setTotem(null); }
      setLoading(false);
    };
    load();
  }, [user, profile]);

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
      </div>
    );
  }

  const totemName = totem?.totems?.name || '—';

  const quickLinks = [
    { tab: 'profile', label: 'Профиль', icon: <User className="w-4 h-4" /> },
    { tab: 'homework', label: 'ДЗ', icon: <BookOpen className="w-4 h-4" /> },
    { tab: 'materials', label: 'Материалы', icon: <FileText className="w-4 h-4" /> },
    { tab: 'schedule', label: 'Расписание', icon: <Calendar className="w-4 h-4" /> },
    { tab: 'progress', label: 'Прогресс', icon: <Activity className="w-4 h-4" /> },
    { tab: 'rewards', label: 'Награды', icon: <Gift className="w-4 h-4" /> },
    { tab: 'referrals', label: 'Рефералы', icon: <Share2 className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={<Trophy className="w-5 h-5" />} label="Общий счёт" value={profile?.total_points ?? 0} />
        <StatCard icon={<Medal className="w-5 h-5" />} label="Место в потоке" value={profile?.rank_position ? `#${profile.rank_position}` : '—'} />
        <StatCard icon={<Coins className="w-5 h-5" />} label="Баланс коинов" value={coins ?? 0} />
        <StatCard icon={<Sparkles className="w-5 h-5" />} label="Текущий тотем" value={totemName} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="w-4 h-4" /> Ближайшее событие
            </CardTitle>
          </CardHeader>
          <CardContent>
            {nextEvent ? (
              <div className="space-y-1">
                <p className="font-medium">{nextEvent.title}</p>
                <p className="text-sm text-muted-foreground">
                  {new Date(nextEvent.start_time).toLocaleString('ru-RU')}
                </p>
                <Button variant="link" className="px-0" onClick={() => onNavigate('schedule')}>
                  К расписанию →
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Нет запланированных событий</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <BookOpen className="w-4 h-4" /> Актуальное ДЗ
            </CardTitle>
          </CardHeader>
          <CardContent>
            {homework ? (
              <div className="space-y-1">
                <p className="font-medium">{homework.title}</p>
                {homework.deadline && (
                  <p className="text-sm text-muted-foreground">
                    Срок: {new Date(homework.deadline).toLocaleDateString('ru-RU')}
                  </p>
                )}
                <Button variant="link" className="px-0" onClick={() => onNavigate('homework')}>
                  К заданиям →
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Активных заданий нет</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Быстрые ссылки</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {quickLinks.map((l) => (
            <Button key={l.tab} variant="outline" size="sm" onClick={() => onNavigate(l.tab)}>
              {l.icon}<span className="ml-1">{l.label}</span>
            </Button>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};
