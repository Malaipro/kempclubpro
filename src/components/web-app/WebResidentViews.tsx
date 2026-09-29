import React, { useCallback, useEffect, useState } from 'react';
import { useAppApi } from '@/components/app-shared/apiAdapter';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const Header = ({ title, subtitle }: { title: string; subtitle?: string }) => (
  <header className="bg-kamp-primary px-4 pb-6 pt-8 text-center">
    <h1 className="text-xl font-bold text-primary-foreground">{title}</h1>
    {subtitle && <p className="mt-1 text-sm text-primary-foreground/75">{subtitle}</p>}
  </header>
);

function useLoad<T>(action: string) {
  const { callApi } = useAppApi();
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(() => {
    setError(null); setData(null);
    callApi<T>(action).then((d) => setData(d ?? ({} as T))).catch((e: unknown) => setError(e instanceof Error ? e.message : 'Ошибка загрузки'));
  }, [callApi, action]);
  useEffect(() => { load(); }, [load]);
  return { data, error, load };
}

const State = ({ error, retry }: { error: string | null; retry: () => void }) => error
  ? <div className="space-y-3 py-12 text-center"><p className="text-sm text-destructive">{error}</p><Button size="sm" variant="outline" onClick={retry}>Повторить</Button></div>
  : <p className="py-12 text-center text-sm text-muted-foreground">Загрузка…</p>;

const fmt = (d?: string | null) => (d ? new Date(d).toLocaleDateString('ru-RU') : '—');

interface ResidentRating { entries?: { user_id: string; display_name: string | null; total_points: number; position: number; is_me: boolean }[] | null; my_position?: number | null }

export const WebResidentRatingView = () => {
  const { data, error, load } = useLoad<ResidentRating>('get_resident_rating');
  const entries = data?.entries ?? [];
  return (
    <div>
      <Header title="Рейтинг резидентов" subtitle={data?.my_position ? `Ваше место: ${data.my_position}` : undefined} />
      <div className="space-y-2 p-4">
        {!data ? <State error={error} retry={load} /> : entries.length === 0 ? <p className="py-12 text-center text-sm text-muted-foreground">Нет данных</p> : entries.map((e) => (
          <Card key={e.user_id} className={e.is_me ? 'border-kamp-primary' : ''}>
            <CardContent className="flex items-center gap-3 p-3">
              <span className="w-8 text-center font-bold text-kamp-primary">{e.position}</span>
              <span className="flex-1 truncate text-sm">{e.display_name || 'Участник'}{e.is_me && ' (вы)'}</span>
              <span className="text-sm font-semibold">{e.total_points ?? 0}</span>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

interface History {
  stream?: { name: string | null; start_date: string | null; end_date: string | null } | null;
  stream_start_date?: string | null; stream_end_date?: string | null;
  homework?: { id: string; title: string | null; status: string | null; submitted_at: string | null; feedback: string | null }[] | null;
  checkins?: { id: string; activity_type: string | null; checked_in_at: string | null }[] | null;
  ascetics?: { id: string; ascetic_type: string | null; challenge_name: string | null; streak: number | null; completion_percentage: number | null; points_earned: number | null }[] | null;
  rating?: { total_points?: number | null; rank_position?: number | null } | null;
}

const Block = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <Card><CardContent className="space-y-2 p-4"><h2 className="font-semibold">{title}</h2>{children}</CardContent></Card>
);
const Empty = () => <p className="text-sm text-muted-foreground">Нет данных</p>;

export const WebHistoryView = () => {
  const { data, error, load } = useLoad<History>('get_intensive_history');
  if (!data) return <div><Header title="История" /><State error={error} retry={load} /></div>;
  const start = data.stream_start_date ?? data.stream?.start_date;
  const end = data.stream_end_date ?? data.stream?.end_date;
  const hw = data.homework ?? []; const ch = data.checkins ?? []; const as = data.ascetics ?? [];
  return (
    <div>
      <Header title="История интенсива" subtitle={data.stream?.name ?? undefined} />
      <div className="space-y-3 p-4">
        <Block title="Поток">
          <p className="text-sm text-muted-foreground">Старт: {fmt(start)} · Финиш: {fmt(end)}</p>
          <p className="text-sm">Итог: {data.rating?.total_points ?? 0} очков{data.rating?.rank_position ? `, место ${data.rating.rank_position}` : ''}</p>
        </Block>
        <Block title={`Домашние задания (${hw.length})`}>
          {hw.length === 0 ? <Empty /> : hw.map((h) => (
            <div key={h.id} className="border-b border-border pb-2 last:border-0 text-sm">
              <div className="flex justify-between gap-2"><span>{h.title || 'Задание'}</span><span className="text-muted-foreground">{h.status}</span></div>
              <p className="text-xs text-muted-foreground">{fmt(h.submitted_at)}</p>
              {h.feedback && <p className="text-xs">Комментарий: {h.feedback}</p>}
            </div>
          ))}
        </Block>
        <Block title={`Отметки (${ch.length})`}>
          {ch.length === 0 ? <Empty /> : ch.slice(0, 100).map((c) => (
            <div key={c.id} className="flex justify-between text-sm"><span>{c.activity_type}</span><span className="text-muted-foreground">{fmt(c.checked_in_at)}</span></div>
          ))}
        </Block>
        <Block title={`Аскезы (${as.length})`}>
          {as.length === 0 ? <Empty /> : as.map((a) => (
            <div key={a.id} className="flex justify-between gap-2 text-sm">
              <span>{a.challenge_name || a.ascetic_type || 'Аскеза'}</span>
              <span className="text-muted-foreground">серия {a.streak ?? 0} · {a.completion_percentage ?? 0}% · {a.points_earned ?? 0} очк.</span>
            </div>
          ))}
        </Block>
      </div>
    </div>
  );
};
