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
import { Coins, Plus, Minus, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

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

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [balanceRes, txRes] = await Promise.all([
        supabase.rpc('get_user_coin_balance', { p_user_id: userId }),
        supabase
          .from('coin_transactions')
          .select('id, amount, reason, source_type, source_id, created_at, created_by')
          .eq('user_id', userId)
          .order('created_at', { ascending: false }),
      ]);
      if (txRes.error) throw txRes.error;
      setBalance(balanceRes.data ?? 0);
      setTransactions(txRes.data || []);
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
      const { data, error } = await supabase.rpc('admin_adjust_coins', {
        p_user_id: userId,
        p_amount: sign * parsed,
        p_reason: reason.trim(),
      });
      if (error) throw error;

      setBalance(data ?? 0);
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
