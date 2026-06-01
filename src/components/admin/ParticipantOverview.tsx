import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from '@/components/ui/dialog';
import {
  User, Mail, Phone, Send, Coins, Trophy, Users, Award, Calendar, FileText,
  Gift, UserCheck, Loader2, Plus, Minus, Target,
} from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface ParticipantLike {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  middle_name?: string | null;
  display_name: string | null;
  email: string | null;
  phone: string | null;
  telegram: string | null;
  participant_status: string | null;
  current_stream_id: string | null;
  total_points: number | null;
  rank_position: number | null;
  created_at?: string | null;
  join_date?: string | null;
}

interface TotemLike {
  id: string;
  name: string;
  assigned_at: string;
}

interface Props {
  userId: string;
  participant: ParticipantLike;
  streamName: string;
  totems: TotemLike[];
  onReload: () => void;
}

const STATUS_LABELS: Record<string, string> = {
  intensive_active: 'Активный участник',
  club_resident: 'Резидент клуба',
  alumni: 'Выпускник',
  intensive_completed: 'Завершил интенсив (legacy)',
};

const SELECTABLE_STATUSES = ['intensive_active', 'club_resident', 'alumni'];

export const ParticipantOverview: React.FC<Props> = ({
  userId, participant, streamName, totems, onReload,
}) => {
  const { toast } = useToast();
  const [balance, setBalance] = useState<number>(0);
  const [counts, setCounts] = useState({
    homeworkTotal: 0,
    homeworkPending: 0,
    referralsTotal: 0,
    referralsConfirmed: 0,
    rewardRequests: 0,
  });
  const [nextEvent, setNextEvent] = useState<{ title: string; start_time: string } | null>(null);
  const [currentHomework, setCurrentHomework] = useState<{ title: string } | null>(null);
  const [loading, setLoading] = useState(true);

  // streams & totems for quick actions
  const [streams, setStreams] = useState<{ id: string; name: string }[]>([]);
  const [availableTotems, setAvailableTotems] = useState<{ id: string; name: string }[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const nowIso = new Date().toISOString();
      const [
        balanceRes, hwRes, refRes, rewardRes, eventRes, hwActiveRes, streamsRes, totemsRes,
      ] = await Promise.all([
        supabase.rpc('get_user_coin_balance', { p_user_id: userId }),
        supabase.from('homework_submissions').select('id, status').eq('user_id', userId),
        supabase.from('referral_leads').select('id, status, bonus_awarded').eq('referrer_user_id', userId),
        supabase.from('reward_requests').select('id').eq('user_id', userId),
        supabase.from('schedules').select('title, start_time').eq('is_active', true).gte('start_time', nowIso).order('start_time', { ascending: true }).limit(1).maybeSingle(),
        supabase.from('homework_assignments').select('title').eq('is_active', true).eq('target_user_id', userId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('streams').select('id, name').order('created_at', { ascending: false }),
        supabase.from('totems').select('id, name').eq('is_active', true).order('name', { ascending: true }),
      ]);

      setBalance((balanceRes.data as number) ?? 0);

      const hw = hwRes.data || [];
      const refs = refRes.data || [];
      setCounts({
        homeworkTotal: hw.length,
        homeworkPending: hw.filter((h: any) => h.status === 'submitted').length,
        referralsTotal: refs.length,
        referralsConfirmed: refs.filter((r: any) => r.bonus_awarded || r.status === 'confirmed').length,
        rewardRequests: (rewardRes.data || []).length,
      });

      setNextEvent(eventRes.data || null);
      setCurrentHomework(hwActiveRes.data || null);
      setStreams(streamsRes.data || []);
      setAvailableTotems(totemsRes.data || []);
    } catch (error) {
      console.error('Error loading overview:', error);
      toast({ title: 'Ошибка', description: 'Не удалось загрузить сводку', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [userId, toast]);

  useEffect(() => { loadData(); }, [loadData]);

  const fullName = [participant.last_name, participant.first_name, participant.middle_name]
    .filter(Boolean).join(' ') || participant.display_name || 'Без имени';

  const currentTotem = [...totems].sort(
    (a, b) => new Date(b.assigned_at).getTime() - new Date(a.assigned_at).getTime(),
  )[0];

  const regDate = participant.join_date || participant.created_at;

  // ---- Quick actions ----
  const [statusOpen, setStatusOpen] = useState(false);
  const [newStatus, setNewStatus] = useState<string>(participant.participant_status || 'intensive_active');
  const [savingStatus, setSavingStatus] = useState(false);

  const handleStatusChange = async () => {
    setSavingStatus(true);
    try {
      const { error } = await supabase.rpc('update_participant_status', {
        p_user_id: userId, p_new_status: newStatus as any,
      });
      if (error) throw error;
      toast({ title: 'Готово', description: `Статус: ${STATUS_LABELS[newStatus]}` });
      setStatusOpen(false);
      onReload(); loadData();
    } catch (error: any) {
      // Fallback direct update
      try {
        const { error: updErr } = await supabase.from('profiles')
          .update({ participant_status: newStatus as any }).eq('user_id', userId);
        if (updErr) throw updErr;
        toast({ title: 'Готово', description: `Статус: ${STATUS_LABELS[newStatus]} (fallback)` });
        setStatusOpen(false);
        onReload(); loadData();
      } catch (inner: any) {
        toast({ title: 'Ошибка', description: inner?.message || 'Не удалось сменить статус', variant: 'destructive' });
      }
    } finally {
      setSavingStatus(false);
    }
  };

  const [streamOpen, setStreamOpen] = useState(false);
  const [newStream, setNewStream] = useState<string>(participant.current_stream_id || '');
  const [savingStream, setSavingStream] = useState(false);

  const handleStreamChange = async () => {
    setSavingStream(true);
    try {
      const { error } = await supabase.from('profiles')
        .update({ current_stream_id: newStream || null }).eq('user_id', userId);
      if (error) throw error;
      toast({ title: 'Готово', description: 'Поток обновлён' });
      setStreamOpen(false);
      onReload(); loadData();
    } catch (error: any) {
      toast({ title: 'Ошибка', description: error?.message || 'Не удалось назначить поток', variant: 'destructive' });
    } finally {
      setSavingStream(false);
    }
  };

  const [totemOpen, setTotemOpen] = useState(false);
  const [newTotem, setNewTotem] = useState<string>('');
  const [totemNotes, setTotemNotes] = useState('');
  const [savingTotem, setSavingTotem] = useState(false);

  const handleTotemAssign = async () => {
    if (!newTotem) {
      toast({ title: 'Выберите тотем', variant: 'destructive' });
      return;
    }
    setSavingTotem(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from('user_totems').insert([{
        user_id: userId, totem_id: newTotem, assigned_by: user?.id, notes: totemNotes || null, is_manual: true,
      }]);
      if (error) {
        if (error.code === '23505') throw new Error('Этот тотем уже присвоен участнику');
        throw error;
      }
      toast({ title: 'Готово', description: 'Тотем назначен' });
      setTotemOpen(false); setNewTotem(''); setTotemNotes('');
      onReload(); loadData();
    } catch (error: any) {
      toast({ title: 'Ошибка', description: error?.message || 'Не удалось назначить тотем', variant: 'destructive' });
    } finally {
      setSavingTotem(false);
    }
  };

  const [coinOpen, setCoinOpen] = useState(false);
  const [coinAmount, setCoinAmount] = useState('');
  const [coinReason, setCoinReason] = useState('');
  const [coinSign, setCoinSign] = useState<1 | -1>(1);
  const [savingCoins, setSavingCoins] = useState(false);

  const handleCoins = async () => {
    const parsed = parseInt(coinAmount, 10);
    if (!parsed || parsed <= 0) {
      toast({ title: 'Некорректная сумма', variant: 'destructive' }); return;
    }
    if (!coinReason.trim()) {
      toast({ title: 'Укажите причину', variant: 'destructive' }); return;
    }
    setSavingCoins(true);
    try {
      const { data, error } = await (supabase.rpc as any)('admin_adjust_coins', {
        p_user_id: userId, p_amount: coinSign * parsed, p_reason: coinReason.trim(),
      });
      if (error) throw error;
      setBalance((data as number) ?? 0);
      toast({ title: 'Готово', description: `Новый баланс: ${data}` });
      setCoinOpen(false); setCoinAmount(''); setCoinReason('');
    } catch (error: any) {
      toast({ title: 'Ошибка', description: error?.message || 'Не удалось выполнить операцию', variant: 'destructive' });
    } finally {
      setSavingCoins(false);
    }
  };

  const Stat = ({ icon: Icon, label, value }: { icon: any; label: string; value: React.ReactNode }) => (
    <div className="flex items-center gap-3 rounded-lg border p-3">
      <Icon className="w-5 h-5 text-muted-foreground shrink-0" />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-medium truncate">{value}</p>
      </div>
    </div>
  );

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Header summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            {fullName}
            <Badge variant="secondary">{STATUS_LABELS[participant.participant_status || ''] || participant.participant_status || '—'}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Stat icon={Mail} label="Email" value={participant.email || '—'} />
          <Stat icon={Phone} label="Телефон" value={participant.phone || '—'} />
          <Stat icon={Send} label="Telegram" value={participant.telegram || '—'} />
          <Stat icon={Users} label="Поток" value={streamName || '—'} />
          <Stat icon={Calendar} label="Дата регистрации" value={regDate ? format(new Date(regDate), 'dd.MM.yyyy', { locale: ru }) : '—'} />
          <Stat icon={Target} label="Текущий тотем" value={currentTotem?.name || '—'} />
          <Stat icon={Coins} label="Баланс коинов" value={balance} />
          <Stat icon={Trophy} label="Общий счёт" value={participant.total_points ?? 0} />
          <Stat icon={Trophy} label="Место в потоке" value={participant.rank_position ?? '—'} />
          <Stat icon={FileText} label="ДЗ всего / на проверке" value={`${counts.homeworkTotal} / ${counts.homeworkPending}`} />
          <Stat icon={UserCheck} label="Рефералы всего / подтв." value={`${counts.referralsTotal} / ${counts.referralsConfirmed}`} />
          <Stat icon={Gift} label="Заявок на награды" value={counts.rewardRequests} />
          <Stat icon={Calendar} label="Ближайшее событие" value={nextEvent ? `${nextEvent.title} (${format(new Date(nextEvent.start_time), 'dd.MM HH:mm', { locale: ru })})` : 'Нет'} />
          <Stat icon={FileText} label="Актуальное ДЗ" value={currentHomework?.title || 'Нет'} />
        </CardContent>
      </Card>

      {/* Quick actions */}
      <Card>
        <CardHeader><CardTitle>Быстрые действия</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          {/* Status */}
          <Dialog open={statusOpen} onOpenChange={setStatusOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2"><UserCheck className="w-4 h-4" />Сменить статус</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Сменить статус</DialogTitle></DialogHeader>
              <div className="space-y-3">
                {participant.participant_status === 'intensive_completed' && (
                  <p className="text-xs text-muted-foreground">Текущий статус — legacy «Завершил интенсив». Выберите актуальный статус.</p>
                )}
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SELECTABLE_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">История (коины, ДЗ, тотемы, прогресс, рефералы, награды, Купер) сохраняется.</p>
              </div>
              <DialogFooter>
                <Button onClick={handleStatusChange} disabled={savingStatus}>
                  {savingStatus && <Loader2 className="w-4 h-4 animate-spin mr-2" />}Сохранить
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Stream */}
          <Dialog open={streamOpen} onOpenChange={setStreamOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2"><Users className="w-4 h-4" />Назначить поток</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Назначить / сменить поток</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <Select value={newStream} onValueChange={setNewStream}>
                  <SelectTrigger><SelectValue placeholder="Выберите поток" /></SelectTrigger>
                  <SelectContent>
                    {streams.map((s) => (<SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Поток сохраняется как история прохождения интенсива и не сбрасывается при смене статуса.</p>
              </div>
              <DialogFooter>
                <Button onClick={handleStreamChange} disabled={savingStream}>
                  {savingStream && <Loader2 className="w-4 h-4 animate-spin mr-2" />}Сохранить
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Totem */}
          <Dialog open={totemOpen} onOpenChange={setTotemOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2"><Award className="w-4 h-4" />Назначить тотем</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Назначить тотем</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <Select value={newTotem} onValueChange={setNewTotem}>
                  <SelectTrigger><SelectValue placeholder="Выберите тотем" /></SelectTrigger>
                  <SelectContent>
                    {availableTotems.map((t) => (<SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>))}
                  </SelectContent>
                </Select>
                <Textarea placeholder="Комментарий (необязательно)" value={totemNotes} onChange={(e) => setTotemNotes(e.target.value)} rows={2} />
              </div>
              <DialogFooter>
                <Button onClick={handleTotemAssign} disabled={savingTotem}>
                  {savingTotem && <Loader2 className="w-4 h-4 animate-spin mr-2" />}Назначить
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Coins */}
          <Dialog open={coinOpen} onOpenChange={setCoinOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2"><Coins className="w-4 h-4" />Коины</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Начислить / списать коины</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Button type="button" variant={coinSign === 1 ? 'default' : 'outline'} className="gap-2 flex-1" onClick={() => setCoinSign(1)}>
                    <Plus className="w-4 h-4" />Начислить
                  </Button>
                  <Button type="button" variant={coinSign === -1 ? 'destructive' : 'outline'} className="gap-2 flex-1" onClick={() => setCoinSign(-1)}>
                    <Minus className="w-4 h-4" />Списать
                  </Button>
                </div>
                <div className="space-y-1">
                  <Label>Сумма</Label>
                  <Input type="number" min={1} value={coinAmount} onChange={(e) => setCoinAmount(e.target.value)} placeholder="Например, 50" />
                </div>
                <div className="space-y-1">
                  <Label>Причина (обязательно)</Label>
                  <Textarea value={coinReason} onChange={(e) => setCoinReason(e.target.value)} rows={2} />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleCoins} disabled={savingCoins}>
                  {savingCoins && <Loader2 className="w-4 h-4 animate-spin mr-2" />}Выполнить
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </div>
  );
};
