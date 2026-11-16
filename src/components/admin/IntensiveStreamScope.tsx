import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { IntensiveStream, streamBounds } from '@/lib/intensiveStream';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

interface Scope {
  stream: IntensiveStream | null;
  streams: IntensiveStream[];
  streamId: string;
  setStreamId: (id: string) => void;
  userIds: string[];
  archive: boolean;
}
const Context = createContext<Scope | null>(null);
export const useIntensiveStreamScope = () => useContext(Context);

/** Keeps existing standalone screens unchanged; admin children share one selection. */
export function useScopedStream(initial = ''): [string, (value: React.SetStateAction<string>) => void] {
  const scope = useIntensiveStreamScope();
  const [local, setLocal] = useState(initial);
  return scope ? [scope.streamId, value => scope.setStreamId(typeof value === 'function' ? value(scope.streamId) : value)] : [local, setLocal];
}

export function scopeUsers<Q extends { in: (column: string, values: string[]) => Q }>(query: Q, scope: Scope | null): Q {
  return scope ? query.in('user_id', scope.userIds) : query;
}

// Applied only to records without a persisted stream_id; no historic rows are rewritten.
export function scopePeriod<Q extends { gte: (column: string, value: string) => Q; lt: (column: string, value: string) => Q }>(query: Q, column: string, scope: Scope | null): Q {
  if (!scope?.stream) return query;
  const bounds = streamBounds(scope.stream);
  const calendarDate = ['entry_date', 'week_start', 'test_date'].includes(column);
  const endDate = scope.stream.end_date ? new Date(`${scope.stream.end_date.slice(0, 10)}T00:00:00Z`) : null;
  if (endDate) endDate.setUTCDate(endDate.getUTCDate() + 1);
  let result = query.gte(column, calendarDate ? scope.stream.start_date.slice(0, 10) : bounds.start);
  if (bounds.end) result = result.lt(column, calendarDate ? endDate?.toISOString().slice(0, 10) ?? bounds.end : bounds.end);
  return result;
}

export const IntensiveStreamProvider: React.FC<{ children: React.ReactNode; showSelector: boolean }> = ({ children, showSelector }) => {
  const [streams, setStreams] = useState<IntensiveStream[]>([]);
  const [streamId, setStreamId] = useState('');
  const [archive, setArchive] = useState(false);
  const [userIds, setUserIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [rosterStreamId, setRosterStreamId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const stream = streams.find(s => s.id === streamId) ?? null;

  const load = async () => {
    setLoading(true);
    setError(null);
    const result = await supabase.from('streams').select('id, name, is_active, start_date, end_date').eq('stream_type', 'intensive').order('start_date', { ascending: false });
    if (result.error) { setError('Не удалось загрузить потоки'); setLoading(false); return; }
    const list = result.data ?? [];
    setStreams(list);
    setStreamId(list.find(s => s.is_active)?.id ?? '');
    setLoading(false);
  };
  useEffect(() => { void load(); }, []);
  useEffect(() => {
    let active = true;
    setUserIds([]);
    if (!streamId) return;
    void (async () => {
      const [profiles, teams] = await Promise.all([
        supabase.from('profiles').select('user_id').eq('current_stream_id', streamId),
        supabase.from('captain_teams').select('id').eq('stream_id', streamId),
      ]);
      if (profiles.error || teams.error) { if (active) setError('Не удалось загрузить участников потока'); return; }
      const teamIds = (teams.data ?? []).map(t => t.id);
      const members = teamIds.length ? await supabase.from('captain_team_members').select('user_id').in('team_id', teamIds) : null;
      if (members?.error) { if (active) setError('Не удалось загрузить состав команд'); return; }
      if (active) {
        setUserIds([...new Set([...(profiles.data ?? []).map(p => p.user_id), ...(members?.data ?? []).map(m => m.user_id)])]);
        setRosterStreamId(streamId);
      }
    })();
    return () => { active = false; };
  }, [streamId]);

  const select = (id: string) => {
    if (id === streamId || !streams.some(s => s.id === id)) return;
    setStreamId(id);
    setArchive(!streams.find(s => s.id === id)?.is_active);
  };
  const changeMode = (value: string) => {
    const archived = value === 'archive';
    setArchive(archived);
    setStreamId(streams.find(s => archived ? !s.is_active : s.is_active)?.id ?? '');
  };
  const choices = streams.filter(s => archive ? !s.is_active : s.is_active);
  return <Context.Provider value={showSelector ? { streams, stream, streamId, setStreamId: select, userIds, archive } : null}>
    {showSelector && <div className="mb-6 flex flex-wrap items-center gap-3">
      <Tabs value={archive ? 'archive' : 'current'} onValueChange={changeMode}>
        <TabsList><TabsTrigger value="current">Текущий поток</TabsTrigger><TabsTrigger value="archive">Архив</TabsTrigger></TabsList>
      </Tabs>
      <Select value={streamId} onValueChange={select} disabled={loading || !choices.length}>
        <SelectTrigger className="w-full sm:w-64" aria-label="Поток интенсива"><SelectValue placeholder={loading ? 'Загрузка…' : 'Нет потоков'} /></SelectTrigger>
        <SelectContent>{choices.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
      </Select>
      {error && <><span className="text-sm text-destructive">{error}</span><Button variant="outline" onClick={() => void load()}>Повторить</Button></>}
    </div>}
    {showSelector && (loading || !stream || rosterStreamId !== streamId) ? <p className="py-6 text-muted-foreground">{error ?? (loading || (stream && rosterStreamId !== streamId) ? 'Загрузка потока…' : archive ? 'Архив потоков пуст' : 'Нет активного потока')}</p> : <React.Fragment key={showSelector ? streamId : 'unscoped'}>{children}</React.Fragment>}
  </Context.Provider>;
};