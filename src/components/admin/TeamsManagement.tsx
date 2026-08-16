import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Plus, Trash2, UserPlus, Users } from 'lucide-react';
import { AttendanceCheckinButton } from '@/components/admin/AttendanceCheckinButton';

type TrafficLight = 'green' | 'yellow' | 'red';

interface StreamRow {
  id: string;
  name: string;
  is_active: boolean | null;
  stream_type: string | null;
}

interface ProfileRow {
  user_id: string;
  display_name: string | null;
  participant_status: string | null;
  telegram_id: string | null;
  current_stream_id: string | null;
}

interface TeamRow {
  id: string;
  name: string | null;
  captain_user_id: string;
  stream_id: string;
  created_at: string;
}

interface MemberRow {
  id: string;
  team_id: string;
  user_id: string;
  traffic_light: TrafficLight;
  captain_comment: string | null;
}

const lightLabels: Record<TrafficLight, string> = {
  green: 'Зелёный',
  yellow: 'Жёлтый',
  red: 'Красный',
};

const lightClasses: Record<TrafficLight, string> = {
  green: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30',
  yellow: 'bg-amber-500/15 text-amber-600 border-amber-500/30',
  red: 'bg-red-500/15 text-red-600 border-red-500/30',
};

const nameOf = (p?: ProfileRow) => p?.display_name?.trim() || 'Без имени';

export const TeamsManagement: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [streams, setStreams] = useState<StreamRow[]>([]);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [captainIds, setCaptainIds] = useState<string[]>([]);
  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [members, setMembers] = useState<MemberRow[]>([]);

  const [selectedStream, setSelectedStream] = useState<string>('');
  const [rosterStream, setRosterStream] = useState<string>('');
  const [rosterFilter, setRosterFilter] = useState<string>('all');

  // dialogs
  const [teamDialogOpen, setTeamDialogOpen] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamCaptain, setNewTeamCaptain] = useState('');
  const [memberDialogTeam, setMemberDialogTeam] = useState<TeamRow | null>(null);
  const [newMemberUser, setNewMemberUser] = useState('');
  const [captainDialogOpen, setCaptainDialogOpen] = useState(false);
  const [newCaptainUser, setNewCaptainUser] = useState('');
  const [confirm, setConfirm] = useState<{ title: string; description: string; action: () => Promise<void> } | null>(null);
  const [busy, setBusy] = useState(false);

  const profileMap = useMemo(() => {
    const m = new Map<string, ProfileRow>();
    profiles.forEach((p) => m.set(p.user_id, p));
    return m;
  }, [profiles]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [streamsRes, profilesRes, rolesRes, teamsRes, membersRes] = await Promise.all([
        supabase.from('streams').select('id, name, is_active, stream_type').order('created_at', { ascending: false }),
        supabase.from('profiles').select('user_id, display_name, participant_status, telegram_id, current_stream_id'),
        supabase.from('user_roles').select('user_id, role').eq('role', 'captain'),
        supabase.from('captain_teams').select('id, name, captain_user_id, stream_id, created_at').order('created_at', { ascending: true }),
        supabase.from('captain_team_members').select('id, team_id, user_id, traffic_light, captain_comment'),
      ]);

      const firstError = streamsRes.error || profilesRes.error || rolesRes.error || teamsRes.error || membersRes.error;
      if (firstError) throw firstError;

      const streamList = (streamsRes.data || []) as StreamRow[];
      setStreams(streamList);
      setProfiles((profilesRes.data || []) as ProfileRow[]);
      setCaptainIds(((rolesRes.data || []) as { user_id: string }[]).map((r) => r.user_id));
      setTeams((teamsRes.data || []) as TeamRow[]);
      setMembers((membersRes.data || []) as MemberRow[]);

      const defaultStream = streamList.find((s) => s.is_active)?.id || streamList[0]?.id || '';
      setSelectedStream((prev) => prev || defaultStream);
      setRosterStream((prev) => prev || defaultStream);
    } catch (error) {
      console.error('Ошибка загрузки данных команд:', error);
      toast({ title: 'Ошибка', description: 'Не удалось загрузить данные команд', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const captains = useMemo(
    () => profiles.filter((p) => captainIds.includes(p.user_id)),
    [profiles, captainIds]
  );

  const streamTeams = useMemo(
    () => teams.filter((t) => t.stream_id === selectedStream),
    [teams, selectedStream]
  );

  const membersByTeam = useCallback(
    (teamId: string) => members.filter((m) => m.team_id === teamId),
    [members]
  );

  const assignedUserIdsInStream = useMemo(() => {
    const teamIds = new Set(teams.filter((t) => t.stream_id === selectedStream).map((t) => t.id));
    return new Set(members.filter((m) => teamIds.has(m.team_id)).map((m) => m.user_id));
  }, [teams, members, selectedStream]);

  const availableParticipants = useMemo(
    () =>
      profiles.filter(
        (p) =>
          p.participant_status === 'intensive_active' &&
          p.current_stream_id === selectedStream &&
          !assignedUserIdsInStream.has(p.user_id)
      ),
    [profiles, selectedStream, assignedUserIdsInStream]
  );

  const residents = useMemo(
    () => profiles.filter((p) => p.participant_status === 'club_resident' && !captainIds.includes(p.user_id)),
    [profiles, captainIds]
  );

  // ---- actions ----
  const createTeam = async () => {
    if (!newTeamCaptain) {
      toast({ title: 'Выберите капитана', variant: 'destructive' });
      return;
    }
    setBusy(true);
    try {
      const name = newTeamName.trim() || `Команда ${streamTeams.length + 1}`;
      const { error } = await supabase.from('captain_teams').insert({
        name,
        captain_user_id: newTeamCaptain,
        stream_id: selectedStream,
      });
      if (error) throw error;
      toast({ title: 'Команда создана', description: name });
      setTeamDialogOpen(false);
      setNewTeamName('');
      setNewTeamCaptain('');
      await loadAll();
    } catch (error) {
      console.error(error);
      toast({ title: 'Ошибка', description: 'Не удалось создать команду', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const addMember = async () => {
    if (!memberDialogTeam || !newMemberUser) return;
    setBusy(true);
    try {
      const { error } = await supabase.from('captain_team_members').insert({
        team_id: memberDialogTeam.id,
        user_id: newMemberUser,
        traffic_light: 'green',
      });
      if (error) throw error;
      toast({ title: 'Участник добавлен' });
      setMemberDialogTeam(null);
      setNewMemberUser('');
      await loadAll();
    } catch (error) {
      console.error(error);
      toast({ title: 'Ошибка', description: 'Не удалось добавить участника', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const removeMember = async (memberId: string) => {
    const { error } = await supabase.from('captain_team_members').delete().eq('id', memberId);
    if (error) {
      toast({ title: 'Ошибка', description: 'Не удалось удалить участника', variant: 'destructive' });
      return;
    }
    toast({ title: 'Участник удалён из команды' });
    await loadAll();
  };

  const removeTeam = async (teamId: string) => {
    const { error: memberError } = await supabase.from('captain_team_members').delete().eq('team_id', teamId);
    if (memberError) {
      toast({ title: 'Ошибка', description: 'Не удалось очистить состав команды', variant: 'destructive' });
      return;
    }
    const { error } = await supabase.from('captain_teams').delete().eq('id', teamId);
    if (error) {
      toast({ title: 'Ошибка', description: 'Не удалось удалить команду', variant: 'destructive' });
      return;
    }
    toast({ title: 'Команда удалена' });
    await loadAll();
  };

  const assignCaptain = async () => {
    if (!newCaptainUser) return;
    setBusy(true);
    try {
      const { error } = await supabase.from('user_roles').insert({
        user_id: newCaptainUser,
        role: 'captain',
        assigned_by: user?.id ?? null,
      });
      if (error) throw error;
      toast({ title: 'Капитан назначен' });
      setCaptainDialogOpen(false);
      setNewCaptainUser('');
      await loadAll();
    } catch (error) {
      console.error(error);
      toast({ title: 'Ошибка', description: 'Не удалось назначить капитана', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const revokeCaptain = async (userId: string) => {
    const { error } = await supabase.from('user_roles').delete().eq('user_id', userId).eq('role', 'captain');
    if (error) {
      toast({ title: 'Ошибка', description: 'Не удалось снять роль', variant: 'destructive' });
      return;
    }
    toast({ title: 'Роль капитана снята' });
    await loadAll();
  };

  // ---- roster ----
  const rosterRows = useMemo(() => {
    const teamIdsOfStream = new Set(teams.filter((t) => t.stream_id === rosterStream).map((t) => t.id));
    const memberByUser = new Map<string, MemberRow>();
    members.filter((m) => teamIdsOfStream.has(m.team_id)).forEach((m) => memberByUser.set(m.user_id, m));

    return profiles
      .filter((p) => p.participant_status === 'intensive_active' && p.current_stream_id === rosterStream)
      .map((p) => {
        const member = memberByUser.get(p.user_id);
        const team = member ? teams.find((t) => t.id === member.team_id) : undefined;
        return {
          profile: p,
          team,
          captain: team ? profileMap.get(team.captain_user_id) : undefined,
          light: member?.traffic_light,
        };
      })
      .filter((row) => {
        if (rosterFilter === 'all') return true;
        if (rosterFilter === 'unassigned') return !row.team;
        return row.light === rosterFilter;
      })
      .sort((a, b) => nameOf(a.profile).localeCompare(nameOf(b.profile), 'ru'));
  }, [profiles, teams, members, rosterStream, rosterFilter, profileMap]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const streamSelect = (value: string, onChange: (v: string) => void) => (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-full sm:w-[280px]">
        <SelectValue placeholder="Выберите поток" />
      </SelectTrigger>
      <SelectContent>
        {streams.map((s) => (
          <SelectItem key={s.id} value={s.id}>
            {s.name}
            {s.is_active ? ' • активный' : ''}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Users className="w-6 h-6" /> Команды
        </h2>
        <p className="text-muted-foreground text-sm mt-1">
          Команды потока, капитаны и распределение участников
        </p>
      </div>

      <Tabs defaultValue="teams">
        <TabsList>
          <TabsTrigger value="teams">Команды</TabsTrigger>
          <TabsTrigger value="captains">Капитаны</TabsTrigger>
          <TabsTrigger value="roster">Состав потока</TabsTrigger>
        </TabsList>

        {/* ---------- Команды ---------- */}
        <TabsContent value="teams" className="space-y-4 mt-4">
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
            {streamSelect(selectedStream, setSelectedStream)}
            <Button onClick={() => setTeamDialogOpen(true)} disabled={!selectedStream}>
              <Plus className="w-4 h-4 mr-2" /> Добавить команду
            </Button>
          </div>

          {streamTeams.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground">
                В этом потоке пока нет команд
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {streamTeams.map((team) => {
                const teamMembers = membersByTeam(team.id);
                const counts: Record<TrafficLight, number> = {
                  green: teamMembers.filter((m) => m.traffic_light === 'green').length,
                  yellow: teamMembers.filter((m) => m.traffic_light === 'yellow').length,
                  red: teamMembers.filter((m) => m.traffic_light === 'red').length,
                };
                return (
                  <Card key={team.id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <CardTitle className="text-lg">{team.name || 'Без названия'}</CardTitle>
                          <p className="text-sm text-muted-foreground mt-1">
                            Капитан: {nameOf(profileMap.get(team.captain_user_id))}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            setConfirm({
                              title: 'Удалить команду?',
                              description: `Команда «${team.name || 'Без названия'}» и её состав будут удалены.`,
                              action: () => removeTeam(team.id),
                            })
                          }
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2 pt-2">
                        <Badge variant="outline">Участников: {teamMembers.length}</Badge>
                        {(Object.keys(counts) as TrafficLight[]).map((light) => (
                          <Badge key={light} variant="outline" className={lightClasses[light]}>
                            {lightLabels[light]}: {counts[light]}
                          </Badge>
                        ))}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {teamMembers.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Состав пуст</p>
                      ) : (
                        <ul className="space-y-2">
                          {teamMembers.map((m) => (
                            <li
                              key={m.id}
                              className="flex items-start justify-between gap-2 rounded-md border p-2"
                            >
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-medium truncate">{nameOf(profileMap.get(m.user_id))}</span>
                                  <Badge variant="outline" className={lightClasses[m.traffic_light]}>
                                    {lightLabels[m.traffic_light]}
                                  </Badge>
                                </div>
                                {m.captain_comment && (
                                  <p className="text-xs text-muted-foreground mt-1">{m.captain_comment}</p>
                                )}
                               </div>
                               <div className="flex items-center gap-1 shrink-0">
                               <AttendanceCheckinButton
                                 userId={m.user_id}
                                 userName={nameOf(profileMap.get(m.user_id))}
                                 streamId={team.stream_id}
                                 onDone={loadData}
                               />
                               <Button
                                variant="ghost"
                                size="icon"
                                onClick={() =>
                                  setConfirm({
                                    title: 'Удалить участника из команды?',
                                    description: nameOf(profileMap.get(m.user_id)),
                                    action: () => removeMember(m.id),
                                  })
                                }
                              >
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </li>
                          ))}
                        </ul>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => {
                          setMemberDialogTeam(team);
                          setNewMemberUser('');
                        }}
                      >
                        <UserPlus className="w-4 h-4 mr-2" /> Добавить участника
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ---------- Капитаны ---------- */}
        <TabsContent value="captains" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <Button onClick={() => setCaptainDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" /> Назначить капитана
            </Button>
          </div>
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Имя</TableHead>
                    <TableHead>Telegram ID</TableHead>
                    <TableHead>Команд</TableHead>
                    <TableHead className="text-right">Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {captains.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                        Капитаны не назначены
                      </TableCell>
                    </TableRow>
                  ) : (
                    captains.map((c) => (
                      <TableRow key={c.user_id}>
                        <TableCell className="font-medium">{nameOf(c)}</TableCell>
                        <TableCell className="text-muted-foreground">{c.telegram_id || '—'}</TableCell>
                        <TableCell>{teams.filter((t) => t.captain_user_id === c.user_id).length}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setConfirm({
                                title: 'Снять роль капитана?',
                                description: `${nameOf(c)} потеряет права капитана.`,
                                action: () => revokeCaptain(c.user_id),
                              })
                            }
                          >
                            Снять роль
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---------- Состав потока ---------- */}
        <TabsContent value="roster" className="space-y-4 mt-4">
          <div className="flex flex-col sm:flex-row gap-3">
            {streamSelect(rosterStream, setRosterStream)}
            <Select value={rosterFilter} onValueChange={setRosterFilter}>
              <SelectTrigger className="w-full sm:w-[220px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все</SelectItem>
                <SelectItem value="unassigned">Не распределённые</SelectItem>
                <SelectItem value="green">Зелёные</SelectItem>
                <SelectItem value="yellow">Жёлтые</SelectItem>
                <SelectItem value="red">Красные</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Имя</TableHead>
                    <TableHead>Команда</TableHead>
                    <TableHead>Капитан</TableHead>
                    <TableHead>Светофор</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rosterRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                        Нет участников по выбранным условиям
                      </TableCell>
                    </TableRow>
                  ) : (
                    rosterRows.map((row) => (
                      <TableRow key={row.profile.user_id}>
                        <TableCell className="font-medium">{nameOf(row.profile)}</TableCell>
                        <TableCell>
                          {row.team ? (
                            row.team.name || 'Без названия'
                          ) : (
                            <span className="text-muted-foreground">Не распределён</span>
                          )}
                        </TableCell>
                        <TableCell>{row.captain ? nameOf(row.captain) : '—'}</TableCell>
                        <TableCell>
                          {row.light ? (
                            <Badge variant="outline" className={lightClasses[row.light]}>
                              {lightLabels[row.light]}
                            </Badge>
                          ) : (
                            '—'
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Диалог создания команды */}
      <Dialog open={teamDialogOpen} onOpenChange={setTeamDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Новая команда</DialogTitle>
            <DialogDescription>Название необязательно — будет сгенерировано автоматически.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder={`Команда ${streamTeams.length + 1}`}
              value={newTeamName}
              onChange={(e) => setNewTeamName(e.target.value)}
              maxLength={100}
            />
            <Select value={newTeamCaptain} onValueChange={setNewTeamCaptain}>
              <SelectTrigger>
                <SelectValue placeholder="Выберите капитана" />
              </SelectTrigger>
              <SelectContent>
                {captains.map((c) => (
                  <SelectItem key={c.user_id} value={c.user_id}>
                    {nameOf(c)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTeamDialogOpen(false)}>
              Отмена
            </Button>
            <Button onClick={createTeam} disabled={busy}>
              Создать
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Диалог добавления участника */}
      <Dialog open={!!memberDialogTeam} onOpenChange={(open) => !open && setMemberDialogTeam(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Добавить участника</DialogTitle>
            <DialogDescription>
              {memberDialogTeam?.name || 'Команда'} — доступны активные участники интенсива без команды.
            </DialogDescription>
          </DialogHeader>
          <Select value={newMemberUser} onValueChange={setNewMemberUser}>
            <SelectTrigger>
              <SelectValue placeholder="Выберите участника" />
            </SelectTrigger>
            <SelectContent>
              {availableParticipants.map((p) => (
                <SelectItem key={p.user_id} value={p.user_id}>
                  {nameOf(p)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMemberDialogTeam(null)}>
              Отмена
            </Button>
            <Button onClick={addMember} disabled={busy || !newMemberUser}>
              Добавить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Диалог назначения капитана */}
      <Dialog open={captainDialogOpen} onOpenChange={setCaptainDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Назначить капитана</DialogTitle>
            <DialogDescription>Доступны резиденты клуба без роли капитана.</DialogDescription>
          </DialogHeader>
          <Select value={newCaptainUser} onValueChange={setNewCaptainUser}>
            <SelectTrigger>
              <SelectValue placeholder="Выберите резидента" />
            </SelectTrigger>
            <SelectContent>
              {residents.map((p) => (
                <SelectItem key={p.user_id} value={p.user_id}>
                  {nameOf(p)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCaptainDialogOpen(false)}>
              Отмена
            </Button>
            <Button onClick={assignCaptain} disabled={busy || !newCaptainUser}>
              Назначить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Подтверждения */}
      <AlertDialog open={!!confirm} onOpenChange={(open) => !open && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirm?.title}</AlertDialogTitle>
            <AlertDialogDescription>{confirm?.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                const action = confirm?.action;
                setConfirm(null);
                if (action) await action();
              }}
            >
              Подтвердить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default TeamsManagement;
