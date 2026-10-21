import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { MastermindSummary } from './MastermindSummary';

type Track = { id: string; title: string; start_date: string; end_date: string; status: string };
type Meeting = { id: string; meeting_date: string; topic: string | null };
type Row = { member_id: string; is_me: boolean; name: string; total: number; done: number; on_time: number; attended: number };
const d = (s: string) => new Date(s).toLocaleDateString('ru-RU');
const sb = supabase as unknown as { from: (t: string) => any; rpc: (f: string, a: object) => any };

export const WebMastermindTrack = ({ groupId }: { groupId: string }) => {
  const [uid, setUid] = useState('');
  const [track, setTrack] = useState<Track | null>(null);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [goal, setGoal] = useState(''); const [outcome, setOutcome] = useState('');
  const [rows, setRows] = useState<Row[]>([]);
  const [tab, setTab] = useState<'track' | 'me' | 'group'>('track');
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    const { data: u } = await supabase.auth.getUser(); setUid(u.user?.id || '');
    const { data: tr } = await sb.from('mastermind_tracks').select('*').eq('group_id', groupId).order('start_date', { ascending: false }).limit(1);
    const t = tr?.[0] as Track | undefined; setTrack(t || null); if (!t) return;
    const [{ data: m }, { data: g }, { data: p }] = await Promise.all([
      sb.from('mastermind_meetings').select('*').eq('track_id', t.id).order('meeting_date'),
      sb.from('mastermind_track_goals').select('goal,outcome').eq('track_id', t.id).maybeSingle(),
      sb.rpc('get_mastermind_group_progress_web', { p_track_id: t.id }),
    ]);
    setMeetings(m || []); setGoal(g?.goal || ''); setOutcome(g?.outcome || ''); setRows(p || []);
  }, [groupId]);
  useEffect(() => { void load(); }, [load]);

  if (!track) return null;
  const save = async () => {
    const { data } = await sb.rpc('save_mastermind_goal_web', { p_track_id: track.id, p_goal: goal, p_outcome: outcome });
    setMsg(data?.ok ? 'Сохранено' : 'Ошибка сохранения');
  };
  const next = meetings.find(m => new Date(m.meeting_date) >= new Date());
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {([['track', 'Трек'], ['me', 'Мой прогресс'], ['group', 'Группа']] as const).map(([k, l]) => (
          <Button key={k} size="sm" variant={tab === k ? 'default' : 'outline'} className="flex-1" onClick={() => setTab(k)}>{l}</Button>
        ))}
      </div>
      {tab === 'track' && <Card><CardContent className="space-y-3 p-4">
        <p className="text-sm font-semibold uppercase">{track.title}</p>
        <p className="text-xs text-muted-foreground">{d(track.start_date)} — {d(track.end_date)}</p>
        {next && <p className="text-sm">Ближайшая встреча: {new Date(next.meeting_date).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' })}{next.topic ? ` · ${next.topic}` : ''}</p>}
        <Textarea placeholder="Моя цель на трек (измеримый результат)" value={goal} onChange={e => setGoal(e.target.value)} />
        <Textarea placeholder="Итог трека: что достигнуто, выводы" value={outcome} onChange={e => setOutcome(e.target.value)} />
        <Button size="sm" className="w-full" disabled={!goal.trim()} onClick={() => void save()}>Сохранить цель</Button>
        {msg && <p className="text-xs text-muted-foreground">{msg}</p>}
      </CardContent></Card>}
      {tab === 'me' && uid && <MastermindSummary userId={uid} />}
      {tab === 'group' && <Card><CardContent className="space-y-2 p-4">
        {rows.length === 0 && <p className="text-sm text-muted-foreground">Пока нет данных</p>}
        {rows.map((r, i) => (
          <div key={r.member_id} className={`flex items-center justify-between text-sm ${r.is_me ? 'font-semibold text-primary' : ''}`}>
            <span>{i + 1}. {r.name}</span>
            <span className="text-xs text-muted-foreground">задачи {r.done}/{r.total} · в срок {r.on_time} · встречи {r.attended}</span>
          </div>
        ))}
      </CardContent></Card>}
    </div>
  );
};
