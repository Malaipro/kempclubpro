import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ChevronDown, Plus, Send, RefreshCw } from 'lucide-react';
import { canCheckin, dateLabel, initialTrack, tasksForTrack, Track, TrackTask, TrackEntry, TrackGoal, ProgressRow } from './trackModel';
import { TrackDashboard, GroupProgress } from './TrackDashboard';

type MemberData = { is_member: boolean; member?: { id: string; request: string | null; plan: string | null }; tasks?: TrackTask[]; entries?: TrackEntry[] };
type Meeting = { id: string; meeting_date: string; topic: string | null };
const rpc = async <T,>(name: string, args: Record<string, unknown>): Promise<T> => {
  const { data, error } = await supabase.rpc(name as never, args as never);
  if (error) throw error;
  const result = data as unknown as { ok?: boolean; error?: string };
  if (result?.ok === false || result?.error) throw new Error(result.error || 'Ошибка операции');
  return data as unknown as T;
};

export const WebMastermindTrack = ({ groupId }: { groupId: string }) => {
  const [data, setData] = useState<MemberData | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [selected, setSelected] = useState('');
  const [tab, setTab] = useState('overview');
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [attendance, setAttendance] = useState<Record<string, boolean>>({});
  const [rows, setRows] = useState<ProgressRow[]>([]);
  const [plan, setPlan] = useState({ goal: '', request: '', plan: '', outcome: '' });
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState('');
  const [comments, setComments] = useState<Record<string, string>>({});
  const [newTask, setNewTask] = useState({ title: '', description: '', deadline: '' });
  const [entry, setEntry] = useState({ summary: '', my_tasks: '' });
  const generation = useRef(0);
  const track = tracks.find(t => t.id === selected);
  const tasks = tasksForTrack(data?.tasks || [], selected);
  const entries = tasksForTrack(data?.entries || [], selected);

  const load = useCallback(async () => {
    const version = ++generation.current;
    setLoading(true); setError('');
    try {
      const [member, tr] = await Promise.all([
        rpc<MemberData>('get_mastermind_web', { p_group_id: groupId }),
        supabase.from('mastermind_tracks').select('*').eq('group_id', groupId).order('start_date', { ascending: false }),
      ]);
      if (tr.error) throw tr.error;
      if (version !== generation.current) return;
      const all = (tr.data || []) as Track[];
      setData(member); setTracks(all);
      const id = selected === 'legacy' || all.some(t => t.id === selected) ? selected : initialTrack(all) || 'legacy';
      if (id !== selected) { setSelected(id); return; }
      if (id === 'legacy') { setMeetings([]); setRows([]); return; }
      if (!member.member) return;
      const [m, g, p] = await Promise.all([
        supabase.from('mastermind_meetings').select('*').eq('track_id', id).order('meeting_date'),
        supabase.from('mastermind_track_goals').select('*').eq('track_id', id).eq('member_id', member.member.id).maybeSingle(),
        rpc<ProgressRow[]>('get_mastermind_group_progress_web', { p_track_id: id }),
      ]);
      if (m.error) throw m.error; if (g.error) throw g.error;
      const meetingIds = (m.data || []).map((x: Meeting) => x.id);
      const a = meetingIds.length
        ? await supabase.from('mastermind_attendance').select('meeting_id,attended').eq('member_id', member.member.id).in('meeting_id', meetingIds)
        : { data: [], error: null };
      if (a.error) throw a.error;
      if (version !== generation.current) return;
      const goal = g.data as TrackGoal | null;
      setMeetings(m.data || []); setRows(p || []);
      setAttendance(Object.fromEntries((a.data || []).map((x: { meeting_id: string; attended: boolean }) => [x.meeting_id, x.attended])));
      setPlan({ goal: goal?.goal || '', request: goal?.request || '', plan: goal?.plan || '', outcome: goal?.outcome || '' });
    } catch (e) { if (version === generation.current) setError(e instanceof Error ? e.message : 'Ошибка загрузки'); }
    finally { if (version === generation.current) setLoading(false); }
  }, [groupId, selected]);
  useEffect(() => { void load(); return () => { generation.current++; }; }, [load]);
  const changeTrack = (value: string) => { setSelected(value); setOpen(''); setComments({}); setNewTask({ title: '', description: '', deadline: '' }); setEntry({ summary: '', my_tasks: '' }); setMessage(''); };
  const run = async (action: string, args: Record<string, unknown>, reset?: () => void) => {
    setBusy(true); setError(''); setMessage('');
    try { await rpc(action, args); reset?.(); await load(); setMessage('Сохранено'); }
    catch (e) { setError(e instanceof Error ? e.message : 'Ошибка сохранения'); }
    finally { setBusy(false); }
  };
  const pastMeetings = meetings.filter(m => new Date(m.meeting_date) <= new Date()).length;
  const mine = rows.find(r => r.is_me);
  if (!data && loading) return <p className="py-8 text-center text-muted-foreground">Загрузка...</p>;
  if (data && !data.is_member) return <p className="py-8 text-center text-muted-foreground">Вы не записаны в мастермайнд</p>;
  return <div className="space-y-5">
    <div className="flex items-center gap-2">
      <Select value={selected} onValueChange={changeTrack} disabled={busy}><SelectTrigger aria-label="Трек" className="min-w-0 flex-1"><SelectValue placeholder="Выберите трек"/></SelectTrigger><SelectContent className="web-app-theme">{tracks.map(t => <SelectItem key={t.id} value={t.id}>{t.title} · {dateLabel(t.start_date)} — {dateLabel(t.end_date)}</SelectItem>)}<SelectItem value="legacy">Без трека / старые данные</SelectItem></SelectContent></Select>
      <Button variant="outline" size="icon" title="Обновить" aria-label="Обновить трек" disabled={loading || busy} onClick={() => void load()}><RefreshCw className="h-4 w-4"/></Button>
    </div>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}{message && <p role="status" className="text-sm text-muted-foreground">{message}</p>}
    {loading ? <p className="py-8 text-center text-muted-foreground">Загрузка трека...</p> : <>
      <header className="space-y-2 border-b pb-4"><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="break-words text-lg font-bold uppercase">{track?.title || 'Без трека / старые данные'}</h2>{track && <Badge variant="outline">{track.status === 'closed' ? 'Завершён' : 'Активен'}</Badge>}</div>{track && <p className="text-sm text-muted-foreground">{dateLabel(track.start_date)} — {dateLabel(track.end_date)}</p>}{track?.description && <p className="whitespace-pre-wrap break-words text-sm text-muted-foreground">{track.description}</p>}</header>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid h-auto w-full grid-cols-2 gap-1 sm:grid-cols-5">{[['overview','Трек и темы'],['plans','Мой план'],['tasks',`Задачи (${tasks.length})`],['dashboard','Дашборд'],['group','Участники']].map(([key,label]) => <TabsTrigger key={key} value={key} className="min-w-0 whitespace-normal">{label}</TabsTrigger>)}</TabsList>
        <TabsContent value="overview" className="space-y-4 pt-3">{!track ? <div className="space-y-2 text-sm"><Label>Прежний запрос</Label><p className="whitespace-pre-wrap text-muted-foreground">{data?.member?.request || '—'}</p><Label>Прежний план</Label><p className="whitespace-pre-wrap text-muted-foreground">{data?.member?.plan || '—'}</p></div> : <><p className="text-sm text-muted-foreground">Участников: {rows.length} · Встреч: {meetings.length}</p>{meetings.length === 0 && <p className="text-sm text-muted-foreground">Встречи пока не назначены</p>}{meetings.map(m => <div key={m.id} className="space-y-1 border-b py-3"><p className="text-xs text-muted-foreground">{new Date(m.meeting_date).toLocaleString('ru-RU',{timeZone:'Europe/Moscow',dateStyle:'short',timeStyle:'short'})} · МСК</p><p className="whitespace-pre-wrap break-words font-medium">{m.topic || 'Встреча мастермайнда'}</p></div>)}</>}</TabsContent>
        <TabsContent value="plans" className="space-y-4 pt-3">{track ? <><div className="space-y-3">{([['goal','Моя цель'],['request','Мой запрос'],['plan','План на трек'],['outcome','Итог трека']] as const).map(([key,label]) => <div key={key} className="space-y-2"><Label htmlFor={`mm-${key}`}>{label}</Label><Textarea id={`mm-${key}`} value={plan[key]} onChange={e => setPlan(p => ({...p,[key]:e.target.value}))}/></div>)}<Button disabled={busy || !plan.goal.trim()} onClick={() => void run('save_mastermind_track_plan_web',{p_track_id:selected,p_goal:plan.goal,p_request:plan.request,p_plan:plan.plan,p_outcome:plan.outcome})}>Сохранить план</Button></div></> : <p className="text-sm text-muted-foreground">Выберите трек</p>}</TabsContent>
        <TabsContent value="tasks" className="space-y-3 pt-3">{!tasks.length && <p className="text-sm text-muted-foreground">Задач пока нет</p>}{tasks.map(t => <Card key={t.id}><CardContent className="space-y-3 p-4"><Button variant="ghost" className="h-auto w-full gap-2 whitespace-normal px-0 text-left" onClick={() => setOpen(open === t.id ? '' : t.id)}><span className="min-w-0 flex-1 break-words">{t.title}</span><ChevronDown className="h-4 w-4 shrink-0"/></Button><div className="flex flex-wrap gap-2"><Badge variant={t.is_failed ? 'destructive' : 'outline'}>{t.is_failed ? 'Не выполнено' : t.is_completed ? 'Выполнено' : 'В работе'}</Badge>{t.approval_status && <Badge variant="secondary">{t.approval_status === 'approved' ? 'Утверждена' : t.approval_status === 'rejected' ? 'На доработку' : 'На проверке'}</Badge>}{t.deadline && <span className="text-xs text-muted-foreground">Срок: {dateLabel(t.deadline)}</span>}</div>{open === t.id && <div className="space-y-3">{t.description && <p className="whitespace-pre-wrap break-words text-sm">{t.description}</p>}{t.participant_comment && <p className="whitespace-pre-wrap break-words text-sm"><strong>Результат:</strong> {t.participant_comment}</p>}{t.admin_comment && <p className="text-sm text-muted-foreground">Тренер: {t.admin_comment}</p>}{t.file_url && <a className="text-sm text-primary underline" href={t.file_url} target="_blank" rel="noreferrer">Файл результата</a>}{!t.is_completed && !t.is_failed && <><Textarea aria-label={`Результат: ${t.title}`} placeholder="Результат задачи (обязательно)" value={comments[t.id] || ''} onChange={e => setComments(c => ({...c,[t.id]:e.target.value}))}/><Button disabled={busy || !comments[t.id]?.trim()} onClick={() => void run('complete_mastermind_task_web',{p_task_id:t.id,p_comment:comments[t.id]},() => setComments(c => ({...c,[t.id]:''})))}>Выполнено</Button></>}</div>}</CardContent></Card>)}{track && <div className="space-y-3 border-t pt-4"><h3 className="flex items-center gap-2 font-semibold"><Plus className="h-4 w-4"/>Новая задача</h3><Input aria-label="Название задачи" placeholder="Название" value={newTask.title} onChange={e => setNewTask(t => ({...t,title:e.target.value}))}/><Textarea aria-label="Описание задачи" placeholder="Описание" value={newTask.description} onChange={e => setNewTask(t => ({...t,description:e.target.value}))}/><Input aria-label="Срок задачи" type="date" value={newTask.deadline} onChange={e => setNewTask(t => ({...t,deadline:e.target.value}))}/><Button disabled={busy || !newTask.title.trim()} onClick={() => void run('create_mastermind_track_task_web',{p_track_id:selected,p_title:newTask.title,p_description:newTask.description,p_deadline:newTask.deadline || null},() => setNewTask({title:'',description:'',deadline:''}))}>Добавить задачу</Button></div>}</TabsContent>
        <TabsContent value="dashboard" className="space-y-5 pt-3"><h3 className="font-semibold">Мой прогресс</h3><TrackDashboard tasks={tasks} track={track} attended={mine?.attended || 0} meetings={pastMeetings}/>{track && <><h3 className="font-semibold">Прогресс группы</h3><GroupProgress rows={rows} meetings={pastMeetings}/><div className="space-y-3 border-t pt-4"><h3 className="font-semibold">Новый отчёт</h3><Textarea aria-label="Результат отчёта" placeholder="Что сделано" value={entry.summary} onChange={e => setEntry(v => ({...v,summary:e.target.value}))}/><Textarea aria-label="План следующего периода" placeholder="Задачи на следующий период" value={entry.my_tasks} onChange={e => setEntry(v => ({...v,my_tasks:e.target.value}))}/><Button disabled={busy || !entry.summary.trim()} onClick={() => void run('submit_mastermind_track_entry_web',{p_track_id:selected,p_summary:entry.summary,p_my_tasks:entry.my_tasks},() => setEntry({summary:'',my_tasks:''}))}><Send className="mr-2 h-4 w-4"/>Отправить отчёт</Button></div></>}<h3 className="font-semibold">Отчёты трека</h3>{!entries.length && <p className="text-sm text-muted-foreground">Отчётов пока нет</p>}{entries.map(e => <Card key={e.id}><CardContent className="space-y-2 p-4"><div className="flex justify-between gap-2 text-xs"><span>{dateLabel(e.entry_date)}</span><Badge variant="outline">{e.status === 'approved' ? 'Принят' : e.status === 'rejected' ? 'На доработку' : 'На проверке'}</Badge></div><p className="whitespace-pre-wrap break-words text-sm">{e.summary}</p>{e.my_tasks && <p className="text-sm text-muted-foreground">Следующие задачи: {e.my_tasks}</p>}{e.admin_comment && <p className="text-sm text-muted-foreground">Тренер: {e.admin_comment}</p>}</CardContent></Card>)}</TabsContent>
        <TabsContent value="group" className="pt-3"><GroupProgress rows={rows} meetings={pastMeetings}/></TabsContent>
      </Tabs>
    </>}
  </div>;
};
