import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { TrackDashboard, GroupProgress } from '@/components/mastermind/TrackDashboard';
import { TrackTask, TrackGoal, ProgressRow } from '@/components/mastermind/trackModel';

const sb = supabase as unknown as { from: (t: string) => any; rpc: (f: string, a: object) => any; auth: typeof supabase.auth };
type Track = { id: string; group_id: string; title: string; start_date: string; end_date: string; status: string; description?: string | null };
type Meeting = { id: string; track_id: string; meeting_date: string; topic: string | null };
type Member = { id: string; group_id: string | null; user_id: string; name: string };

export const MastermindTracksPanel = ({ groups, groupId, trackId, onChange, tasks }: { groups: { id: string; name: string }[]; groupId: string; trackId: string; onChange: () => void; tasks: TrackTask[] }) => {
  const { toast } = useToast();
  const [goals, setGoals] = useState<Record<string, TrackGoal>>({});
  const [rows, setRows] = useState<ProgressRow[]>([]);
  const [description, setDescription] = useState('');
  const [tracks, setTracks] = useState<Track[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [att, setAtt] = useState<Record<string, boolean>>({});
  const [nt, setNt] = useState({ title: '', start: '', end: '' });
  const [nm, setNm] = useState<Record<string, { date: string; topic: string }>>({});



  const load = useCallback(async () => {
    if (!groupId) return;
    const { data: t } = await sb.from('mastermind_tracks').select('*').eq('group_id', groupId).order('start_date', { ascending: false });
    setTracks(t || []);
    const ids = (t || []).map((x: Track) => x.id);
    const { data: m } = ids.length ? await sb.from('mastermind_meetings').select('*').in('track_id', ids).order('meeting_date') : { data: [] };
    setMeetings(m || []);
    const { data: mem } = await sb.from('mastermind_members').select('id,group_id,user_id').eq('group_id', groupId).eq('is_active', true);
    const uids = (mem || []).map((x: Member) => x.user_id);
    const { data: pr } = uids.length ? await sb.from('profiles').select('user_id,first_name,last_name,display_name').in('user_id', uids) : { data: [] };
    setMembers((mem || []).map((x: Member) => {
      const p = (pr || []).find((y: any) => y.user_id === x.user_id);
      return { ...x, name: [p?.first_name, p?.last_name].filter(Boolean).join(' ') || p?.display_name || 'Участник' };
    }));
    const mids = (m || []).map((x: Meeting) => x.id);
    const { data: a } = mids.length ? await sb.from('mastermind_attendance').select('meeting_id,member_id,attended').in('meeting_id', mids) : { data: [] };
    const map: Record<string, boolean> = {};
    (a || []).forEach((r: any) => { map[`${r.meeting_id}:${r.member_id}`] = r.attended; });
    setAtt(map);
    const active = (t || []).find((x: Track) => x.id === trackId);
    setDescription(active?.description || '');
    if (active) {
      const [{data: gs, error: ge}, {data: rs, error: re}] = await Promise.all([sb.from('mastermind_track_goals').select('*').eq('track_id', trackId), sb.rpc('get_mastermind_group_progress_web', {p_track_id: trackId})]);
      if (ge || re) throw ge || re;
      setGoals(Object.fromEntries((gs || []).map((g: TrackGoal) => [g.member_id, g]))); setRows(rs || []);
    } else { setGoals({}); setRows([]); }
  }, [groupId, trackId]);
  useEffect(() => { void load().catch((e: any) => toast({title:'Ошибка загрузки',description:e.message,variant:'destructive'})); }, [load, toast]);

  const err = (e: any) => { if (e) toast({ title: 'Ошибка', description: e.message, variant: 'destructive' }); return !!e; };
  const addTrack = async () => {
    const { error } = await sb.from('mastermind_tracks').insert({ group_id: groupId, title: nt.title, start_date: nt.start, end_date: nt.end });
    if (!err(error)) { setNt({ title: '', start: '', end: '' }); onChange(); }
  };
  const closeTrack = async (id: string) => { if (!err((await sb.from('mastermind_tracks').update({ status: 'closed' }).eq('id', id)).error)) onChange(); };
  const addMeeting = async (trackId: string) => {
    const v = nm[trackId]; if (!v?.date) return;
    const { error } = await sb.from('mastermind_meetings').insert({ track_id: trackId, meeting_date: new Date(v.date).toISOString(), topic: v.topic || null });
    if (!err(error)) { setNm({ ...nm, [trackId]: { date: '', topic: '' } }); void load(); }
  };
  const toggle = async (meetingId: string, memberId: string, val: boolean) => {
    const { data: u } = await sb.auth.getUser();
    const { error } = await sb.from('mastermind_attendance').upsert({ meeting_id: meetingId, member_id: memberId, attended: val, marked_by: u.user?.id, marked_at: new Date().toISOString() }, { onConflict: 'meeting_id,member_id' });
    if (!err(error)) setAtt({ ...att, [`${meetingId}:${memberId}`]: val });
  };

  return (
    <div className="space-y-4">
      <Card><CardContent className="grid gap-2 p-4 sm:grid-cols-4">
        <Input placeholder="Название трека" value={nt.title} onChange={e => setNt({ ...nt, title: e.target.value })} />
        <Input type="date" value={nt.start} onChange={e => setNt({ ...nt, start: e.target.value })} />
        <Input type="date" value={nt.end} onChange={e => setNt({ ...nt, end: e.target.value })} />
        <Button disabled={!nt.title || !nt.start || !nt.end} onClick={() => void addTrack()}>Создать трек</Button>
      </CardContent></Card>
      {tracks.filter(t => t.id === trackId).map(t => (
        <Card key={t.id}><CardContent className="space-y-3 p-4">
          <div className="flex items-center justify-between">
            <div><p className="font-semibold">{t.title}</p><p className="text-xs text-muted-foreground">{t.start_date} — {t.end_date} · {t.status === 'closed' ? 'закрыт' : 'активен'}</p></div>
            {t.status !== 'closed' && <Button size="sm" variant="outline" onClick={() => void closeTrack(t.id)}>Закрыть трек</Button>}
          </div>
          <div className="space-y-2"><Label>Описание трека</Label><Textarea value={description} onChange={e => setDescription(e.target.value)}/><Button size="sm" variant="outline" onClick={async () => { if (!err((await sb.from('mastermind_tracks').update({description:description || null}).eq('id',t.id)).error)) toast({title:'Описание сохранено'}); }}>Сохранить описание</Button></div>
          <h4 className="font-semibold">Дашборд трека</h4>
          <TrackDashboard tasks={tasks} track={t} attended={rows.reduce((sum,r) => sum + r.attended,0)} meetings={meetings.filter(m => m.track_id === t.id && new Date(m.meeting_date) <= new Date()).length * members.length}/>
          <GroupProgress rows={rows} meetings={meetings.filter(m => m.track_id === t.id && new Date(m.meeting_date) <= new Date()).length}/>
          <h4 className="font-semibold">Участники и планы трека</h4>
          {members.map(member => { const goal = goals[member.id] || {member_id:member.id,goal:'',request:'',plan:'',outcome:''}; return <div key={member.id} className="space-y-3 border-b py-4"><p className="font-semibold">{member.name}</p>{(['goal','request','plan','outcome'] as const).map(key => <div key={key} className="space-y-1"><Label>{({goal:'Цель',request:'Запрос',plan:'План',outcome:'Итог'})[key]}</Label><Textarea aria-label={`${member.name}: ${key}`} value={goal[key] || ''} onChange={e => setGoals(g => ({...g,[member.id]:{...goal,[key]:e.target.value}}))}/></div>)}<Button size="sm" disabled={!goal.goal?.trim()} onClick={async () => {if (!err((await sb.from('mastermind_track_goals').upsert({...goal,track_id:t.id},{onConflict:'track_id,member_id'})).error)) toast({title:'План сохранён'});}}>Сохранить план участника</Button></div>; })}
          <h4 className="font-semibold">Темы и встречи</h4>
          <div className="flex flex-wrap gap-2">
            <Input className="w-auto" type="datetime-local" value={nm[t.id]?.date || ''} onChange={e => setNm({ ...nm, [t.id]: { ...(nm[t.id] || { topic: '' }), date: e.target.value } })} />
            <Input className="w-auto flex-1" placeholder="Тема встречи" value={nm[t.id]?.topic || ''} onChange={e => setNm({ ...nm, [t.id]: { ...(nm[t.id] || { date: '' }), topic: e.target.value } })} />
            <Button size="sm" onClick={() => void addMeeting(t.id)}>Добавить встречу</Button>
          </div>
          {meetings.filter(m => m.track_id === t.id).map(m => (
            <div key={m.id} className="rounded border p-2">
              <p className="mb-2 text-sm font-medium">{new Date(m.meeting_date).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' })}{m.topic ? ` · ${m.topic}` : ''}</p>
              <div className="grid gap-1 sm:grid-cols-2">
                {members.map(mb => (
                  <label key={mb.id} className="flex items-center gap-2 text-sm">
                    <Checkbox checked={!!att[`${m.id}:${mb.id}`]} onCheckedChange={v => void toggle(m.id, mb.id, !!v)} />{mb.name}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </CardContent></Card>
      ))}
    </div>
  );
};
