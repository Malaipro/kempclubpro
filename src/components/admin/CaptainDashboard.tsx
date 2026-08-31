import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CheckpointPhotos, parsePhotoUrls } from '@/components/checkpoints/CheckpointPhotos';

import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, RefreshCw, Save, BookOpen, Target } from 'lucide-react';
import { AttendanceCheckinButton } from '@/components/admin/AttendanceCheckinButton';

type TrafficLight = 'green' | 'yellow' | 'red';

interface TeamRow {
  id: string;
  name: string | null;
  stream_id: string;
  captain_user_id: string;
}

interface MemberRow {
  id: string;
  team_id: string;
  user_id: string;
  traffic_light: TrafficLight;
  captain_comment: string | null;
}

interface ProfileRow {
  user_id: string;
  display_name: string | null;
  telegram_id: string | null;
}

interface TlrRow {
  id: string;
  team_member_id: string;
  current_light: string | null;
  requested_light: string | null;
  reason: string | null;
  created_at: string;
}

interface CheckpointRow {
  id: string;
  user_id: string;
  stream_id: string;
  checkpoint_type: string;
  weight_kg: number | null;
  waist_cm: number | null;
  belly_cm: number | null;
  chest_cm: number | null;
  hips_cm: number | null;
  body_fat_pct: number | null;
  photo_urls: unknown;
  personal_goal: string | null;
  personal_result: string | null;
  main_achievement: string | null;
  created_at: string;
}

interface LeaderRow {
  user_id: string;
  total_points: number | null;
  rank_position: number | null;
}

interface JournalEntryRow {
  id: string;
  user_id: string;
  entry_date: string;
  day_type: string | null;
}

interface JournalAnswerRow {
  id: string;
  entry_id: string;
  prompt_id: string;
  answer_text: string | null;
}

interface PromptRow {
  id: string;
  question_text: string;
}

interface SummaryRow {
  id: string;
  team_id: string;
  captain_user_id: string;
  week_start: string;
  week_end: string;
  summary: string;
  raw_data: unknown;
  created_at: string | null;
}

const LIGHT_LABEL: Record<TrafficLight, string> = {
  green: 'Зелёный',
  yellow: 'Жёлтый',
  red: 'Красный',
};

const LightBadge: React.FC<{ light: TrafficLight }> = ({ light }) => {
  const cls =
    light === 'green'
      ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30'
      : light === 'yellow'
      ? 'bg-amber-500/15 text-amber-600 border-amber-500/30'
      : 'bg-red-500/15 text-red-600 border-red-500/30';
  return (
    <Badge variant="outline" className={cls}>
      {LIGHT_LABEL[light]}
    </Badge>
  );
};

const fmtDate = (v?: string | null) =>
  v ? new Date(v).toLocaleDateString('ru-RU') : '—';

export const CaptainDashboard: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<string>('');
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [requests, setRequests] = useState<TlrRow[]>([]);
  const [checkpoints, setCheckpoints] = useState<CheckpointRow[]>([]);
  const [ratings, setRatings] = useState<{ team_rating: number | null } | null>(null);
  const [leaders, setLeaders] = useState<LeaderRow[]>([]);
  const [entries, setEntries] = useState<JournalEntryRow[]>([]);
  const [answers, setAnswers] = useState<JournalAnswerRow[]>([]);
  const [prompts, setPrompts] = useState<PromptRow[]>([]);
  const [summaries, setSummaries] = useState<SummaryRow[]>([]);

  const [comments, setComments] = useState<Record<string, string>>({});
  const [savingComment, setSavingComment] = useState<string | null>(null);

  const [lightTarget, setLightTarget] = useState<{ member: MemberRow; next: TrafficLight } | null>(null);
  const [lightReason, setLightReason] = useState('');
  const [savingLight, setSavingLight] = useState(false);

  const [checkpointView, setCheckpointView] = useState<CheckpointRow | null>(null);
  const [journalUser, setJournalUser] = useState<string | null>(null);

  const weekAgo = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().slice(0, 10);
  }, []);

  const loadTeams = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data } = await supabase
        .from('captain_teams')
        .select('id, name, stream_id, captain_user_id')
        .eq('captain_user_id', user.id);
      const rows = (data || []) as TeamRow[];
      setTeams(rows);
      setSelectedTeam((prev) => prev || rows[0]?.id || '');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const loadTeamData = useCallback(async () => {
    if (!selectedTeam) {
      setMembers([]);
      return;
    }
    setLoading(true);
    try {
      const team = teams.find((t) => t.id === selectedTeam);
      const { data: memberRows } = await supabase
        .from('captain_team_members')
        .select('id, team_id, user_id, traffic_light, captain_comment')
        .eq('team_id', selectedTeam);
      const mem = (memberRows || []) as MemberRow[];
      setMembers(mem);
      setComments(Object.fromEntries(mem.map((m) => [m.id, m.captain_comment || ''])));

      const userIds = mem.map((m) => m.user_id);
      const memberIds = mem.map((m) => m.id);

      const [profRes, tlrRes, cpRes, lbRes, jeRes, ratingRes, promptRes, sumRes] = await Promise.all([
        userIds.length
          ? supabase.from('profiles').select('user_id, display_name, telegram_id').in('user_id', userIds)
          : Promise.resolve({ data: [] }),
        memberIds.length
          ? supabase
              .from('traffic_light_requests')
              .select('id, team_member_id, current_light, requested_light, reason, created_at')
              .in('team_member_id', memberIds)
              .order('created_at', { ascending: false })
          : Promise.resolve({ data: [] }),
        userIds.length && team
          ? supabase
              .from('participant_checkpoints')
              .select('*')
              .in('user_id', userIds)
              .eq('stream_id', team.stream_id)
          : Promise.resolve({ data: [] }),
        userIds.length
          ? supabase.from('leaderboard').select('user_id, total_points, rank_position').in('user_id', userIds)
          : Promise.resolve({ data: [] }),
        userIds.length
          ? supabase
              .from('journal_entries')
              .select('id, user_id, entry_date, day_type')
              .in('user_id', userIds)
              .gte('entry_date', weekAgo)
              .order('entry_date', { ascending: false })
          : Promise.resolve({ data: [] }),
        team
          ? supabase
              .from('captain_ratings')
              .select('team_rating')
              .eq('captain_user_id', team.captain_user_id)
              .eq('stream_id', team.stream_id)
              .maybeSingle()
          : Promise.resolve({ data: null }),
        supabase.from('journal_prompts').select('id, question_text'),
        team
          ? supabase
              .from('team_weekly_summaries')
              .select('id, team_id, captain_user_id, week_start, week_end, summary, raw_data, created_at')
              .eq('team_id', selectedTeam)
              .order('week_start', { ascending: false })
          : Promise.resolve({ data: [] }),
      ]);

      setProfiles((profRes.data || []) as ProfileRow[]);
      setRequests((tlrRes.data || []) as TlrRow[]);
      setCheckpoints((cpRes.data || []) as CheckpointRow[]);
      setLeaders((lbRes.data || []) as LeaderRow[]);
      const journalRows = (jeRes.data || []) as JournalEntryRow[];
      setEntries(journalRows);
      setRatings((ratingRes.data || null) as { team_rating: number | null } | null);
      setPrompts((promptRes.data || []) as PromptRow[]);
      setSummaries((sumRes.data || []) as SummaryRow[]);

      if (journalRows.length) {
        const { data: ansRows } = await supabase
          .from('journal_answers')
          .select('id, entry_id, prompt_id, answer_text')
          .in('entry_id', journalRows.map((e) => e.id));
        setAnswers((ansRows || []) as JournalAnswerRow[]);
      } else {
        setAnswers([]);
      }
    } finally {
      setLoading(false);
    }
  }, [selectedTeam, teams, weekAgo]);

  useEffect(() => {
    loadTeams();
  }, [loadTeams]);

  useEffect(() => {
    loadTeamData();
  }, [loadTeamData]);

  const profileMap = useMemo(() => {
    const m = new Map<string, ProfileRow>();
    profiles.forEach((p) => m.set(p.user_id, p));
    return m;
  }, [profiles]);

  const nameOf = (userId: string) =>
    profileMap.get(userId)?.display_name?.trim() || 'Без имени';

  const saveComment = async (member: MemberRow) => {
    setSavingComment(member.id);
    const { error } = await supabase
      .from('captain_team_members')
      .update({
        captain_comment: comments[member.id] || null,
        comment_updated_at: new Date().toISOString(),
      })
      .eq('id', member.id);
    setSavingComment(null);
    if (error) {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Комментарий сохранён' });
    loadTeamData();
  };

  const applyLightChange = async () => {
    if (!lightTarget || !user) return;
    setSavingLight(true);
    const { member, next } = lightTarget;
    const { error: insErr } = await supabase.from('traffic_light_requests').insert({
      team_member_id: member.id,
      requested_by: user.id,
      current_light: member.traffic_light,
      requested_light: next,
      reason: lightReason || null,
      status: 'applied',
    });
    if (insErr) {
      setSavingLight(false);
      toast({ title: 'Ошибка', description: insErr.message, variant: 'destructive' });
      return;
    }
    const { error: updErr } = await supabase
      .from('captain_team_members')
      .update({ traffic_light: next })
      .eq('id', member.id);
    setSavingLight(false);
    if (updErr) {
      toast({ title: 'Ошибка', description: updErr.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Светофор обновлён' });
    setLightTarget(null);
    setLightReason('');
    loadTeamData();
  };

  const checkpointFor = (userId: string, type: 'a' | 'b') =>
    checkpoints.find(
      (c) => c.user_id === userId && (c.checkpoint_type || '').toLowerCase().includes(type),
    );

  const journalEntriesOf = (userId: string) => entries.filter((e) => e.user_id === userId);
  const promptMap = useMemo(() => {
    const m = new Map<string, string>();
    prompts.forEach((p) => m.set(p.id, p.question_text));
    return m;
  }, [prompts]);

  if (loading && !members.length && !teams.length) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!teams.length) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">
          За вами не закреплено ни одной команды.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <Select value={selectedTeam} onValueChange={setSelectedTeam}>
          <SelectTrigger className="w-[260px]">
            <SelectValue placeholder="Выберите команду" />
          </SelectTrigger>
          <SelectContent>
            {teams.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.name?.trim() || 'Команда'}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={loadTeamData}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Обновить
        </Button>
      </div>

      <Tabs defaultValue="team">
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="team">Моя команда</TabsTrigger>
          <TabsTrigger value="lights">Светофор</TabsTrigger>
          <TabsTrigger value="checkpoints">Точка А/Б</TabsTrigger>
          <TabsTrigger value="rating">Рейтинг</TabsTrigger>
          <TabsTrigger value="journal">Ежедневник</TabsTrigger>
          <TabsTrigger value="summaries">Сводки</TabsTrigger>
        </TabsList>

        {/* Моя команда */}
        <TabsContent value="team" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Состав команды ({members.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {members.length === 0 && (
                <p className="text-sm text-muted-foreground py-4 text-center">В команде пока нет участников.</p>
              )}
              {members.map((m) => (
                <div key={m.id} className="rounded-lg border p-4 space-y-3">
                  <div className="flex flex-wrap items-center gap-3 justify-between">
                    <div>
                      <p className="font-medium">{nameOf(m.user_id)}</p>
                      <p className="text-xs text-muted-foreground">
                        Telegram: {profileMap.get(m.user_id)?.telegram_id || '—'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <LightBadge light={m.traffic_light} />
                      <AttendanceCheckinButton
                        userId={m.user_id}
                        userName={nameOf(m.user_id)}
                        streamId={teams.find((t) => t.id === selectedTeam)?.stream_id ?? null}
                        onDone={loadTeamData}
                      />
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Input
                      value={comments[m.id] ?? ''}
                      onChange={(e) => setComments((prev) => ({ ...prev, [m.id]: e.target.value }))}
                      placeholder="Комментарий капитана"
                    />
                    <Button
                      variant="outline"
                      onClick={() => saveComment(m)}
                      disabled={savingComment === m.id}
                    >
                      {savingComment === m.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Светофор */}
        <TabsContent value="lights" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Управление светофором</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {members.map((m) => {
                const history = requests.filter((r) => r.team_member_id === m.id).slice(0, 5);
                return (
                  <div key={m.id} className="rounded-lg border p-4 space-y-3">
                    <div className="flex flex-wrap items-center gap-3 justify-between">
                      <p className="font-medium">{nameOf(m.user_id)}</p>
                      <LightBadge light={m.traffic_light} />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {(['green', 'yellow', 'red'] as TrafficLight[]).map((l) => (
                        <Button
                          key={l}
                          size="sm"
                          variant={m.traffic_light === l ? 'default' : 'outline'}
                          onClick={() => {
                            setLightTarget({ member: m, next: l });
                            setLightReason('');
                          }}
                        >
                          {LIGHT_LABEL[l]}
                        </Button>
                      ))}
                    </div>
                    {history.length > 0 && (
                      <div className="text-xs text-muted-foreground space-y-1">
                        {history.map((h) => (
                          <div key={h.id}>
                            {fmtDate(h.created_at)}: {h.current_light || '—'} → {h.requested_light || '—'}
                            {h.reason ? ` — ${h.reason}` : ''}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Точка А/Б */}
        <TabsContent value="checkpoints" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Точки А и Б</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Участник</TableHead>
                    <TableHead>Точка А</TableHead>
                    <TableHead>Точка Б</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((m) => {
                    const a = checkpointFor(m.user_id, 'a');
                    const b = checkpointFor(m.user_id, 'b');
                    return (
                      <TableRow key={m.id}>
                        <TableCell className="font-medium">{nameOf(m.user_id)}</TableCell>
                        {[a, b].map((cp, idx) => (
                          <TableCell key={idx}>
                            {cp ? (
                              <Button variant="ghost" size="sm" onClick={() => setCheckpointView(cp)}>
                                <Target className="w-4 h-4 mr-2" />
                                Заполнена {fmtDate(cp.created_at)}
                              </Button>
                            ) : (
                              <span className="text-sm text-muted-foreground">Не заполнена</span>
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Рейтинг */}
        <TabsContent value="rating" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Средний рейтинг команды</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-bold">
              {ratings?.team_rating != null ? `${Number(ratings.team_rating).toFixed(1)}` : 'Не рассчитан'}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Рейтинг участников</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Участник</TableHead>
                    <TableHead className="text-center">Очки</TableHead>
                    <TableHead className="text-center">Место</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members
                    .map((m) => ({ m, lb: leaders.find((l) => l.user_id === m.user_id) }))
                    .sort((x, y) => (y.lb?.total_points || 0) - (x.lb?.total_points || 0))
                    .map(({ m, lb }) => (
                      <TableRow key={m.id}>
                        <TableCell className="font-medium">{nameOf(m.user_id)}</TableCell>
                        <TableCell className="text-center">{lb?.total_points ?? 0}</TableCell>
                        <TableCell className="text-center">{lb?.rank_position ?? '—'}</TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Ежедневник */}
        <TabsContent value="journal" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Ежедневник за последнюю неделю</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Участник</TableHead>
                    <TableHead className="text-center">Записей за 7 дней</TableHead>
                    <TableHead className="text-right">Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((m) => {
                    const count = journalEntriesOf(m.user_id).length;
                    return (
                      <TableRow key={m.id}>
                        <TableCell className="font-medium">{nameOf(m.user_id)}</TableCell>
                        <TableCell className="text-center">{count}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={!count}
                            onClick={() => setJournalUser(m.user_id)}
                          >
                            <BookOpen className="w-4 h-4 mr-2" />
                            Смотреть
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Сводки */}
        <TabsContent value="summaries" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Еженедельные сводки команды</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {summaries.length === 0 && (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  Сводки пока не сформированы. Формируются по воскресеньям автоматически.
                </p>
              )}
              {summaries.map((s) => (
                <Card key={s.id} className="border-l-4 border-kamp-primary">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Период: {fmtDate(s.week_start)} — {fmtDate(s.week_end)}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <MarkdownText text={s.summary} />
                  </CardContent>
                </Card>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Диалог смены светофора */}
      <Dialog open={!!lightTarget} onOpenChange={(o) => !o && setLightTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Смена светофора: {lightTarget ? LIGHT_LABEL[lightTarget.next] : ''}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reason">Причина</Label>
            <Textarea
              id="reason"
              value={lightReason}
              onChange={(e) => setLightReason(e.target.value)}
              placeholder="Опишите причину изменения"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLightTarget(null)}>
              Отмена
            </Button>
            <Button onClick={applyLightChange} disabled={savingLight}>
              {savingLight && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Применить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Просмотр чекпоинта */}
      <Dialog open={!!checkpointView} onOpenChange={(o) => !o && setCheckpointView(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {checkpointView ? `${nameOf(checkpointView.user_id)} — ${checkpointView.checkpoint_type}` : ''}
            </DialogTitle>
          </DialogHeader>
          {checkpointView && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div>Вес: {checkpointView.weight_kg ?? '—'} кг</div>
                <div>Жир: {checkpointView.body_fat_pct ?? '—'} %</div>
                <div>Талия: {checkpointView.waist_cm ?? '—'} см</div>
                <div>Живот: {checkpointView.belly_cm ?? '—'} см</div>
                <div>Грудь: {checkpointView.chest_cm ?? '—'} см</div>
                <div>Бёдра: {checkpointView.hips_cm ?? '—'} см</div>
              </div>
              <div>
                <p className="font-medium">Цель</p>
                <p className="text-muted-foreground">{checkpointView.personal_goal || '—'}</p>
              </div>
              <div>
                <p className="font-medium">Результат</p>
                <p className="text-muted-foreground">{checkpointView.personal_result || '—'}</p>
              </div>
              <div>
                <p className="font-medium">Главное достижение</p>
                <p className="text-muted-foreground">{checkpointView.main_achievement || '—'}</p>
              </div>
              {Array.isArray(checkpointView.photo_urls) ? (
                checkpointView.photo_urls.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {(checkpointView.photo_urls as string[]).map((url) => (
                      <img key={url} src={url} alt="Фото чекпоинта" className="rounded-md w-full h-auto" loading="lazy" />
                    ))}
                  </div>
                )
              ) : (
                <CheckpointPhotos title="Фото" urls={parsePhotoUrls(checkpointView.photo_urls)} />
              )}

            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Просмотр ежедневника */}
      <Dialog open={!!journalUser} onOpenChange={(o) => !o && setJournalUser(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Ежедневник: {journalUser ? nameOf(journalUser) : ''}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {journalUser &&
              journalEntriesOf(journalUser).map((e) => (
                <div key={e.id} className="rounded-lg border p-3 space-y-2">
                  <p className="font-medium text-sm">{fmtDate(e.entry_date)}</p>
                  {answers
                    .filter((a) => a.entry_id === e.id)
                    .map((a) => (
                      <div key={a.id} className="text-sm">
                        <p className="text-muted-foreground">{promptMap.get(a.prompt_id) || 'Вопрос'}</p>
                        <p>{a.answer_text || '—'}</p>
                      </div>
                    ))}
                </div>
              ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const MarkdownText: React.FC<{ text: string }> = ({ text }) => {
  const blocks = text.split(/\n\n+/);

  const renderInline = (line: string) => {
    const parts = line.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
    return (
      <>
        {parts.map((part, i) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={i}>{part.slice(2, -2)}</strong>;
          }
          if (part.startsWith('*') && part.endsWith('*')) {
            return <em key={i}>{part.slice(1, -1)}</em>;
          }
          return <span key={i}>{part}</span>;
        })}
      </>
    );
  };

  return (
    <div className="text-sm space-y-2 leading-relaxed">
      {blocks.map((block, idx) => {
        const lines = block.split('\n').filter((l) => l.trim() !== '');
        if (lines.length === 0) return null;

        const headerMatch = lines[0].match(/^(#{1,3})\s+(.*)/);
        if (headerMatch) {
          const level = headerMatch[1].length;
          const content = headerMatch[2];
          const Heading = level === 1 ? 'h1' : level === 2 ? 'h2' : 'h3';
          return (
            <Heading key={idx} className="font-semibold text-base mt-3">
              {renderInline(content)}
            </Heading>
          );
        }

        if (lines.every((l) => /^[-*+]\s/.test(l))) {
          return (
            <ul key={idx} className="list-disc pl-5 space-y-1">
              {lines.map((l, i) => (
                <li key={i}>{renderInline(l.replace(/^[-*+]\s+/, ''))}</li>
              ))}
            </ul>
          );
        }

        if (lines.every((l) => /^\d+\.\s/.test(l))) {
          return (
            <ol key={idx} className="list-decimal pl-5 space-y-1">
              {lines.map((l, i) => (
                <li key={i}>{renderInline(l.replace(/^\d+\.\s+/, ''))}</li>
              ))}
            </ol>
          );
        }

        return (
          <p key={idx}>{renderInline(block.replace(/\n/g, ' '))}</p>
        );
      })}
    </div>
  );
};
