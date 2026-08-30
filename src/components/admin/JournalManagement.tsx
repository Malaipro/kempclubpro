import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, Pencil, Trash2, Eye } from 'lucide-react';

type DayType = 'weekday' | 'saturday' | 'sunday';

interface Prompt {
  id: string;
  day_type: DayType;
  question_text: string;
  sort_order: number;
  is_active: boolean;
}

interface EntryRow {
  id: string;
  user_id: string;
  entry_date: string;
  day_type: DayType;
  created_at: string;
  profile?: {
    display_name: string | null;
    first_name: string | null;
    last_name: string | null;
    coaching_type?: 'standard' | 'personal' | null;
  } | null;
}

const dayLabel: Record<DayType, string> = {
  weekday: 'Будни',
  saturday: 'Суббота',
  sunday: 'Воскресенье',
};

const PromptEditor: React.FC<{
  open: boolean; onOpenChange: (v: boolean) => void;
  prompt: Prompt | null; onSaved: () => void;
}> = ({ open, onOpenChange, prompt, onSaved }) => {
  const { toast } = useToast();
  const [dayType, setDayType] = useState<DayType>('weekday');
  const [text, setText] = useState('');
  const [order, setOrder] = useState(0);
  const [active, setActive] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDayType(prompt?.day_type ?? 'weekday');
    setText(prompt?.question_text ?? '');
    setOrder(prompt?.sort_order ?? 0);
    setActive(prompt?.is_active ?? true);
  }, [prompt, open]);

  const save = async () => {
    if (!text.trim()) return;
    setSaving(true);
    try {
      const payload = { day_type: dayType, question_text: text.trim(), sort_order: order, is_active: active };
      const { error } = prompt
        ? await supabase.from('journal_prompts').update(payload).eq('id', prompt.id)
        : await supabase.from('journal_prompts').insert(payload);
      if (error) throw error;
      toast({ title: 'Сохранено' });
      onSaved();
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: 'Ошибка', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{prompt ? 'Редактировать вопрос' : 'Новый вопрос'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Тип дня</Label>
            <Select value={dayType} onValueChange={(v) => setDayType(v as DayType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="weekday">Будни</SelectItem>
                <SelectItem value="saturday">Суббота</SelectItem>
                <SelectItem value="sunday">Воскресенье</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Вопрос</Label>
            <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} />
          </div>
          <div className="flex gap-4">
            <div className="flex-1">
              <Label>Порядок</Label>
              <Input type="number" value={order} onChange={(e) => setOrder(Number(e.target.value))} />
            </div>
            <div className="flex items-end gap-2">
              <Switch checked={active} onCheckedChange={setActive} />
              <Label>{active ? 'Активен' : 'Скрыт'}</Label>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Отмена</Button>
          <Button onClick={save} disabled={saving || !text.trim()}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Сохранить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const PromptsSection: React.FC = () => {
  const { toast } = useToast();
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Prompt | null>(null);
  const [open, setOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('journal_prompts')
      .select('*')
      .order('day_type', { ascending: true })
      .order('sort_order', { ascending: true });
    setPrompts((data as Prompt[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const remove = async (id: string) => {
    if (!confirm('Удалить вопрос?')) return;
    const { error } = await supabase.from('journal_prompts').delete().eq('id', id);
    if (error) toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Удалено' }); load(); }
  };

  const grouped = useMemo(() => {
    const g: Record<DayType, Prompt[]> = { weekday: [], saturday: [], sunday: [] };
    prompts.forEach(p => { if (g[p.day_type]) g[p.day_type].push(p); });
    return g;
  }, [prompts]);

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => { setEditing(null); setOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" />Добавить вопрос
        </Button>
      </div>
      {(['weekday', 'saturday', 'sunday'] as DayType[]).map((dt) => (
        <Card key={dt} className="bg-card">
          <CardHeader><CardTitle className="text-base">{dayLabel[dt]}</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {grouped[dt].length === 0 && <p className="text-sm text-muted-foreground">Нет вопросов</p>}
            {grouped[dt].map((p) => (
              <div key={p.id} className="flex items-center gap-2 p-2 rounded border">
                <Badge variant="outline">#{p.sort_order}</Badge>
                <span className={`flex-1 ${!p.is_active ? 'text-muted-foreground line-through' : ''}`}>
                  {p.question_text}
                </span>
                {!p.is_active && <Badge variant="secondary">скрыт</Badge>}
                <Button size="icon" variant="ghost" onClick={() => { setEditing(p); setOpen(true); }}>
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => remove(p.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
      <PromptEditor open={open} onOpenChange={setOpen} prompt={editing} onSaved={load} />
    </div>
  );
};

const EntryViewer: React.FC<{ entryId: string | null; onClose: () => void }> = ({ entryId, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [answers, setAnswers] = useState<Array<{ question: string; answer: string | null }>>([]);
  const [emotions, setEmotions] = useState<Array<{ emotion_name: string; intensity: number }>>([]);

  useEffect(() => {
    if (!entryId) return;
    (async () => {
      setLoading(true);
      const [{ data: ans }, { data: em }] = await Promise.all([
        supabase.from('journal_answers')
          .select('answer_text, journal_prompts(question_text, sort_order)')
          .eq('entry_id', entryId),
        supabase.from('journal_emotions')
          .select('emotion_name, intensity').eq('entry_id', entryId),
      ]);
      const mapped = (ans || [])
        .map((a: any) => ({
          question: a.journal_prompts?.question_text || '',
          answer: a.answer_text,
          order: a.journal_prompts?.sort_order ?? 0,
        }))
        .sort((a, b) => a.order - b.order);
      setAnswers(mapped);
      setEmotions((em as any) || []);
      setLoading(false);
    })();
  }, [entryId]);

  return (
    <Dialog open={!!entryId} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Запись ежедневника</DialogTitle></DialogHeader>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
        ) : (
          <div className="space-y-4">
            {emotions.length > 0 && (
              <div>
                <Label className="text-xs text-muted-foreground">Эмоции</Label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {emotions.map((e, i) => (
                    <Badge key={i} variant="secondary">
                      {e.emotion_name} · {e.intensity}/5
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {answers.map((a, i) => (
              <div key={i} className="space-y-1">
                <div className="text-sm font-medium">{a.question}</div>
                <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {a.answer || <em>Без ответа</em>}
                </div>
              </div>
            ))}
            {answers.length === 0 && emotions.length === 0 && (
              <p className="text-sm text-muted-foreground">Запись пуста</p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

const EntriesSection: React.FC = () => {
  const [entries, setEntries] = useState<EntryRow[]>([]);
  const [profiles, setProfiles] = useState<Array<{ user_id: string; display_name: string | null; coaching_type?: 'standard' | 'personal' | null }>>([]);
  const [loading, setLoading] = useState(true);
  const [userFilter, setUserFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('');
  const [coachingFilter, setCoachingFilter] = useState<'all' | 'standard' | 'personal'>('all');
  const [viewingId, setViewingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    let q = supabase
      .from('journal_entries')
      .select('id, user_id, entry_date, day_type, created_at')
      .order('entry_date', { ascending: false })
      .limit(200);
    if (userFilter !== 'all') q = q.eq('user_id', userFilter);
    if (dateFilter) q = q.eq('entry_date', dateFilter);
    const { data } = await q;
    let rows = (data as EntryRow[]) || [];

    const userIds = Array.from(new Set(rows.map(r => r.user_id)));
    if (userIds.length > 0) {
      const { data: profs } = await supabase
        .from('profiles')
        .select('user_id, display_name, first_name, last_name, coaching_type')
        .in('user_id', userIds);
      const map = new Map((profs || []).map((p: any) => [p.user_id, p]));
      rows.forEach(r => { r.profile = map.get(r.user_id) as any; });
    }
    if (coachingFilter !== 'all') {
      rows = rows.filter(r => (r.profile?.coaching_type || 'standard') === coachingFilter);
    }
    setEntries(rows);
    setLoading(false);
  };

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('user_id, display_name, coaching_type')
        .order('display_name', { ascending: true })
        .limit(500);
      setProfiles((data as any) || []);
    })();
  }, []);

  useEffect(() => { load(); }, [userFilter, dateFilter, coachingFilter]);


  const nameOf = (r: EntryRow) =>
    r.profile?.display_name ||
    [r.profile?.first_name, r.profile?.last_name].filter(Boolean).join(' ') ||
    r.user_id.slice(0, 8);

  return (
    <div className="space-y-4">
      <Card className="bg-card">
        <CardContent className="p-4 grid gap-3 md:grid-cols-4">
          <div>
            <Label>Участник</Label>
            <Select value={userFilter} onValueChange={setUserFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все</SelectItem>
                {profiles.map(p => (
                  <SelectItem key={p.user_id} value={p.user_id}>
                    {p.display_name || p.user_id.slice(0, 8)}
                    {p.coaching_type === 'personal' ? ' · Личное' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Дата</Label>
            <Input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} />
          </div>
          <div>
            <Label>Тип ведения</Label>
            <Select value={coachingFilter} onValueChange={(v) => setCoachingFilter(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все</SelectItem>
                <SelectItem value="standard">Стандарт</SelectItem>
                <SelectItem value="personal">Личное ведение</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button variant="outline" onClick={() => { setUserFilter('all'); setDateFilter(''); setCoachingFilter('all'); }}>
              Сбросить
            </Button>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
      ) : entries.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">Записей нет</p>
      ) : (
        <div className="space-y-2">
          {entries.map((r) => (
            <div key={r.id} className="flex items-center gap-3 p-3 rounded border bg-card">
              <div className="text-sm font-mono">{r.entry_date}</div>
              <Badge variant="outline">{dayLabel[r.day_type]}</Badge>
              <div className="flex-1 truncate flex items-center gap-2">
                <span className="truncate">{nameOf(r)}</span>
                {r.profile?.coaching_type === 'personal' && (
                  <Badge className="bg-amber-500/20 text-amber-600 border border-amber-500/40 shrink-0">Личное</Badge>
                )}
              </div>
              <Button size="sm" variant="ghost" onClick={() => setViewingId(r.id)}>
                <Eye className="w-4 h-4 mr-1" />Открыть
              </Button>
            </div>
          ))}
        </div>
      )}

      <EntryViewer entryId={viewingId} onClose={() => setViewingId(null)} />
    </div>
  );
};

interface SummaryRow {
  id: string;
  user_id: string;
  week_start: string;
  summary_text: string;
  edited_text: string | null;
  status: string;
  profile?: {
    display_name: string | null;
    first_name: string | null;
    last_name: string | null;
  } | null;
}

const SummariesSection: React.FC = () => {
  const { toast } = useToast();
  const { isAdmin, isSuperAdmin, isCaptain } = useRole();
  const canManage = isAdmin || isSuperAdmin;
  const [rows, setRows] = useState<SummaryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<Record<string, string>>({});
  const [editMode, setEditMode] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [teams, setTeams] = useState<{ id: string; name: string }[]>([]);
  const [teamFilter, setTeamFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('draft');

  useEffect(() => {
    if (!canManage) return;
    (async () => {
      const { data } = await supabase.from('captain_teams').select('id, name').order('name');
      setTeams((data ?? []) as { id: string; name: string }[]);
    })();
  }, [canManage]);

  const load = async () => {
    setLoading(true);
    try {
      // Ограничение по участникам: для капитана — своя команда, для админа — выбранный фильтр
      let allowedUserIds: string[] | null = null;

      if (canManage && teamFilter !== 'all') {
        const { data: members } = await supabase
          .from('captain_team_members')
          .select('user_id')
          .eq('team_id', teamFilter);
        allowedUserIds = Array.from(new Set((members ?? []).map((m: any) => m.user_id)));
      } else if (!canManage && isCaptain) {
        const { data: myTeams } = await supabase
          .from('captain_teams')
          .select('id')
          .eq('captain_user_id', (await supabase.auth.getUser()).data.user?.id ?? '');
        const teamIds = (myTeams ?? []).map((t: any) => t.id);
        if (teamIds.length === 0) {
          setRows([]);
          setLoading(false);
          return;
        }
        const { data: members } = await supabase
          .from('captain_team_members')
          .select('user_id')
          .in('team_id', teamIds);
        allowedUserIds = Array.from(new Set((members ?? []).map((m: any) => m.user_id)));
      }

      if (allowedUserIds && allowedUserIds.length === 0) {
        setRows([]);
        setLoading(false);
        return;
      }

      let query = supabase
        .from('weekly_summaries')
        .select('id, user_id, week_start, summary_text, edited_text, status')
        .order('week_start', { ascending: false });

      if (statusFilter !== 'all') query = query.eq('status', statusFilter);
      if (allowedUserIds) query = query.in('user_id', allowedUserIds);

      const { data, error } = await query;
      if (error) throw error;
      const list = (data ?? []) as SummaryRow[];
      const ids = Array.from(new Set(list.map((r) => r.user_id)));
      if (ids.length) {
        const { data: profs } = await supabase
          .from('profiles')
          .select('user_id, display_name, first_name, last_name')
          .in('user_id', ids);
        const map = new Map((profs ?? []).map((p: any) => [p.user_id, p]));
        list.forEach((r) => { r.profile = map.get(r.user_id) ?? null; });
      }
      setRows(list);
    } catch (e: any) {
      toast({ title: 'Ошибка загрузки', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [canManage, isCaptain, teamFilter, statusFilter]);


  const nameOf = (r: SummaryRow) => {
    const p = r.profile;
    if (!p) return 'Без имени';
    return p.display_name || [p.first_name, p.last_name].filter(Boolean).join(' ') || 'Без имени';
  };

  const send = async (r: SummaryRow) => {
    setBusy(r.id);
    try {
      const newText = editMode[r.id] ? editing[r.id] : (r.edited_text ?? r.summary_text);
      if (editMode[r.id]) {
        const { error: upErr } = await supabase
          .from('weekly_summaries')
          .update({ edited_text: newText })
          .eq('id', r.id);
        if (upErr) throw upErr;
      }
      const { data, error } = await supabase.functions.invoke('send-weekly-summary', {
        body: { summary_id: r.id },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast({ title: 'Отправлено' });
      await load();
    } catch (e: any) {
      toast({ title: 'Ошибка отправки', description: e.message, variant: 'destructive' });
    } finally {
      setBusy(null);
    }
  };

  const reject = async (r: SummaryRow) => {
    setBusy(r.id);
    try {
      const { error } = await supabase
        .from('weekly_summaries')
        .update({ status: 'rejected' })
        .eq('id', r.id);
      if (error) throw error;
      toast({ title: 'Отклонено' });
      await load();
    } catch (e: any) {
      toast({ title: 'Ошибка', description: e.message, variant: 'destructive' });
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Черновики сводок ({rows.length})</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" /> Загрузка...
          </div>
        ) : rows.length === 0 ? (
          <p className="text-muted-foreground text-sm">Нет черновиков для отправки</p>
        ) : (
          rows.map((r) => {
            const isEditing = !!editMode[r.id];
            const currentText = isEditing
              ? (editing[r.id] ?? r.edited_text ?? r.summary_text)
              : (r.edited_text ?? r.summary_text);
            return (
              <div key={r.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <div className="font-medium">{nameOf(r)}</div>
                    <div className="text-xs text-muted-foreground">
                      Неделя с {new Date(r.week_start).toLocaleDateString('ru-RU')}
                    </div>
                  </div>
                  <Badge variant="secondary">Черновик</Badge>
                </div>
                {isEditing ? (
                  <Textarea
                    rows={8}
                    value={currentText}
                    onChange={(e) => setEditing((s) => ({ ...s, [r.id]: e.target.value }))}
                  />
                ) : (
                  <div className="whitespace-pre-wrap text-sm bg-muted/40 rounded p-3">
                    {currentText}
                  </div>
                )}
                <div className="flex gap-2 flex-wrap">
                  {isEditing ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditMode((s) => ({ ...s, [r.id]: false }))}
                    >
                      Отмена
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditing((s) => ({ ...s, [r.id]: r.edited_text ?? r.summary_text }));
                        setEditMode((s) => ({ ...s, [r.id]: true }));
                      }}
                    >
                      <Pencil className="w-4 h-4 mr-1" /> Редактировать
                    </Button>
                  )}
                  <Button
                    size="sm"
                    disabled={busy === r.id}
                    onClick={() => send(r)}
                  >
                    {busy === r.id ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                    Отправить
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={busy === r.id}
                    onClick={() => reject(r)}
                  >
                    Отклонить
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
};

export const JournalManagement: React.FC = () => {
  return (
    <Tabs defaultValue="prompts" className="space-y-4">
      <TabsList>
        <TabsTrigger value="prompts">Вопросы</TabsTrigger>
        <TabsTrigger value="entries">Записи</TabsTrigger>
        <TabsTrigger value="summaries">Сводки</TabsTrigger>
      </TabsList>
      <TabsContent value="prompts"><PromptsSection /></TabsContent>
      <TabsContent value="entries"><EntriesSection /></TabsContent>
      <TabsContent value="summaries"><SummariesSection /></TabsContent>
    </Tabs>
  );
};
