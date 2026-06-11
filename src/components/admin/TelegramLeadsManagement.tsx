import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Loader2, Search, Send, RefreshCw, Link2, XCircle, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface TelegramLead {
  id: string;
  telegram_id: string | null;
  telegram_username: string | null;
  telegram_first_name: string | null;
  telegram_last_name: string | null;
  phone: string | null;
  normalized_phone: string | null;
  referral_code: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  processed_by: string | null;
  processed_at: string | null;
}

interface ProfileMatch {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  email: string | null;
  participant_status: string | null;
  telegram_id: string | null;
}

type StatusFilter = 'all' | 'new' | 'waiting_admin_approval' | 'approved' | 'rejected' | 'linked';

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'Все' },
  { value: 'new', label: 'new' },
  { value: 'waiting_admin_approval', label: 'waiting_admin_approval' },
  { value: 'approved', label: 'approved' },
  { value: 'rejected', label: 'rejected' },
  { value: 'linked', label: 'linked' },
];

const statusVariant = (status: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
  switch (status) {
    case 'linked': return 'default';
    case 'rejected': return 'destructive';
    case 'waiting_admin_approval': return 'secondary';
    default: return 'outline';
  }
};

// Повторяет логику public.normalize_phone на стороне клиента для сопоставления.
const normalizePhone = (phone: string | null | undefined): string | null => {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (!digits) return null;
  if (digits.length === 11 && (digits[0] === '7' || digits[0] === '8')) return digits.slice(-10);
  if (digits.length === 10) return digits;
  return digits;
};

const fmt = (d: string | null) => (d ? format(new Date(d), 'dd.MM.yyyy HH:mm', { locale: ru }) : '—');

export const TelegramLeadsManagement: React.FC = () => {
  const { toast } = useToast();
  const [leads, setLeads] = useState<TelegramLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');

  const [selectedLead, setSelectedLead] = useState<TelegramLead | null>(null);
  const [matches, setMatches] = useState<ProfileMatch[]>([]);
  const [matchesLoading, setMatchesLoading] = useState(false);
  const [chosenProfile, setChosenProfile] = useState<string | null>(null);
  const [acting, setActing] = useState(false);

  const loadLeads = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('telegram_leads')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      toast({ title: 'Ошибка загрузки заявок', description: error.message, variant: 'destructive' });
    } else {
      setLeads((data as TelegramLead[]) ?? []);
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => { loadLeads(); }, [loadLeads]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const qDigits = q.replace(/\D/g, '');
    return leads.filter((l) => {
      if (statusFilter !== 'all' && l.status !== statusFilter) return false;
      if (!q) return true;
      const byUsername = (l.telegram_username ?? '').toLowerCase().includes(q);
      const byTgId = (l.telegram_id ?? '').toLowerCase().includes(q);
      const byPhone = qDigits ? (l.phone ?? '').replace(/\D/g, '').includes(qDigits) : false;
      const byNorm = qDigits ? (l.normalized_phone ?? '').replace(/\D/g, '').includes(qDigits) : false;
      return byUsername || byTgId || byPhone || byNorm;
    });
  }, [leads, statusFilter, search]);

  const openLead = useCallback(async (lead: TelegramLead) => {
    setSelectedLead(lead);
    setChosenProfile(null);
    setMatches([]);
    if (!lead.normalized_phone) return;
    setMatchesLoading(true);
    // Берём профили с телефоном и сопоставляем по нормализованному номеру.
    const { data, error } = await supabase
      .from('profiles')
      .select('user_id, first_name, last_name, phone, email, participant_status, telegram_id')
      .not('phone', 'is', null)
      .limit(2000);
    if (error) {
      toast({ title: 'Ошибка поиска профилей', description: error.message, variant: 'destructive' });
    } else {
      const found = ((data as ProfileMatch[]) ?? []).filter(
        (p) => normalizePhone(p.phone) === lead.normalized_phone,
      );
      setMatches(found);
      if (found.length === 1) setChosenProfile(found[0].user_id);
    }
    setMatchesLoading(false);
  }, [toast]);

  const handleBind = useCallback(async () => {
    if (!selectedLead || !chosenProfile) return;
    setActing(true);
    const { data: auth } = await supabase.auth.getUser();
    const adminId = auth.user?.id ?? null;
    const now = new Date().toISOString();

    const { error: pErr } = await supabase
      .from('profiles')
      .update({
        telegram_id: selectedLead.telegram_id,
        telegram_username: selectedLead.telegram_username,
        telegram_first_name: selectedLead.telegram_first_name,
        telegram_last_name: selectedLead.telegram_last_name,
        telegram_linked_at: now,
        updated_at: now,
      })
      .eq('user_id', chosenProfile);

    if (pErr) {
      toast({ title: 'Ошибка привязки профиля', description: pErr.message, variant: 'destructive' });
      setActing(false);
      return;
    }

    const { error: lErr } = await supabase
      .from('telegram_leads')
      .update({ status: 'linked', processed_by: adminId, processed_at: now, updated_at: now })
      .eq('id', selectedLead.id);

    if (lErr) {
      toast({ title: 'Профиль привязан, но статус заявки не обновлён', description: lErr.message, variant: 'destructive' });
    } else {
      toast({ title: 'Заявка привязана к профилю' });
    }
    setActing(false);
    setSelectedLead(null);
    loadLeads();
  }, [selectedLead, chosenProfile, toast, loadLeads]);

  const handleReject = useCallback(async () => {
    if (!selectedLead) return;
    setActing(true);
    const { data: auth } = await supabase.auth.getUser();
    const adminId = auth.user?.id ?? null;
    const now = new Date().toISOString();
    const { error } = await supabase
      .from('telegram_leads')
      .update({ status: 'rejected', processed_by: adminId, processed_at: now, updated_at: now })
      .eq('id', selectedLead.id);
    if (error) {
      toast({ title: 'Ошибка отклонения заявки', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Заявка отклонена' });
      setSelectedLead(null);
      loadLeads();
    }
    setActing(false);
  }, [selectedLead, toast, loadLeads]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    leads.forEach((l) => { c[l.status] = (c[l.status] ?? 0) + 1; });
    return c;
  }, [leads]);

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="flex items-center gap-2">
            <Send className="w-5 h-5 text-primary" />
            Telegram-заявки
            <Badge variant="secondary">{leads.length}</Badge>
          </CardTitle>
          <Button variant="outline" size="sm" onClick={loadLeads} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Обновить
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Фильтры */}
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((f) => (
            <Button
              key={f.value}
              variant={statusFilter === f.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter(f.value)}
            >
              {f.label}
              {f.value !== 'all' && counts[f.value] ? ` (${counts[f.value]})` : ''}
            </Button>
          ))}
        </div>

        {/* Поиск */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Поиск: телефон, normalized_phone, username, telegram_id"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Список */}
        {loading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin mr-2" /> Загрузка…
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-muted-foreground text-center py-12">Заявок не найдено</p>
        ) : (
          <div className="space-y-2">
            {filtered.map((l) => (
              <button
                key={l.id}
                onClick={() => openLead(l)}
                className="w-full text-left p-3 rounded-lg border border-border bg-background hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      {l.telegram_first_name || l.telegram_last_name
                        ? `${l.telegram_first_name ?? ''} ${l.telegram_last_name ?? ''}`.trim()
                        : 'Без имени'}
                    </span>
                    {l.telegram_username && (
                      <span className="text-sm text-muted-foreground">@{l.telegram_username}</span>
                    )}
                  </div>
                  <Badge variant={statusVariant(l.status)}>{l.status}</Badge>
                </div>
                <div className="mt-1 text-sm text-muted-foreground flex flex-wrap gap-x-4">
                  <span>📞 {l.phone ?? '—'}</span>
                  <span>tg_id: {l.telegram_id ?? '—'}</span>
                  <span>{fmt(l.created_at)}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </CardContent>

      {/* Карточка заявки */}
      <Dialog open={!!selectedLead} onOpenChange={(o) => !o && setSelectedLead(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="w-5 h-5 text-primary" /> Заявка из Telegram
            </DialogTitle>
            <DialogDescription>Просмотр заявки и привязка к профилю участника.</DialogDescription>
          </DialogHeader>

          {selectedLead && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <Field label="telegram_id" value={selectedLead.telegram_id} />
                <Field label="telegram_username" value={selectedLead.telegram_username ? `@${selectedLead.telegram_username}` : null} />
                <Field label="telegram_first_name" value={selectedLead.telegram_first_name} />
                <Field label="telegram_last_name" value={selectedLead.telegram_last_name} />
                <Field label="phone" value={selectedLead.phone} />
                <Field label="normalized_phone" value={selectedLead.normalized_phone} />
                <Field label="referral_code" value={selectedLead.referral_code} />
                <Field label="status" value={selectedLead.status} />
                <Field label="created_at" value={fmt(selectedLead.created_at)} />
                <Field label="updated_at" value={fmt(selectedLead.updated_at)} />
                <Field label="processed_by" value={selectedLead.processed_by} />
                <Field label="processed_at" value={fmt(selectedLead.processed_at)} />
              </div>

              {/* Совпадения профилей */}
              <div className="border-t border-border pt-4">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <User className="w-4 h-4" /> Совпадения в профилях
                  {matchesLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                </h4>
                {!selectedLead.normalized_phone ? (
                  <p className="text-sm text-muted-foreground">У заявки нет normalized_phone — сопоставление невозможно.</p>
                ) : matchesLoading ? null : matches.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Совпадений по телефону не найдено.</p>
                ) : (
                  <div className="space-y-2">
                    {matches.map((p) => (
                      <label
                        key={p.user_id}
                        className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                          chosenProfile === p.user_id ? 'border-primary bg-primary/5' : 'border-border'
                        }`}
                      >
                        <input
                          type="radio"
                          name="profile-match"
                          className="mt-1"
                          checked={chosenProfile === p.user_id}
                          onChange={() => setChosenProfile(p.user_id)}
                        />
                        <div className="text-sm">
                          <div className="font-medium">
                            {`${p.first_name ?? ''} ${p.last_name ?? ''}`.trim() || 'Без имени'}
                          </div>
                          <div className="text-muted-foreground">{p.email ?? '—'} · {p.phone ?? '—'}</div>
                          <div className="text-muted-foreground">
                            статус: {p.participant_status ?? '—'}
                            {p.telegram_id ? ` · уже привязан tg_id: ${p.telegram_id}` : ''}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Действия */}
              <div className="flex flex-wrap gap-2 border-t border-border pt-4">
                <Button onClick={handleBind} disabled={acting || !chosenProfile}>
                  {acting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Link2 className="w-4 h-4 mr-2" />}
                  Привязать к профилю
                </Button>
                <Button variant="destructive" onClick={handleReject} disabled={acting}>
                  <XCircle className="w-4 h-4 mr-2" />
                  Отклонить заявку
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
};

const Field: React.FC<{ label: string; value: string | null }> = ({ label, value }) => (
  <div>
    <span className="text-muted-foreground">{label}: </span>
    <span className="break-all">{value || '—'}</span>
  </div>
);
