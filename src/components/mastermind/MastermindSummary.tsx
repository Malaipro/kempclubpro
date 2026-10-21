import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

type Summary = {
  tracks_completed: number; tasks_total: number; tasks_done: number; tasks_done_late: number;
  tasks_overdue: number; tasks_not_done: number; meetings_total: number; meetings_attended: number;
};

export const MastermindSummary = ({ userId, className = '' }: { userId: string; className?: string }) => {
  const [s, setS] = useState<Summary | null>(null);
  useEffect(() => {
    supabase.rpc('get_mastermind_summary' as never, { p_user_id: userId } as never).then(({ data }) => setS(data as unknown as Summary));
  }, [userId]);
  if (!s || 'error' in (s as object) || (!s.tasks_total && !s.meetings_total)) return null;
  const items: [string, number | string][] = [
    ['Пройдено треков', s.tracks_completed],
    ['Выполнено задач', s.tasks_done],
    ['Из них с опозданием', s.tasks_done_late],
    ['Просрочено сейчас', s.tasks_overdue],
    ['Не выполнено', s.tasks_not_done],
    ['Посещено встреч', `${s.meetings_attended} из ${s.meetings_total}`],
  ];
  return (
    <div className={`rounded-lg border p-4 ${className}`}>
      <p className="mb-3 text-sm font-semibold uppercase tracking-wide">Мастермайнд</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {items.map(([l, v]) => (
          <div key={l}><p className="text-xl font-bold">{v}</p><p className="text-xs text-muted-foreground">{l}</p></div>
        ))}
      </div>
    </div>
  );
};
