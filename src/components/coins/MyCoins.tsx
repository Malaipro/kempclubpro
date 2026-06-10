import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Coins, TrendingUp, TrendingDown } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface CoinTransaction {
  id: string;
  amount: number;
  reason: string;
  source_type: string | null;
  created_at: string;
}

const SOURCE_LABELS: Record<string, string> = {
  admin_manual: 'Ручная операция',
  reward: 'Награда',
  reward_request: 'Заказ награды',
  referral: 'Реферал',
  referral_lead: 'Реферал',
  activity: 'Активность',
  training_attendance: 'Тренировка',
  lecture_attendance: 'Лекция',
  event_participation: 'Событие',
  homework_submit: 'Сдача ДЗ',
  homework_accept: 'Приём ДЗ',
  cooper_test: 'Тест Купера',
  totem_earned: 'Тотем',
  challenge_win: 'Челлендж',
  invite_participant: 'Приглашение',
};

const sourceLabel = (s: string | null) =>
  (s && SOURCE_LABELS[s]) || s || 'Система';

export const MyCoins: React.FC = () => {
  const { user } = useAuth();
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<CoinTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [balanceRes, txRes] = await Promise.all([
        supabase.rpc('get_user_coin_balance', { p_user_id: user.id }),
        supabase
          .from('coin_transactions')
          .select('id, amount, reason, source_type, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
      ]);
      setBalance((balanceRes.data as number) ?? 0);
      setTransactions((txRes.data as CoinTransaction[]) || []);
    } catch (e) {
      console.error('Error loading coins:', e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Balance hero */}
      <Card className="bg-gradient-to-br from-kamp-secondary to-black border-[#e60000]/30">
        <CardContent className="py-8 px-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-[#e60000]/20 flex items-center justify-center">
              <Coins className="w-7 h-7 text-[#e60000]" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground uppercase tracking-wider">Баланс коинов</p>
              <div className="text-4xl font-bold text-white">{balance}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* History */}
      <Card className="bg-kamp-secondary border-kamp-gray">
        <CardHeader>
          <CardTitle className="text-white text-lg">История начислений</CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Пока нет операций с коинами</p>
          ) : (
            <div className="space-y-3">
              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-kamp-gray bg-black/30 p-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                        tx.amount >= 0 ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400'
                      }`}
                    >
                      {tx.amount >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-white text-sm truncate">{tx.reason || 'Операция'}</p>
                      <p className="text-xs text-muted-foreground">
                        {sourceLabel(tx.source_type)} •{' '}
                        {format(new Date(tx.created_at), 'dd.MM.yyyy HH:mm', { locale: ru })}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant={tx.amount >= 0 ? 'default' : 'destructive'}
                    className="flex-shrink-0"
                  >
                    {tx.amount >= 0 ? `+${tx.amount}` : tx.amount}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
