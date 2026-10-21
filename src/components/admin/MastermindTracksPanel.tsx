import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';

const sb = supabase as unknown as { from: (t: string) => any; auth: typeof supabase.auth };
type Track = { id: string; group_id: string; title: string; start_date: string; end_date: string; status: string };
type Meeting = { id: string; track_id: string; meeting_date: string; topic: string | null };
type Member = { id: string; group_id: string | null; user_id: string; name: string };

export const MastermindTracksPanel = ({ groups }: { groups: { id: string; name: string }[] }) => {
  const { toast } = useToast();
  const [groupId, setGroupId] = useState(groups[0]?.id || '');
  const [tracks, setTracks] = useState<Track[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [att, setAtt] = useState<Record<string, boolean>>({});
  const [nt, setNt] = useState({ title: '', start: '', end: '' });
  const [nm, setNm] = useState<Record<string, { date: string; topic: string }>>({});

  useEffect(() => { if (!groupId && groups[0]) setGroupId(groups[0].id); }, [groups, groupId]);

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
  }, [groupId]);
  useEffect(() => { void load(); }, [load]);

  const err = (e: any) => { if (e) toast({ title: 'Ошибка', description: e.message, variant: 'destructive' }); return !!e; };
  const addTrack = async () => {
    const { error } = await sb.from('mastermind_tracks').insert({ group_id: groupId, title: nt.title, start_date: nt.start, end_date: nt.end });
    if (!err(error)) { setNt({ title: '', start: '', end: '' }); void load(); }
  };
  const closeTrack = async (id: string) => { if (!err((await sb.from('mastermind_tracks').update({ status: 'closed' }).eq('id', id)).error)) void load(); };
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
      <select className="h-10 rounded-md border bg-background px-3 text-sm" value={groupId} onChange={e => setGroupId(e.target.value)}>
        {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
      </select>
      <Card><CardContent className="grid gap-2 p-4 sm:grid-cols-4">
        <Input placeholder="Название трека" value={nt.title} onChange={e => setNt({ ...nt, title: e.target.value })} />
        <Input type="date" value={nt.start} onChange={e => setNt({ ...nt, start: e.target.value })} />
        <Input type="date" value={nt.end} onChange={e => setNt({ ...nt, end: e.target.value })} />
        <Button disabled={!nt.title || !nt.start || !nt.end} onClick={() => void addTrack()}>Создать трек</Button>
      </CardContent></Card>
      {tracks.map(t => (
        <Card key={t.id}><CardContent className="space-y-3 p-4">
          <div className="flex items-center justify-between">
            <div><p className="font-semibold">{t.title}</p><p className="text-xs text-muted-foreground">{t.start_date} — {t.end_date} · {t.status === 'closed' ? 'закрыт' : 'активен'}</p></div>
            {t.status !== 'closed' && <Button size="sm" variant="outline" onClick={() => void closeTrack(t.id)}>Закрыть трек</Button>}
          </div>
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
