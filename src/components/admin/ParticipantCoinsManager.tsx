import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Coins, Plus, Minus, Loader2, Gift } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface CoinRule {
  code: string;
  name: string;
  coin_amount: number;
  is_active: boolean;
}

interface CoinTransaction {
  id: string;
  amount: number;
  reason: string;
  source_type: string | null;
  source_id: string | null;
  created_at: string;
  created_by: string | null;
}

interface Props {
  userId: string;
}

const SOURCE_LABELS: Record<string, string> = {
  admin_manual: 'Ручная операция',
  reward: 'Награда',
  referral: 'Реферал',
  activity: 'Активность',
};

export const ParticipantCoinsManager: React.FC<Props> = ({ userId }) => {
  const { toast } = useToast();
  const [balance, setBalance] = useState<number>(0);
  const [transactions, setTransactions] = useState<CoinTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  // Rule-based awarding
  const [rules, setRules] = useState<CoinRule[]>([]);
  const [ruleCode, setRuleCode] = useState<string>('');
  const [ruleSourceType, setRuleSourceType] = useState<string>('');
  const [ruleSourceId, setRuleSourceId] = useState<string>('');
  const [ruleReason, setRuleReason] = useState<string>('');
  const [ruleSubmitting, setRuleSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [balanceRes, txRes, rulesRes] = await Promise.all([
        supabase.rpc('get_user_coin_balance', { p_user_id: userId }),
        supabase
          .from('coin_transactions')
          .select('id, amount, reason, source_type, source_id, created_at, created_by')
          .eq('user_id', userId)
          .order('created_at', { ascending: false }),
        supabase
          .from('coin_rules')
          .select('code, name, coin_amount, is_active')
          .eq('is_active', true)
          .order('name'),
      ]);
      if (txRes.error) throw txRes.error;
      setBalance((balanceRes.data as number) ?? 0);
      setTransactions(txRes.data || []);
      setRules((rulesRes.data as CoinRule[]) || []);
    } catch (error) {
      console.error('Error loading coins:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось загрузить данные по коинам',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [userId, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAdjust = async (sign: 1 | -1) => {
    const parsed = parseInt(amount, 10);
    if (!parsed || parsed <= 0) {
      toast({
        title: 'Некорректная сумма',
        description: 'Введите положительное число коинов',
        variant: 'destructive',
      });
      return;
    }
    if (!reason.trim()) {
      toast({
        title: 'Укажите причину',
        description: 'Причина операции обязательна',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    try {
      const { data, error } = await (supabase.rpc as any)('admin_adjust_coins', {
        p_user_id: userId,
        p_amount: sign * parsed,
        p_reason: reason.trim(),
      });
      if (error) throw error;

      setBalance((data as number) ?? 0);
      setAmount('');
      setReason('');
      toast({
        title: 'Готово',
        description: sign > 0
          ? `Начислено ${parsed} коинов. Новый баланс: ${data}`
          : `Списано ${parsed} коинов. Новый баланс: ${data}`,
      });
      loadData();
    } catch (error: any) {
      console.error('Error adjusting coins:', error);
      toast({
        title: 'Ошибка',
        description: error?.message || 'Не удалось выполнить операцию',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleAwardByRule = async () => {
    if (!ruleCode) {
      toast({ title: 'Выберите правило', variant: 'destructive' });
      return;
    }
    setRuleSubmitting(true);
    try {
      const { data, error } = await (supabase.rpc as any)('award_coins_by_rule', {
        p_user_id: userId,
        p_rule_code: ruleCode,
        p_source_type: ruleSourceType.trim() || null,
        p_source_id: ruleSourceId.trim() || null,
        p_reason: ruleReason.trim() || null,
      });
      if (error) throw error;

      const result = data as { awarded: boolean; duplicate: boolean; balance: number; amount: number };
      setBalance(result?.balance ?? balance);

      if (result?.duplicate) {
        toast({
          title: 'Дубликат',
          description: 'Начисление по этому источнику уже было выполнено. Повторно не начислено.',
        });
      } else {
        toast({
          title: 'Начислено по правилу',
          description: `+${result?.amount ?? 0} коинов. Новый баланс: ${result?.balance ?? ''}`,
        });
        setRuleSourceId('');
        setRuleReason('');
      }
      loadData();
    } catch (error: any) {
      console.error('Error awarding by rule:', error);
      toast({
        title: 'Ошибка',
        description: error?.message || 'Не удалось начислить по правилу',
        variant: 'destructive',
      });
    } finally {
      setRuleSubmitting(false);
    }
  };



  return (
    <div className="space-y-6">
      {/* Balance + actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="w-5 h-5 text-primary" />
            Баланс коинов
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-3xl font-bold">
            {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : balance}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="coin-amount">Сумма (положительное число)</Label>
              <Input
                id="coin-amount"
                type="number"
                min={1}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Например, 50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="coin-reason">Причина (обязательно)</Label>
              <Textarea
                id="coin-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="За что начисляем / списываем"
                rows={1}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button onClick={() => handleAdjust(1)} disabled={submitting} className="gap-2">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Начислить
            </Button>
            <Button
              onClick={() => handleAdjust(-1)}
              disabled={submitting}
              variant="destructive"
              className="gap-2"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Minus className="w-4 h-4" />}
              Списать
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Баланс меняется только через журнал транзакций. Каждая операция фиксируется.
          </p>
        </CardContent>
      </Card>

      {/* Transactions journal */}
      <Card>
        <CardHeader>
          <CardTitle>Журнал транзакций</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : transactions.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Транзакций пока нет</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Дата</TableHead>
                    <TableHead>Сумма</TableHead>
                    <TableHead>Тип</TableHead>
                    <TableHead>Причина</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell className="whitespace-nowrap text-sm">
                        {format(new Date(tx.created_at), 'dd.MM.yyyy HH:mm', { locale: ru })}
                      </TableCell>
                      <TableCell>
                        <Badge variant={tx.amount >= 0 ? 'default' : 'destructive'}>
                          {tx.amount >= 0 ? `+${tx.amount}` : tx.amount}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {SOURCE_LABELS[tx.source_type || ''] || tx.source_type || '—'}
                      </TableCell>
                      <TableCell className="text-sm max-w-xs">{tx.reason}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
