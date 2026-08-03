import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Trophy, Plus, Pencil, Trash2, Loader2, Send, Copy } from 'lucide-react';
import { format } from 'date-fns';

interface Challenge {
  id: string;
  name: string;
  description: string | null;
  prize_description: string | null;
  challenge_type: string;
  start_date: string | null;
  end_date: string | null;
  max_per_day: number | null;
  is_active: boolean | null;
  target_statuses: string[] | null;
  target_tag_ids: string[] | null;
}

interface Tag {
  id: string;
  name: string;
  color: string | null;
}

interface ResultRow {
  user_id: string;
  name: string;
  telegram_id: string | null;
  tickets: number;
  dates: string[];
}

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'intensive_active', label: 'Интенсив (активные)' },
  { value: 'club_resident', label: 'Резиденты клуба' },
  { value: 'alumni', label: 'Выпускники' },
];

const emptyForm = {
  name: '',
  description: '',
  prize_description: '',
  challenge_type: 'social_share',
  start_date: '',
  end_date: '',
  max_per_day: 1,
  is_active: true,
  target_statuses: [] as string[],
  target_tag_ids: [] as string[],
};

const toDateInput = (v: string | null) => (v ? v.slice(0, 10) : '');

const profileName = (p: any) =>
  p?.display_name || [p?.first_name, p?.last_name].filter(Boolean).join(' ') || 'Без имени';

export const ChallengesManagement: React.FC = () => {
  const { toast } = useToast();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);

  // form
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);

  // results
  const [resultsChallengeId, setResultsChallengeId] = useState<string>('');
  const [results, setResults] = useState<ResultRow[]>([]);
  const [resultsLoading, setResultsLoading] = useState(false);

  // broadcast
  const [bcChallengeId, setBcChallengeId] = useState<string>('');
  const [bcText, setBcText] = useState('');
  const [bcStatuses, setBcStatuses] = useState<string[]>([]);
  const [bcTagIds, setBcTagIds] = useState<string[]>([]);
  const [bcRecipients, setBcRecipients] = useState<string[]>([]);
  const [bcCounting, setBcCounting] = useState(false);
  const [sending, setSending] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [chRes, tagRes] = await Promise.all([
        (supabase as any).from('challenges').select('*').order('created_at', { ascending: false }),
        supabase.from('participant_tags').select('id, name, color').order('name'),
      ]);
      if (chRes.error) throw chRes.error;
      if (tagRes.error) throw tagRes.error;
      setChallenges((chRes.data || []) as Challenge[]);
      setTags((tagRes.data || []) as Tag[]);
    } catch (e: any) {
      toast({ title: 'Ошибка', description: e?.message || 'Не удалось загрузить челленджи', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { loadData(); }, [loadData]);

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...emptyForm });
    setDialogOpen(true);
  };

  const openEdit = (c: Challenge) => {
    setEditingId(c.id);
    setForm({
      name: c.name || '',
      description: c.description || '',
      prize_description: c.prize_description || '',
      challenge_type: c.challenge_type || 'social_share',
      start_date: toDateInput(c.start_date),
      end_date: toDateInput(c.end_date),
      max_per_day: c.max_per_day ?? 1,
      is_active: c.is_active ?? true,
      target_statuses: Array.isArray(c.target_statuses) ? c.target_statuses : [],
      target_tag_ids: Array.isArray(c.target_tag_ids) ? c.target_tag_ids : [],
    });
    setDialogOpen(true);
  };

  const toggleIn = (arr: string[], v: string) =>
    arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast({ title: 'Введите название', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        prize_description: form.prize_description.trim() || null,
        challenge_type: form.challenge_type.trim() || 'social_share',
        start_date: form.start_date ? new Date(form.start_date).toISOString() : null,
        end_date: form.end_date ? new Date(form.end_date).toISOString() : null,
        max_per_day: Number(form.max_per_day) || 1,
        is_active: form.is_active,
        target_statuses: form.target_statuses.length ? form.target_statuses : null,
        target_tag_ids: form.target_tag_ids.length ? form.target_tag_ids : null,
      };
      const q = editingId
        ? (supabase as any).from('challenges').update(payload).eq('id', editingId)
        : (supabase as any).from('challenges').insert(payload);
      const { error } = await q;
      if (error) throw error;
      toast({ title: editingId ? 'Челлендж обновлён' : 'Челлендж создан' });
      setDialogOpen(false);
      loadData();
    } catch (e: any) {
      toast({ title: 'Ошибка', description: e?.message || 'Не удалось сохранить', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (c: Challenge) => {
    if (!confirm(`Удалить челлендж «${c.name}»? Отметки участников тоже будут удалены.`)) return;
    try {
      await (supabase as any).from('challenge_entries').delete().eq('challenge_id', c.id);
      const { error } = await (supabase as any).from('challenges').delete().eq('id', c.id);
      if (error) throw error;
      toast({ title: 'Челлендж удалён' });
      loadData();
    } catch (e: any) {
      toast({ title: 'Ошибка', description: e?.message || 'Не удалось удалить', variant: 'destructive' });
    }
  };

  const toggleActive = async (c: Challenge, value: boolean) => {
    try {
      const { error } = await (supabase as any).from('challenges').update({ is_active: value }).eq('id', c.id);
      if (error) throw error;
      setChallenges((prev) => prev.map((x) => (x.id === c.id ? { ...x, is_active: value } : x)));
    } catch (e: any) {
      toast({ title: 'Ошибка', description: e?.message || 'Не удалось изменить статус', variant: 'destructive' });
    }
  };

  // ----- Results -----
  const loadResults = useCallback(async (challengeId: string) => {
    if (!challengeId) { setResults([]); return; }
    setResultsLoading(true);
    try {
      const { data: entries, error } = await (supabase as any)
        .from('challenge_entries')
        .select('user_id, entry_date')
        .eq('challenge_id', challengeId);
      if (error) throw error;

      const grouped = new Map<string, string[]>();
      (entries || []).forEach((e: any) => {
        const list = grouped.get(e.user_id) || [];
        list.push(e.entry_date);
        grouped.set(e.user_id, list);
      });

      const userIds = Array.from(grouped.keys());
      let profilesById = new Map<string, any>();
      if (userIds.length) {
        const { data: profiles, error: pErr } = await supabase
          .from('profiles')
          .select('user_id, display_name, first_name, last_name, telegram_id')
          .in('user_id', userIds);
        if (pErr) throw pErr;
        profilesById = new Map((profiles || []).map((p: any) => [p.user_id, p]));
      }

      const rows: ResultRow[] = userIds.map((uid) => {
        const dates = (grouped.get(uid) || []).sort();
        const p = profilesById.get(uid);
        return {
          user_id: uid,
          name: profileName(p),
          telegram_id: p?.telegram_id ? String(p.telegram_id) : null,
          tickets: dates.length,
          dates,
        };
      }).sort((a, b) => b.tickets - a.tickets);

      setResults(rows);
    } catch (e: any) {
      toast({ title: 'Ошибка', description: e?.message || 'Не удалось загрузить результаты', variant: 'destructive' });
    } finally {
      setResultsLoading(false);
    }
  }, [toast]);

  useEffect(() => { loadResults(resultsChallengeId); }, [resultsChallengeId, loadResults]);

  const copyForRaffle = async () => {
    const text = results.map((r) => `${r.name} — ${r.tickets} билетов`).join('\n');
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: 'Скопировано', description: `${results.length} участников` });
    } catch {
      toast({ title: 'Ошибка', description: 'Не удалось скопировать', variant: 'destructive' });
    }
  };

  // ----- Broadcast -----
  const selectedBcChallenge = useMemo(
    () => challenges.find((c) => c.id === bcChallengeId) || null,
    [challenges, bcChallengeId],
  );

  useEffect(() => {
    if (!selectedBcChallenge) return;
    setBcText(
      `🏆 Челлендж «${selectedBcChallenge.name}»\n\n` +
      (selectedBcChallenge.description ? `${selectedBcChallenge.description}\n\n` : '') +
      (selectedBcChallenge.prize_description ? `Призы: ${selectedBcChallenge.prize_description}\n\n` : '') +
      `Участвуй в мини-приложении КЭМП!`,
    );
    setBcStatuses(Array.isArray(selectedBcChallenge.target_statuses) ? selectedBcChallenge.target_statuses : []);
    setBcTagIds(Array.isArray(selectedBcChallenge.target_tag_ids) ? selectedBcChallenge.target_tag_ids : []);
  }, [selectedBcChallenge]);

  const computeRecipients = useCallback(async () => {
    setBcCounting(true);
    try {
      let query = supabase
        .from('profiles')
        .select('user_id, participant_status, telegram_id')
        .not('telegram_id', 'is', null);
      if (bcStatuses.length) query = query.in('participant_status', bcStatuses as any);
      const { data, error } = await query;
      if (error) throw error;

      let ids = (data || []).map((p: any) => p.user_id);

      if (bcTagIds.length) {
        const { data: tagged, error: tErr } = await supabase
          .from('profile_tags')
          .select('profile_user_id')
          .in('tag_id', bcTagIds);
        if (tErr) throw tErr;
        const allowed = new Set((tagged || []).map((t: any) => t.profile_user_id));
        ids = ids.filter((id: string) => allowed.has(id));
      }

      setBcRecipients(ids);
    } catch (e: any) {
      toast({ title: 'Ошибка', description: e?.message || 'Не удалось посчитать получателей', variant: 'destructive' });
      setBcRecipients([]);
    } finally {
      setBcCounting(false);
    }
  }, [bcStatuses, bcTagIds, toast]);

  useEffect(() => { computeRecipients(); }, [computeRecipients]);

  const handleSendBroadcast = async () => {
    if (!bcText.trim()) {
      toast({ title: 'Введите текст', variant: 'destructive' });
      return;
    }
    if (!bcRecipients.length) {
      toast({ title: 'Нет получателей', description: 'Измените фильтры таргетинга', variant: 'destructive' });
      return;
    }
    setSending(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const { data: inserted, error } = await (supabase as any)
        .from('broadcast_messages')
        .insert({
          text: bcText.trim(),
          audience: 'all',
          buttons: [],
          file_url: null,
          status: 'draft',
          recipients_count: 0,
          created_by: userData?.user?.id ?? null,
          target_user_ids: bcRecipients,
          filter_snapshot: {
            source: 'challenges',
            challenge_id: bcChallengeId || null,
            statuses: bcStatuses,
            tag_ids: bcTagIds,
          },
        })
        .select('id')
        .single();
      if (error) throw error;

      const { data: sendData, error: sendError } = await supabase.functions.invoke('send-broadcast', {
        body: { broadcastId: inserted.id },
      });
      if (sendError) throw sendError;
      if (sendData && (sendData as any).ok === false) {
        throw new Error((sendData as any).error || 'Ошибка отправки');
      }
      const sent = (sendData as any)?.data?.sent ?? (sendData as any)?.sent ?? bcRecipients.length;
      toast({ title: 'Рассылка отправлена', description: `Отправлено ${sent} участникам` });
    } catch (e: any) {
      toast({ title: 'Ошибка', description: e?.message || 'Не удалось отправить рассылку', variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  const TagPicker: React.FC<{ value: string[]; onChange: (v: string[]) => void }> = ({ value, onChange }) => (
    <div className="flex flex-wrap gap-2">
      {tags.length === 0 && <p className="text-sm text-muted-foreground">Теги не найдены</p>}
      {tags.map((t) => {
        const active = value.includes(t.id);
        return (
          <Badge
            key={t.id}
            variant={active ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => onChange(toggleIn(value, t.id))}
          >
            {t.name}
          </Badge>
        );
      })}
    </div>
  );

  const StatusPicker: React.FC<{ value: string[]; onChange: (v: string[]) => void }> = ({ value, onChange }) => (
    <div className="flex flex-wrap gap-2">
      {STATUS_OPTIONS.map((s) => {
        const active = value.includes(s.value);
        return (
          <Badge
            key={s.value}
            variant={active ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => onChange(toggleIn(value, s.value))}
          >
            {s.label}
          </Badge>
        );
      })}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Trophy className="w-5 h-5 text-primary" />
        <h2 className="text-xl font-semibold">Челленджи</h2>
      </div>

      <Tabs defaultValue="list">
        <TabsList>
          <TabsTrigger value="list">Челленджи</TabsTrigger>
          <TabsTrigger value="results">Результаты</TabsTrigger>
          <TabsTrigger value="broadcast">Рассылка</TabsTrigger>
        </TabsList>

        {/* --- List --- */}
        <TabsContent value="list" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={openCreate}>
              <Plus className="w-4 h-4 mr-2" />
              Добавить челлендж
            </Button>
          </div>

          {loading ? (
            <div className="py-8 text-center text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin mx-auto" />
            </div>
          ) : challenges.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Челленджей пока нет</p>
          ) : (
            <div className="space-y-3">
              {challenges.map((c) => (
                <Card key={c.id}>
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">{c.name}</span>
                          <Badge variant="outline">{c.challenge_type}</Badge>
                          {!c.is_active && <Badge variant="secondary">Выключен</Badge>}
                        </div>
                        {c.description && (
                          <p className="text-sm text-muted-foreground mt-1 whitespace-pre-line">{c.description}</p>
                        )}
                        {c.prize_description && (
                          <p className="text-sm mt-1">🎁 {c.prize_description}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-2">
                          {c.start_date ? format(new Date(c.start_date), 'dd.MM.yyyy') : '—'}
                          {' — '}
                          {c.end_date ? format(new Date(c.end_date), 'dd.MM.yyyy') : '—'}
                          {` · макс. ${c.max_per_day ?? 1}/день`}
                        </p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {(c.target_statuses || []).map((s) => (
                            <Badge key={s} variant="outline" className="text-xs">
                              {STATUS_OPTIONS.find((o) => o.value === s)?.label || s}
                            </Badge>
                          ))}
                          {(c.target_tag_ids || []).map((id) => (
                            <Badge key={id} variant="outline" className="text-xs">
                              #{tags.find((t) => t.id === id)?.name || id.slice(0, 6)}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Switch checked={!!c.is_active} onCheckedChange={(v) => toggleActive(c, v)} />
                        <Button variant="ghost" size="icon" onClick={() => openEdit(c)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(c)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* --- Results --- */}
        <TabsContent value="results" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
            <div className="space-y-2 flex-1">
              <Label>Челлендж</Label>
              <Select value={resultsChallengeId} onValueChange={setResultsChallengeId}>
                <SelectTrigger className="w-full sm:w-96">
                  <SelectValue placeholder="Выберите челлендж" />
                </SelectTrigger>
                <SelectContent>
                  {challenges.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" onClick={copyForRaffle} disabled={!results.length}>
              <Copy className="w-4 h-4 mr-2" />
              Скопировать для розыгрыша
            </Button>
          </div>

          {resultsLoading ? (
            <div className="py-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>
          ) : !resultsChallengeId ? (
            <p className="text-center text-muted-foreground py-8">Выберите челлендж</p>
          ) : results.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Отметок пока нет</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Участник</TableHead>
                  <TableHead>Telegram ID</TableHead>
                  <TableHead className="text-right">Билеты</TableHead>
                  <TableHead>Даты отметок</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((r) => (
                  <TableRow key={r.user_id}>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell className="text-muted-foreground">{r.telegram_id || '—'}</TableCell>
                    <TableCell className="text-right font-semibold">{r.tickets}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {r.dates.map((d) => format(new Date(d), 'dd.MM')).join(', ')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        {/* --- Broadcast --- */}
        <TabsContent value="broadcast" className="space-y-4">
          <div className="space-y-2">
            <Label>Челлендж</Label>
            <Select value={bcChallengeId} onValueChange={setBcChallengeId}>
              <SelectTrigger className="w-full sm:w-96">
                <SelectValue placeholder="Выберите челлендж" />
              </SelectTrigger>
              <SelectContent>
                {challenges.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="challenge-bc-text">Текст сообщения</Label>
            <Textarea
              id="challenge-bc-text"
              rows={8}
              maxLength={4000}
              value={bcText}
              onChange={(e) => setBcText(e.target.value)}
              placeholder="Текст рассылки..."
            />
          </div>

          <div className="space-y-2">
            <Label>Статусы получателей (пусто = все)</Label>
            <StatusPicker value={bcStatuses} onChange={setBcStatuses} />
          </div>

          <div className="space-y-2">
            <Label>Теги получателей (пусто = все)</Label>
            <TagPicker value={bcTagIds} onChange={setBcTagIds} />
          </div>

          <div className="flex items-center gap-3">
            <Badge variant="secondary">
              {bcCounting ? 'Считаем...' : `Получателей: ${bcRecipients.length}`}
            </Badge>
            <Button onClick={handleSendBroadcast} disabled={sending || bcCounting}>
              {sending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
              Отправить рассылку
            </Button>
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Редактировать челлендж' : 'Новый челлендж'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ch-name">Название *</Label>
              <Input id="ch-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ch-desc">Описание</Label>
              <Textarea id="ch-desc" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ch-type">Тип</Label>
              <Input id="ch-type" placeholder="social_share" value={form.challenge_type} onChange={(e) => setForm({ ...form, challenge_type: e.target.value })} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ch-prize">Призы</Label>
              <Textarea id="ch-prize" rows={3} value={form.prize_description} onChange={(e) => setForm({ ...form, prize_description: e.target.value })} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ch-start">Дата начала</Label>
                <Input id="ch-start" type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ch-end">Дата окончания</Label>
                <Input id="ch-end" type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ch-max">Макс. отметок в день</Label>
                <Input
                  id="ch-max"
                  type="number"
                  min={1}
                  value={form.max_per_day}
                  onChange={(e) => setForm({ ...form, max_per_day: Number(e.target.value.replace(/^0+(?=\d)/, '')) || 1 })}
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
              <Label>Активен</Label>
            </div>

            <div className="space-y-2">
              <Label>Таргетинг по статусам (пусто = все участники)</Label>
              <StatusPicker value={form.target_statuses} onChange={(v) => setForm({ ...form, target_statuses: v })} />
            </div>

            <div className="space-y-2">
              <Label>Таргетинг по тегам (пусто = все)</Label>
              <TagPicker value={form.target_tag_ids} onChange={(v) => setForm({ ...form, target_tag_ids: v })} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Отмена</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ChallengesManagement;
