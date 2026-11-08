import React, { useEffect, useRef, useState } from 'react';
import { Activity, Dumbbell, Flame, Pyramid, Salad, Swords, Target } from 'lucide-react';
import { useAppApi } from '@/components/app-shared/apiAdapter';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { checkedActivities, markActivity, moscowDay } from './dailyCheckin';

type ActivityType = 'bjj' | 'kickboxing' | 'ofp' | 'pyramid' | 'nutrition' | 'tactics';
type CheckState = 'idle' | 'loading' | 'checked' | 'error';

const ACTIVITIES: Array<{ type: ActivityType; title: string; icon: React.ReactNode }> = [
  { type: 'bjj', title: 'BJJ', icon: <Swords className="h-5 w-5" /> },
  { type: 'kickboxing', title: 'Кикбоксинг', icon: <Flame className="h-5 w-5" /> },
  { type: 'ofp', title: 'ОФП', icon: <Dumbbell className="h-5 w-5" /> },
  { type: 'pyramid', title: 'Пирамида КЭМП', icon: <Pyramid className="h-5 w-5" /> },
  { type: 'nutrition', title: 'Нутрициология', icon: <Salad className="h-5 w-5" /> },
  { type: 'tactics', title: 'Тактика', icon: <Target className="h-5 w-5" /> },
];

export const WebActivitiesView: React.FC = () => {
  const { callApi } = useAppApi();
  const [ready, setReady] = useState(false);
  const cacheKey = useRef<string | null>(null);
  const day = useRef(moscowDay());
  const busy = useRef(new Set<ActivityType>());
  const [states, setStates] = useState<Record<ActivityType, CheckState>>({
    bjj: 'idle', kickboxing: 'idle', ofp: 'idle', pyramid: 'idle', nutrition: 'idle', tactics: 'idle',
  });

  useEffect(() => {
    let active = true;
    const restore = () => {
      if (!cacheKey.current) return;
      day.current = moscowDay();
      let saved: unknown = null;
      try { saved = JSON.parse(localStorage.getItem(cacheKey.current) ?? 'null'); } catch { /* optional UI cache */ }
      const checked = checkedActivities(saved, day.current);
      setStates(current => Object.fromEntries(ACTIVITIES.map(item => [item.type, busy.current.has(item.type) ? current[item.type] : checked.includes(item.type) ? 'checked' : 'idle'])) as Record<ActivityType, CheckState>);
    };
    void supabase.auth.getUser().then(({ data }) => {
      if (!active || !data.user) return;
      cacheKey.current = `kemp:daily-checkins:${data.user.id}`;
      restore();
      setReady(true);
    }).catch(() => { /* keep controls unavailable without an identified account */ });
    const refresh = () => { if (document.visibilityState === 'visible') restore(); };
    const timer = window.setInterval(() => { if (day.current !== moscowDay()) restore(); }, 1000);
    window.addEventListener('focus', refresh);
    window.addEventListener('storage', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener('focus', refresh);
      window.removeEventListener('storage', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, []);

  const checkIn = async (type: ActivityType) => {
    if (!ready || states[type] === 'checked' || busy.current.has(type)) return;
    busy.current.add(type);
    setStates((current) => ({ ...current, [type]: 'loading' }));
    try {
      const result = await callApi<{ checked_in: boolean; already_checked: boolean }>('check_in', { activity_type: type });
      const success = result.checked_in || result.already_checked;
      if (success && cacheKey.current) {
        try {
          const saved: unknown = JSON.parse(localStorage.getItem(cacheKey.current) ?? 'null');
          localStorage.setItem(cacheKey.current, JSON.stringify(markActivity(saved, moscowDay(), type)));
        } catch { /* blocked storage must not turn a successful server write into an error */ }
      }
      setStates((current) => ({ ...current, [type]: success ? 'checked' : 'error' }));
    } catch {
      setStates((current) => ({ ...current, [type]: 'error' }));
    } finally {
      busy.current.delete(type);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="app-section-header px-4 pb-6 pt-8 text-center text-primary-foreground">
        <Activity className="mx-auto mb-2 h-6 w-6" />
        <h1 className="text-xl font-bold text-primary-foreground">Отметки</h1>
        <p className="text-sm text-primary-foreground/75">Отметь выполненную активность</p>
      </header>
      <div className="space-y-3 px-4 pt-4">
        {ACTIVITIES.map((item) => {
          const state = states[item.type];
          return (
            <Card key={item.type}>
              <CardContent className="flex items-center gap-3 px-4 py-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">{item.icon}</div>
                <p className="min-w-0 flex-1 text-sm font-semibold">{item.title}</p>
                <Button
                  size="sm"
                  variant={state === 'checked' ? 'secondary' : 'default'}
                  disabled={!ready || state === 'loading' || state === 'checked'}
                  onClick={() => void checkIn(item.type)}
                >
                  {state === 'checked' ? 'Отмечено' : state === 'loading' ? '...' : state === 'error' ? 'Повторить' : 'Отметить'}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};