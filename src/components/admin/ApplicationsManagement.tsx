import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, Phone, Search, UserCheck, UserX, Handshake, Inbox, Users, CheckCircle2, XCircle, Trash2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { ApplicationFollowUp } from './ApplicationFollowUp';
import { formatPhoneRu, isValidPhoneRu } from '@/lib/phoneFormat';


type Status = 'new' | 'contacted' | 'enrolled' | 'rejected';

interface Submission {
  id: string;
  name: string;
  phone: string;
  social: string | null;
  message: string | null;
  status: Status;
  created_at: string;
  referral_code: string | null;
  ref_code: string | null;
  referrer_user_id: string | null;
  stream_id: string | null;
  enrolled_user_id: string | null;
}

interface Stream { id: string; name: string; start_date: string; is_active: boolean; }
interface ProfileLite { user_id: string; first_name: string | null; last_name: string | null; display_name: string | null; email: string | null; phone: string | null; referral_code: string | null; }

const STATUS_META: Record<Status, { label: string; className: string; icon: React.ComponentType<{ className?: string }> }> = {
  new:       { label: 'Новая',      className: 'bg-blue-500/15 text-blue-400 border-blue-500/30',       icon: Inbox },
  contacted: { label: 'В работе',   className: 'bg-amber-500/15 text-amber-400 border-amber-500/30',    icon: Handshake },
  enrolled:  { label: 'Зачислен',   className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', icon: CheckCircle2 },
  rejected:  { label: 'Отказ',      className: 'bg-red-500/15 text-red-400 border-red-500/30',          icon: XCircle },
};

export const ApplicationsManagement: React.FC = () => {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<Status | 'all'>('all');
  const [search, setSearch] = useState('');
  const [enrollFor, setEnrollFor] = useState<Submission | null>(null);

  const { data: submissions = [], isLoading } = useQuery({
    queryKey: ['contact_submissions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contact_submissions')
        .select('id,name,phone,social,message,status,created_at,referral_code,ref_code,referrer_user_id,stream_id,enrolled_user_id')
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data || []) as Submission[];
    },
  });

  const referrerIds = useMemo(
    () => Array.from(new Set(submissions.map(s => s.referrer_user_id).filter(Boolean))) as string[],
    [submissions]
  );
  const referralCodes = useMemo(
    () => Array.from(new Set(submissions.map(s => s.referral_code || s.ref_code).filter(Boolean))) as string[],
    [submissions]
  );

  const { data: referrers = [] } = useQuery({
    queryKey: ['referrer_lookup', referrerIds, referralCodes],
    enabled: referrerIds.length > 0 || referralCodes.length > 0,
    queryFn: async () => {
      const results: ProfileLite[] = [];
      if (referrerIds.length) {
        const { data } = await supabase.from('profiles')
          .select('user_id,first_name,last_name,display_name,email,phone,referral_code')
          .in('user_id', referrerIds);
        if (data) results.push(...data as ProfileLite[]);
      }
      if (referralCodes.length) {
        const { data } = await supabase.from('profiles')
          .select('user_id,first_name,last_name,display_name,email,phone,referral_code')
          .in('referral_code', referralCodes);
        if (data) results.push(...data as ProfileLite[]);
      }
      const map = new Map<string, ProfileLite>();
      results.forEach(p => map.set(p.user_id, p));
      return Array.from(map.values());
    },
  });

  const referrerFor = (s: Submission): ProfileLite | null => {
    if (s.referrer_user_id) return referrers.find(r => r.user_id === s.referrer_user_id) || null;
    const code = s.referral_code || s.ref_code;
    if (code) return referrers.find(r => r.referral_code === code) || null;
    return null;
  };

  const counters = useMemo(() => {
    const c: Record<Status, number> = { new: 0, contacted: 0, enrolled: 0, rejected: 0 };
    submissions.forEach(s => { c[s.status] = (c[s.status] || 0) + 1; });
    return c;
  }, [submissions]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return submissions.filter(s => {
      if (statusFilter !== 'all' && s.status !== statusFilter) return false;
      if (q && !`${s.name} ${s.phone} ${s.social || ''}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [submissions, statusFilter, search]);

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Status }) => {
      const { error } = await supabase
        .from('contact_submissions')
        .update({ status, processed_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      toast.success(vars.status === 'contacted' ? 'Взято в работу' : vars.status === 'rejected' ? 'Заявка отклонена' : 'Обновлено');
      qc.invalidateQueries({ queryKey: ['contact_submissions'] });
    },
    onError: (e: any) => toast.error(e?.message || 'Не удалось обновить статус'),
  });

  const removeSubmission = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('contact_submissions').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Заявка удалена');
      qc.invalidateQueries({ queryKey: ['contact_submissions'] });
    },
    onError: (e: any) => toast.error(e?.message || 'Не удалось удалить заявку'),
  });


  return (
    <div className="space-y-6">
      {/* Счётчики */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {(Object.keys(STATUS_META) as Status[]).map((s) => {
          const meta = STATUS_META[s];
          const Icon = meta.icon;
          return (
            <Card key={s} className="bg-card cursor-pointer hover:border-primary/50 transition"
              onClick={() => setStatusFilter(statusFilter === s ? 'all' : s)}>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{meta.label}</p>
                  <p className="text-2xl font-bold">{counters[s] || 0}</p>
                </div>
                <Icon className="w-6 h-6 text-muted-foreground" />
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="bg-card">
        <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 space-y-0">
          <CardTitle className="text-lg">Заявки {statusFilter !== 'all' && <Badge variant="outline" className="ml-2">{STATUS_META[statusFilter].label}</Badge>}</CardTitle>
          <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Имя или телефон" className="pl-8 w-full sm:w-56" />
            </div>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as Status | 'all')}>
              <SelectTrigger className="w-full sm:w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все статусы</SelectItem>
                {(Object.keys(STATUS_META) as Status[]).map(s => (
                  <SelectItem key={s} value={s}>{STATUS_META[s].label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Заявок нет</p>
          ) : (
            <div className="space-y-3">
              {filtered.map((s) => {
                const meta = STATUS_META[s.status];
                const ref = referrerFor(s);
                const refName = ref ? (ref.display_name || `${ref.first_name || ''} ${ref.last_name || ''}`.trim() || 'участник') : null;
                return (
                  <div key={s.id} className="border border-border rounded-lg p-4 bg-background/40">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="font-semibold">{s.name}</span>
                          <Badge variant="outline" className={meta.className}>{meta.label}</Badge>
                          {(s.referral_code || s.ref_code) && (
                            <Badge variant="outline" className="bg-purple-500/15 text-purple-400 border-purple-500/30">
                              Реферал{refName ? ` от ${refName}` : ''}
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground flex flex-wrap gap-x-4 gap-y-1">
                          <a href={`tel:${s.phone}`} className="inline-flex items-center gap-1 hover:text-primary">
                            <Phone className="w-3.5 h-3.5" />{s.phone}
                          </a>
                          {s.social && <span>· {s.social}</span>}
                          <span>· {format(new Date(s.created_at), 'd MMM yyyy, HH:mm', { locale: ru })}</span>
                        </div>
                        {s.message && <p className="text-sm mt-2 text-foreground/80 whitespace-pre-wrap">{s.message}</p>}
                      </div>
                      <div className="flex flex-wrap gap-2 md:justify-end">
                        {s.status !== 'contacted' && s.status !== 'enrolled' && (
                          <Button size="sm" variant="outline" onClick={() => setStatus.mutate({ id: s.id, status: 'contacted' })}>
                            <Handshake className="w-4 h-4 mr-1" />В работу
                          </Button>
                        )}
                        {s.status !== 'rejected' && s.status !== 'enrolled' && (
                          <Button size="sm" variant="outline" onClick={() => setStatus.mutate({ id: s.id, status: 'rejected' })}>
                            <UserX className="w-4 h-4 mr-1" />Отказ
                          </Button>
                        )}
                        {s.status !== 'enrolled' && (
                          <Button size="sm" onClick={() => setEnrollFor(s)}>
                            <UserCheck className="w-4 h-4 mr-1" />Зачислить
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          disabled={removeSubmission.isPending}
                          onClick={() => {
                            if (window.confirm(`Удалить заявку «${s.name}»? Действие необратимо.`)) {
                              removeSubmission.mutate(s.id);
                            }
                          }}
                        >
                          <Trash2 className="w-4 h-4 mr-1" />Удалить
                        </Button>
                      </div>
                    </div>
                    <ApplicationFollowUp submissionId={s.id} />
                  </div>

                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <EnrollDialog submission={enrollFor} onClose={() => setEnrollFor(null)} onSuccess={() => qc.invalidateQueries({ queryKey: ['contact_submissions'] })} />
    </div>
  );
};

const EnrollDialog: React.FC<{ submission: Submission | null; onClose: () => void; onSuccess: () => void }> = ({ submission, onClose, onSuccess }) => {
  const [streamId, setStreamId] = useState<string>('');
  const [userId, setUserId] = useState<string>('');
  const [profileSearch, setProfileSearch] = useState('');
  const [submitting, setSubmitting] = useState(false);

  React.useEffect(() => {
    if (submission) {
      setStreamId(''); setUserId('');
      setProfileSearch(submission.phone || submission.name || '');
    }
  }, [submission]);

  const { data: streams = [] } = useQuery({
    queryKey: ['streams_all'],
    queryFn: async () => {
      const { data, error } = await supabase.from('streams')
        .select('id,name,start_date,is_active')
        .order('start_date', { ascending: false });
      if (error) throw error;
      return (data || []) as Stream[];
    },
  });

  const { data: profiles = [], isFetching: searching } = useQuery({
    queryKey: ['profile_search', profileSearch],
    enabled: profileSearch.trim().length >= 2,
    queryFn: async () => {
      const q = profileSearch.trim();
      const like = `%${q}%`;
      const { data, error } = await supabase.from('profiles')
        .select('user_id,first_name,last_name,display_name,email,phone,referral_code')
        .or(`first_name.ilike.${like},last_name.ilike.${like},display_name.ilike.${like},email.ilike.${like},phone.ilike.${like}`)
        .limit(20);
      if (error) throw error;
      return (data || []) as ProfileLite[];
    },
  });

  const enroll = async () => {
    if (!submission || !streamId) return;
    setSubmitting(true);
    try {
      const params: Record<string, string> = {
        p_submission_id: submission.id,
        p_stream_id: streamId,
      };
      if (userId) params.p_user_id = userId;
      const { data, error } = await supabase.rpc('enroll_application', params as any);
      if (error) throw error;
      const result = data as { ok?: boolean; duplicate?: boolean; referral_awarded?: boolean };
      if (result?.duplicate) {
        toast.info('Заявка уже была зачислена');
      } else if (result?.referral_awarded) {
        toast.success('Участник зачислен. Рефереру начислены монеты');
      } else {
        toast.success('Участник зачислен');
      }
      onSuccess(); onClose();
    } catch (e: any) {
      toast.error(e?.message || 'Не удалось зачислить');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={!!submission} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Зачислить в поток</DialogTitle></DialogHeader>
        {submission && (
          <div className="space-y-4">
            <div className="text-sm bg-muted/40 rounded p-3">
              <div className="font-medium">{submission.name}</div>
              <div className="text-muted-foreground">{submission.phone}{submission.social ? ` · ${submission.social}` : ''}</div>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Поток</label>
              <Select value={streamId} onValueChange={setStreamId}>
                <SelectTrigger><SelectValue placeholder="Выберите поток" /></SelectTrigger>
                <SelectContent>
                  {streams.length === 0 && <div className="px-3 py-2 text-sm text-muted-foreground">Нет потоков</div>}
                  {streams.map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} · {format(new Date(s.start_date), 'd MMM yyyy', { locale: ru })}{s.is_active ? ' · активный' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Участник (профиль)</label>
              <Input value={profileSearch} onChange={(e) => { setProfileSearch(e.target.value); setUserId(''); }} placeholder="Поиск по имени, email или телефону" />
              {profileSearch.trim().length >= 2 && (
                <div className="mt-2 max-h-56 overflow-y-auto border border-border rounded">
                  {searching ? (
                    <div className="p-3 flex justify-center"><Loader2 className="w-4 h-4 animate-spin" /></div>
                  ) : profiles.length === 0 ? (
                    <div className="p-3 text-sm text-muted-foreground">Не найдено. Участник должен быть зарегистрирован.</div>
                  ) : profiles.map(p => {
                    const label = p.display_name || `${p.first_name || ''} ${p.last_name || ''}`.trim() || p.email || 'без имени';
                    const isSel = userId === p.user_id;
                    return (
                      <button key={p.user_id} type="button" onClick={() => setUserId(p.user_id)}
                        className={`w-full text-left px-3 py-2 text-sm border-b border-border last:border-0 hover:bg-muted/40 ${isSel ? 'bg-primary/10' : ''}`}>
                        <div className="font-medium">{label}</div>
                        <div className="text-xs text-muted-foreground">{p.email || ''}{p.phone ? ` · ${p.phone}` : ''}</div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>Отмена</Button>
          <Button onClick={enroll} disabled={!streamId || submitting}>
            {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Зачислить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
