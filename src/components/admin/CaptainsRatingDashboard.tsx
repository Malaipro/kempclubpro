import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, RefreshCw, Trophy, Users, Crown } from 'lucide-react';

type TrafficLight = 'green' | 'yellow' | 'red';

interface StreamRow {
  id: string;
  name: string;
  is_active: boolean | null;
}

interface ProfileRow {
  user_id: string;
  display_name: string | null;
}

interface TeamRow {
  id: string;
  name: string | null;
  captain_user_id: string;
  stream_id: string;
}

interface MemberRow {
  team_id: string;
  user_id: string;
  traffic_light: TrafficLight;
}

interface CaptainStat {
  captainId: string;
  captainName: string;
  teams: string[];
  members: number;
  green: number;
  yellow: number;
  red: number;
  rating: number;
}

export const CaptainsRatingDashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [streams, setStreams] = useState<StreamRow[]>([]);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [selectedStream, setSelectedStream] = useState<string>('');

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [streamsRes, profilesRes, teamsRes, membersRes] = await Promise.all([
        supabase.from('streams').select('id, name, is_active').order('created_at', { ascending: false }),
        supabase.from('profiles').select('user_id, display_name'),
        supabase.from('captain_teams').select('id, name, captain_user_id, stream_id'),
        supabase.from('captain_team_members').select('team_id, user_id, traffic_light'),
      ]);

      const streamRows = (streamsRes.data || []) as StreamRow[];
      setStreams(streamRows);
      setProfiles((profilesRes.data || []) as ProfileRow[]);
      setTeams((teamsRes.data || []) as TeamRow[]);
      setMembers((membersRes.data || []) as MemberRow[]);

      setSelectedStream((prev) => prev ?? '');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const profileMap = useMemo(() => {
    const m = new Map<string, ProfileRow>();
    profiles.forEach((p) => m.set(p.user_id, p));
    return m;
  }, [profiles]);

  const stats: CaptainStat[] = useMemo(() => {
    const streamTeams = teams.filter((t) => !selectedStream || t.stream_id === selectedStream);
    const teamIds = new Set(streamTeams.map((t) => t.id));
    const byCaptain = new Map<string, CaptainStat>();

    streamTeams.forEach((t) => {
      const existing = byCaptain.get(t.captain_user_id) || {
        captainId: t.captain_user_id,
        captainName: profileMap.get(t.captain_user_id)?.display_name?.trim() || 'Без имени',
        teams: [],
        members: 0,
        green: 0,
        yellow: 0,
        red: 0,
        rating: 0,
      };
      existing.teams.push(t.name?.trim() || 'Команда');
      byCaptain.set(t.captain_user_id, existing);
    });

    const teamCaptain = new Map(streamTeams.map((t) => [t.id, t.captain_user_id]));
    members.forEach((m) => {
      if (!teamIds.has(m.team_id)) return;
      const captainId = teamCaptain.get(m.team_id);
      if (!captainId) return;
      const stat = byCaptain.get(captainId);
      if (!stat) return;
      stat.members += 1;
      if (m.traffic_light === 'green') stat.green += 1;
      else if (m.traffic_light === 'yellow') stat.yellow += 1;
      else stat.red += 1;
    });

    return Array.from(byCaptain.values())
      .map((s) => ({
        ...s,
        rating: s.members ? Math.round(((s.green * 2 + s.yellow) / (s.members * 2)) * 100) : 0,
      }))
      .sort((a, b) => b.rating - a.rating || b.members - a.members);
  }, [teams, members, selectedStream, profileMap]);

  const totals = useMemo(() => {
    const members = stats.reduce((acc, s) => acc + s.members, 0);
    const green = stats.reduce((acc, s) => acc + s.green, 0);
    const yellow = stats.reduce((acc, s) => acc + s.yellow, 0);
    const avg = stats.length ? Math.round(stats.reduce((acc, s) => acc + s.rating, 0) / stats.length) : 0;
    return { captains: stats.length, members, green, yellow, avg };
  }, [stats]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="flex items-center gap-3">
          <Select value={selectedStream} onValueChange={setSelectedStream}>
            <SelectTrigger className="w-[260px]">
              <SelectValue placeholder="Выберите поток" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Все потоки</SelectItem>
              {streams.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                  {s.is_active ? ' • активный' : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" size="sm" onClick={loadAll}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Обновить
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Crown className="w-4 h-4" /> Капитанов
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{totals.captains}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="w-4 h-4" /> Участников в командах
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{totals.members}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Зелёных / Жёлтых</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">
            {totals.green} / {totals.yellow}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Trophy className="w-4 h-4" /> Средний рейтинг
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{totals.avg}%</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Рейтинг капитанов</CardTitle>
        </CardHeader>
        <CardContent>
          {stats.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              Нет команд в выбранном потоке.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Капитан</TableHead>
                  <TableHead>Команды</TableHead>
                  <TableHead className="text-center">Участников</TableHead>
                  <TableHead className="text-center">Светофор</TableHead>
                  <TableHead className="w-[200px]">Рейтинг</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.map((s, i) => (
                  <TableRow key={s.captainId}>
                    <TableCell className="font-semibold">{i + 1}</TableCell>
                    <TableCell className="font-medium">{s.captainName}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{s.teams.join(', ')}</TableCell>
                    <TableCell className="text-center">{s.members}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-1">
                        <Badge variant="outline" className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30">
                          {s.green}
                        </Badge>
                        <Badge variant="outline" className="bg-amber-500/15 text-amber-600 border-amber-500/30">
                          {s.yellow}
                        </Badge>
                        <Badge variant="outline" className="bg-red-500/15 text-red-600 border-red-500/30">
                          {s.red}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={s.rating} className="h-2" />
                        <span className="text-sm font-semibold w-10 text-right">{s.rating}%</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          <p className="text-xs text-muted-foreground mt-4">
            Рейтинг = (зелёные × 2 + жёлтые) / (участники × 2) × 100%.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
