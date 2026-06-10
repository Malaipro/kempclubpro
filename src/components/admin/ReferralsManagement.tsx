import React, { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, CheckCircle, XCircle, Clock, Settings, Coins, Save } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

type LeadStatus = 'new' | 'in_progress' | 'contacted' | 'paid' | 'confirmed' | 'rejected' | 'rewarded';

interface AdminLead {
  id: string;
  referrer_user_id: string;
  referral_code: string;
  name: string;
  phone: string | null;
  telegram: string | null;
  email: string | null;
  comment: string | null;
  status: LeadStatus;
  bonus_awarded: boolean;
  bonus_amount: number | null;
  reward_issued: boolean | null;
  created_at: string;
  confirmed_at: string | null;
  referrer_name?: string;
}

const STATUS_LABELS: Record<LeadStatus, string> = {
  new: 'Новая',
  in_progress: 'В работе',
  contacted: 'Контакт установлен',
  paid: 'Оплачено',
  confirmed: 'Подтверждена',
  rejected: 'Отклонена',
  rewarded: 'Бонус начислен',
};

const STATUS_COLORS: Record<LeadStatus, string> = {
  new: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  in_progress: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  contacted: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  paid: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  confirmed: 'bg-green-500/20 text-green-300 border-green-500/30',
  rejected: 'bg-red-500/20 text-red-300 border-red-500/30',
  rewarded: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
};


export const ReferralsManagement: React.FC = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState<AdminLead[]>([]);
  const [statusFilter, setStatusFilter] = useState<'all' | LeadStatus>('all');
  const [actionId, setActionId] = useState<string | null>(null);

  // Settings
  const [settingsId, setSettingsId] = useState<string | null>(null);
  const [enabled, setEnabled] = useState(true);
  const [bonusAmount, setBonusAmount] = useState(10);
  const [inviteText, setInviteText] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Leads with referrer profile
      const { data: leadsData, error: leadsErr } = await (supabase as any)
        .from('referral_leads')
        .select('*')
        .order('created_at', { ascending: false });
      if (leadsErr) throw leadsErr;

      // Fetch referrer names in batch
      const referrerIds = Array.from(new Set((leadsData || []).map((l: any) => l.referrer_user_id)));
      let nameMap: Record<string, string> = {};
      if (referrerIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, display_name, first_name, last_name')
          .in('user_id', referrerIds as string[]);
        (profiles || []).forEach((p: any) => {
          nameMap[p.user_id] =
            p.display_name ||
            [p.first_name, p.last_name].filter(Boolean).join(' ') ||
            'Резидент';
        });
      }

      const enriched = (leadsData || []).map((l: any) => ({
        ...l,
        referrer_name: nameMap[l.referrer_user_id] || 'Резидент',
      }));

      // Settings
      const { data: settingsData } = await (supabase as any)
        .from('referral_settings')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      setLeads(enriched);
      if (settingsData) {
        setSettingsId(settingsData.id);
        setEnabled(settingsData.enabled);
        setBonusAmount(settingsData.bonus_amount);
        setInviteText(settingsData.default_invite_text);
      }
    } catch (e: any) {
      console.error(e);
      toast({ title: 'Ошибка загрузки', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const updateStatus = async (lead: AdminLead, newStatus: LeadStatus) => {
    setActionId(lead.id);
    try {
      if (newStatus === 'confirmed') {
        if (lead.reward_issued || lead.bonus_awarded) {
          toast({ title: 'Бонус уже начислен', variant: 'destructive' });
          return;
        }
        const { error } = await supabase.rpc('admin_confirm_referral' as any, { p_lead_id: lead.id });
        if (error) throw error;
        toast({ title: 'Реферал подтверждён', description: 'Коины начислены по правилу referral_confirmed' });
      } else {
        const { error } = await (supabase as any)
          .from('referral_leads')
          .update({ status: newStatus })
          .eq('id', lead.id);
        if (error) throw error;
        toast({ title: 'Статус обновлён' });
      }
      await load();
    } catch (e: any) {
      console.error(e);
      toast({ title: 'Ошибка', description: e.message, variant: 'destructive' });
    } finally {
      setActionId(null);
    }
  };


  const saveSettings = async () => {
    if (!settingsId) return;
    setSavingSettings(true);
    try {
      const { error } = await (supabase as any)
        .from('referral_settings')
        .update({
          enabled,
          bonus_amount: bonusAmount,
          default_invite_text: inviteText,
        })
        .eq('id', settingsId);
      if (error) throw error;
      toast({ title: 'Настройки сохранены' });
    } catch (e: any) {
      toast({ title: 'Ошибка', description: e.message, variant: 'destructive' });
    } finally {
      setSavingSettings(false);
    }
  };

  const filteredLeads = statusFilter === 'all'
    ? leads
    : leads.filter(l => l.status === statusFilter);

  const stats = {
    total: leads.length,
    new: leads.filter(l => l.status === 'new').length,
    confirmed: leads.filter(l => l.status === 'confirmed').length,
    awarded: leads.filter(l => l.bonus_awarded).reduce((s, l) => s + (l.bonus_amount || 0), 0),
  };

  return (
    <Tabs defaultValue="leads" className="w-full">
      <TabsList className="bg-muted/50 mb-6">
        <TabsTrigger value="leads"><Users className="w-4 h-4 mr-2" />Заявки</TabsTrigger>
        <TabsTrigger value="settings"><Settings className="w-4 h-4 mr-2" />Настройки</TabsTrigger>
      </TabsList>

      <TabsContent value="leads">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <StatCard icon={<Users className="w-5 h-5 text-blue-400" />} label="Всего" value={stats.total} />
          <StatCard icon={<Clock className="w-5 h-5 text-yellow-400" />} label="Новые" value={stats.new} />
          <StatCard icon={<CheckCircle className="w-5 h-5 text-green-400" />} label="Подтверждено" value={stats.confirmed} />
          <StatCard icon={<Coins className="w-5 h-5 text-[#e60000]" />} label="Начислено" value={stats.awarded} />
        </div>

        <div className="mb-4 flex items-center gap-3">
          <Label className="text-white">Фильтр:</Label>
          <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
            <SelectTrigger className="w-48 bg-kamp-secondary border-kamp-gray text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все</SelectItem>
              <SelectItem value="new">Новые</SelectItem>
              <SelectItem value="in_progress">В работе</SelectItem>
              <SelectItem value="confirmed">Подтверждённые</SelectItem>
              <SelectItem value="rejected">Отклонённые</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : filteredLeads.length === 0 ? (
          <Card className="bg-kamp-secondary border-kamp-gray">
            <CardContent className="py-12 text-center">
              <Users className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">Заявок пока нет</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredLeads.map(lead => (
              <Card key={lead.id} className="bg-kamp-secondary border-kamp-gray">
                <CardContent className="py-4">
                  <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className="font-semibold text-white">{lead.name}</span>
                        <Badge className={STATUS_COLORS[lead.status]}>{STATUS_LABELS[lead.status]}</Badge>
                        {lead.bonus_awarded && (
                          <Badge className="bg-[#e60000]/20 text-[#e60000] border-[#e60000]/30">
                            +{lead.bonus_amount} коинов
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground space-y-0.5">
                        {lead.phone && <div>📱 {lead.phone}</div>}
                        {lead.telegram && <div>✈️ {lead.telegram}</div>}
                        {lead.comment && <div className="italic">💬 {lead.comment}</div>}
                        <div className="text-xs pt-1">
                          Пригласил: <span className="text-white font-medium">{lead.referrer_name}</span>
                          {' • '}
                          <span className="font-mono">{lead.referral_code}</span>
                          {' • '}
                          {new Date(lead.created_at).toLocaleString('ru-RU')}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 shrink-0">
                      {lead.status === 'new' && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={actionId === lead.id}
                          onClick={() => updateStatus(lead, 'in_progress')}
                          className="border-yellow-500/40 text-yellow-300 hover:bg-yellow-500/10"
                        >
                          В работу
                        </Button>
                      )}
                      {(lead.status === 'new' || lead.status === 'in_progress') && (
                        <>
                          <Button
                            size="sm"
                            disabled={actionId === lead.id}
                            onClick={() => updateStatus(lead, 'confirmed')}
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Подтвердить
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={actionId === lead.id}
                            onClick={() => updateStatus(lead, 'rejected')}
                            className="border-red-500/40 text-red-300 hover:bg-red-500/10"
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            Отклонить
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </TabsContent>

      <TabsContent value="settings">
        <Card className="bg-kamp-secondary border-kamp-gray max-w-2xl">
          <CardHeader>
            <CardTitle className="text-white">Настройки реферальной программы</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-white">Программа активна</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Если выключено, резиденты увидят сообщение о недоступности
                </p>
              </div>
              <Switch checked={enabled} onCheckedChange={setEnabled} />
            </div>

            <div>
              <Label className="text-white">Бонус за приглашённого (коинов)</Label>
              <Input
                type="number"
                min={0}
                value={bonusAmount}
                onChange={e => setBonusAmount(parseInt(e.target.value) || 0)}
                className="bg-black/40 border-kamp-gray text-white mt-1"
              />
            </div>

            <div>
              <Label className="text-white">Текст приглашения по умолчанию</Label>
              <Textarea
                value={inviteText}
                onChange={e => setInviteText(e.target.value)}
                rows={4}
                className="bg-black/40 border-kamp-gray text-white mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Резидент увидит этот текст вместе со своей ссылкой
              </p>
            </div>

            <Button
              onClick={saveSettings}
              disabled={savingSettings}
              className="bg-[#e60000] hover:bg-[#ff3030] text-white"
            >
              <Save className="w-4 h-4 mr-2" />
              {savingSettings ? 'Сохраняем…' : 'Сохранить'}
            </Button>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
};

const StatCard: React.FC<{ icon: React.ReactNode; label: string; value: number }> = ({ icon, label, value }) => (
  <Card className="bg-kamp-secondary border-kamp-gray">
    <CardContent className="py-4">
      <div className="flex items-center gap-2">
        {icon}
        <div>
          <div className="text-2xl font-bold text-white">{value}</div>
          <div className="text-xs text-muted-foreground">{label}</div>
        </div>
      </div>
    </CardContent>
  </Card>
);
