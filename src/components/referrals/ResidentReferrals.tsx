import React, { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Copy, Check, Users, UserCheck, Coins, Share2, Gift } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface Lead {
  id: string;
  name: string;
  phone: string | null;
  telegram: string | null;
  status: 'new' | 'in_progress' | 'confirmed' | 'rejected';
  bonus_awarded: boolean;
  bonus_amount: number | null;
  created_at: string;
  confirmed_at: string | null;
}

interface Settings {
  enabled: boolean;
  bonus_amount: number;
  default_invite_text: string;
}

const STATUS_LABELS: Record<Lead['status'], string> = {
  new: 'Новая',
  in_progress: 'В работе',
  confirmed: 'Подтверждена',
  rejected: 'Отклонена',
};

const STATUS_COLORS: Record<Lead['status'], string> = {
  new: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  in_progress: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  confirmed: 'bg-green-500/20 text-green-300 border-green-500/30',
  rejected: 'bg-red-500/20 text-red-300 border-red-500/30',
};

export const ResidentReferrals: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState<string | null>(null);
  const [coins, setCoins] = useState(0);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [copied, setCopied] = useState(false);
  const [copiedText, setCopiedText] = useState(false);

  const link = code ? `${window.location.origin}/join?ref=${code}` : '';

  const inviteText = settings && code
    ? `${settings.default_invite_text}\n${link}`
    : '';

  const stats = {
    total: leads.length,
    confirmed: leads.filter(l => l.status === 'confirmed').length,
    bonusEarned: leads
      .filter(l => l.bonus_awarded)
      .reduce((sum, l) => sum + (l.bonus_amount || 0), 0),
  };

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      // 1. Ensure referral code exists
      const { data: codeData, error: codeError } = await supabase
        .rpc('ensure_referral_code' as any, { _user_id: user.id });
      if (codeError) throw codeError;

      // 2. Profile (coins)
      const { data: profile } = await supabase
        .from('profiles')
        .select('referral_coins')
        .eq('user_id', user.id)
        .maybeSingle();

      // 3. Settings
      const { data: settingsData } = await (supabase as any)
        .from('referral_settings')
        .select('enabled, bonus_amount, default_invite_text')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      // 4. Leads
      const { data: leadsData, error: leadsError } = await (supabase as any)
        .from('referral_leads')
        .select('id, name, phone, telegram, status, bonus_awarded, bonus_amount, created_at, confirmed_at')
        .eq('referrer_user_id', user.id)
        .order('created_at', { ascending: false });
      if (leadsError) throw leadsError;

      setCode(codeData as string);
      setCoins((profile as any)?.referral_coins || 0);
      setSettings(settingsData);
      setLeads((leadsData || []) as Lead[]);
    } catch (e: any) {
      console.error(e);
      toast({
        title: 'Ошибка загрузки',
        description: e.message || 'Не удалось загрузить реферальные данные',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  useEffect(() => { load(); }, [load]);

  const copyLink = async () => {
    if (!link) return;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    toast({ title: 'Ссылка скопирована' });
    setTimeout(() => setCopied(false), 2000);
  };

  const copyText = async () => {
    if (!inviteText) return;
    await navigator.clipboard.writeText(inviteText);
    setCopiedText(true);
    toast({ title: 'Текст приглашения скопирован' });
    setTimeout(() => setCopiedText(false), 2000);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (settings && !settings.enabled) {
    return (
      <Card className="bg-kamp-secondary border-kamp-gray">
        <CardContent className="py-12 text-center">
          <Gift className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">Реферальная программа временно недоступна</h3>
          <p className="text-muted-foreground">Скоро мы её включим — следите за обновлениями</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Hero card with code */}
      <Card className="bg-gradient-to-br from-kamp-secondary to-black border-[#e60000]/30">
        <CardContent className="py-8 px-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-[#e60000]/20 flex items-center justify-center">
              <Share2 className="w-6 h-6 text-[#e60000]" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Приглашай друзей в КЭМП</h2>
              <p className="text-muted-foreground text-sm">
                Получай {settings?.bonus_amount || 10} коинов за каждого подтверждённого приглашённого
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider">Твой код</label>
              <div className="text-3xl md:text-4xl font-mono font-bold text-[#e60000] mt-1">{code}</div>
            </div>

            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider">Персональная ссылка</label>
              <div className="flex flex-col sm:flex-row gap-2 mt-1">
                <Input
                  readOnly
                  value={link}
                  className="bg-black/40 border-kamp-gray text-white font-mono text-sm"
                />
                <Button
                  onClick={copyLink}
                  className="bg-[#e60000] hover:bg-[#ff3030] text-white shrink-0"
                >
                  {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                  {copied ? 'Скопировано' : 'Скопировать'}
                </Button>
              </div>
            </div>

            {settings && (
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider">Текст приглашения</label>
                <div className="bg-black/40 border border-kamp-gray rounded-lg p-3 mt-1 text-sm text-white whitespace-pre-line">
                  {inviteText}
                </div>
                <Button
                  onClick={copyText}
                  variant="outline"
                  size="sm"
                  className="mt-2 border-kamp-gray text-white hover:bg-kamp-gray"
                >
                  {copiedText ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                  Скопировать текст
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-kamp-secondary border-kamp-gray">
          <CardContent className="py-6">
            <div className="flex items-center gap-3">
              <Users className="w-8 h-8 text-blue-400" />
              <div>
                <div className="text-3xl font-bold text-white">{stats.total}</div>
                <div className="text-sm text-muted-foreground">Всего заявок</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-kamp-secondary border-kamp-gray">
          <CardContent className="py-6">
            <div className="flex items-center gap-3">
              <UserCheck className="w-8 h-8 text-green-400" />
              <div>
                <div className="text-3xl font-bold text-white">{stats.confirmed}</div>
                <div className="text-sm text-muted-foreground">Подтверждено</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-kamp-secondary border-[#e60000]/40">
          <CardContent className="py-6">
            <div className="flex items-center gap-3">
              <Coins className="w-8 h-8 text-[#e60000]" />
              <div>
                <div className="text-3xl font-bold text-white">{coins}</div>
                <div className="text-sm text-muted-foreground">Баланс коинов</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Leads list */}
      <Card className="bg-kamp-secondary border-kamp-gray">
        <CardHeader>
          <CardTitle className="text-white">Мои приглашённые</CardTitle>
        </CardHeader>
        <CardContent>
          {leads.length === 0 ? (
            <div className="py-12 text-center">
              <Users className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">Рефералов пока нет</p>
              <p className="text-xs text-muted-foreground mt-1">Поделись своей ссылкой, чтобы пригласить друзей</p>
            </div>
          ) : (
            <div className="space-y-3">
              {leads.map(lead => (
                <div
                  key={lead.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-black/30 rounded-lg border border-kamp-gray"
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-white">{lead.name}</div>
                    <div className="text-xs text-muted-foreground space-y-0.5 mt-1">
                      {lead.phone && <div>📱 {lead.phone}</div>}
                      {lead.telegram && <div>✈️ {lead.telegram}</div>}
                      <div>{new Date(lead.created_at).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge className={STATUS_COLORS[lead.status]}>{STATUS_LABELS[lead.status]}</Badge>
                    {lead.bonus_awarded && (
                      <Badge className="bg-[#e60000]/20 text-[#e60000] border-[#e60000]/30">
                        +{lead.bonus_amount} 🪙
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
