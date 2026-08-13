import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { RefreshCw, Users, UsersRound, UserMinus, Layers } from 'lucide-react';

interface Stream {
  id: string;
  name: string;
  is_active: boolean;
}

interface TeamRating {
  team_id: string;
  team_name: string;
  captain_name: string | null;
  team_rating: number;
  members_count: number;
  completed_count: number;
}

interface MemberRow {
  user_id: string;
  traffic_light: string | null;
  captain_comment: string | null;
  team_id: string;
}

interface TeamInfo {
  id: string;
  name: string;
  captain_user_id: string | null;
}

const ratingColor = (r: number) => (r >= 70 ? 'text-green-500' : r >= 50 ? 'text-yellow-500' : 'text-red-500');

export const StreamDashboard: React.FC = () => {
  const { toast } = useToast();
  const [streams, setStreams] = useState<Stream[]>([]);
  const [streamId, setStreamId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState(false);

  const [totalParticipants, setTotalParticipants] = useState(0);
  const [teams, setTeams] = useState<TeamInfo[]>([]);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [ratings, setRatings] = useState<TeamRating[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('streams')
        .select('id, name, is_active')
        .order('created_at', { ascending: false });
      const list = (data || []) as Stream[];
      setStreams(list);
      const active = list.find((s) => s.is_active) || list[0];
      if (active) setStreamId(active.id);
      else setLoading(false);
    })();
  }, []);

  const loadData = async (id: string) => {
    setLoading(true);
    try {
      const [{ count }, teamsRes, ratingsRes] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('current_stream_id', id),
        supabase.from('captain_teams').select('id, name, captain_user_id').eq('stream_id', id),
        supabase.rpc('get_stream_team_ratings', { p_stream_id: id }),
      ]);

      setTotalParticipants(count || 0);
      const teamList = (teamsRes.data || []) as TeamInfo[];
      setTeams(teamList);
      setRatings(((ratingsRes.data as TeamRating[]) || []).slice().sort((a, b) => Number(b.team_rating) - Number(a.team_rating)));

      let memberList: MemberRow[] = [];
      if (teamList.length > 0) {
        const { data: m } = await supabase
          .from('captain_team_members')
          .select('user_id, traffic_light, captain_comment, team_id')
          .in('team_id', teamList.map((t) => t.id));
        memberList = (m || []) as MemberRow[];
      }
      setMembers(memberList);

      const userIds = Array.from(
        new Set([...memberList.map((m) => m.user_id), ...teamList.map((t) => t.captain_user_id).filter(Boolean) as string[]])
      );
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, display_name')
          .in('user_id', userIds);
        const map: Record<string, string> = {};
        (profiles || []).forEach((p: any) => {
          map[p.user_id] = p.display_name || 'Без имени';
        });
        setNames(map);
      } else {
        setNames({});
      }
    } catch (e: any) {
      toast({ title: 'Ошибка загрузки', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (streamId) loadData(streamId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streamId]);

  const handleRecalculate = async () => {
    if (!streamId) return;
    setRecalculating(true);
    try {
      const { error } = await supabase.rpc('recalculate_stream_ratings', { p_stream_id: streamId });
      if (error) throw error;
      toast({ title: 'Рейтинг пересчитан' });
      await loadData(streamId);
    } catch (e: any) {
      toast({ title: 'Ошибка пересчёта', description: e.message, variant: 'destructive' });
    } finally {
      setRecalculating(false);
    }
  };

  const assigned = members.length;
  const unassigned = Math.max(totalParticipants - assigned, 0);

  const trafficStats = useMemo(() => {
    const stats = { green: 0, yellow: 0, red: 0, none: 0 };
    members.forEach((m) => {
      const v = (m.traffic_light || '').toLowerCase();
      if (v === 'green') stats.green++;
      else if (v === 'yellow') stats.yellow++;
      else if (v === 'red') stats.red++;
      else stats.none++;
    });
    return stats;
  }, [members]);

  const teamById = useMemo(() => {
    const map: Record<string, TeamInfo> = {};
    teams.forEach((t) => (map[t.id] = t));
    return map;
  }, [teams]);

  const redMembers = members.filter((m) => (m.traffic_light || '').toLowerCase() === 'red');
  const barTotal = Math.max(trafficStats.green + trafficStats.yellow + trafficStats.red, 1);

  const metrics = [
    { label: 'Всего участников', value: totalParticipants, icon: Users },
    { label: 'Распределено по командам', value: assigned, icon: UsersRound },
    { label: 'Не распределены', value: unassigned, icon: UserMinus },
    { label: 'Команд', value: teams.length, icon: Layers },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Дашборд Поток</h2>
          <p className="text-muted-foreground text-sm">Сводка по текущему потоку интенсива</p>
        </div>
        <Select value={streamId} onValueChange={setStreamId}>
          <SelectTrigger className="w-[260px]">
            <SelectValue placeholder="Выберите поток" />
          </SelectTrigger>
          <SelectContent>
            {streams.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
                {s.is_active ? ' (активный)' : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {metrics.map((m) => (
          <Card key={m.label}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{m.label}</p>
                  <p className="text-3xl font-bold">{loading ? '—' : m.value}</p>
                </div>
                <m.icon className="w-8 h-8 text-muted-foreground/50" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Рейтинг команд</CardTitle>
          <Button variant="outline" size="sm" onClick={handleRecalculate} disabled={recalculating || !streamId}>
            <RefreshCw className={`w-4 h-4 mr-2 ${recalculating ? 'animate-spin' : ''}`} />
            Пересчитать рейтинг
          </Button>
        </CardHeader>
        <CardContent>
          {ratings.length === 0 ? (
            <p className="text-muted-foreground text-sm">Нет данных по командам этого потока</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Место</TableHead>
                  <TableHead>Команда</TableHead>
                  <TableHead>Капитан</TableHead>
                  <TableHead>Рейтинг</TableHead>
                  <TableHead>Участников</TableHead>
                  <TableHead>Завершивших (≥50)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ratings.map((r, i) => (
                  <TableRow key={r.team_id}>
                    <TableCell className="font-semibold">{i + 1}</TableCell>
                    <TableCell>{r.team_name}</TableCell>
                    <TableCell>{r.captain_name || '—'}</TableCell>
                    <TableCell className={`font-bold ${ratingColor(Number(r.team_rating))}`}>
                      {Number(r.team_rating).toFixed(1)}
                    </TableCell>
                    <TableCell>{r.members_count}</TableCell>
                    <TableCell>{r.completed_count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Светофор потока</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { label: 'Зелёные', value: trafficStats.green, cls: 'bg-green-500' },
              { label: 'Жёлтые', value: trafficStats.yellow, cls: 'bg-yellow-500' },
              { label: 'Красные', value: trafficStats.red, cls: 'bg-red-500' },
            ].map((b) => (
              <div key={b.label} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>{b.label}</span>
                  <span className="font-semibold">
                    {b.value} ({Math.round((b.value / barTotal) * 100)}%)
                  </span>
                </div>
                <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
                  <div className={`h-full ${b.cls}`} style={{ width: `${(b.value / barTotal) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
          {trafficStats.none > 0 && (
            <p className="text-xs text-muted-foreground">Без статуса: {trafficStats.none}</p>
          )}

          <div>
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              Красная зона <Badge variant="destructive">{redMembers.length}</Badge>
            </h4>
            {redMembers.length === 0 ? (
              <p className="text-muted-foreground text-sm">Красных участников нет</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Участник</TableHead>
                    <TableHead>Команда</TableHead>
                    <TableHead>Капитан</TableHead>
                    <TableHead>Комментарий</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {redMembers.map((m) => {
                    const team = teamById[m.team_id];
                    return (
                      <TableRow key={m.user_id + m.team_id}>
                        <TableCell>{names[m.user_id] || 'Без имени'}</TableCell>
                        <TableCell>{team?.name || '—'}</TableCell>
                        <TableCell>{team?.captain_user_id ? names[team.captain_user_id] || '—' : '—'}</TableCell>
                        <TableCell className="text-muted-foreground">{m.captain_comment || '—'}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
