import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Coins, Search, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { ParticipantCoinsManager } from '@/components/admin/ParticipantCoinsManager';

interface CoinBalanceRow {
  user_id: string;
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  participant_status: string | null;
  stream_name: string | null;
  balance: number;
  tx_count: number;
  last_tx_at: string | null;
}

type StatusFilter = 'all' | 'intensive_active' | 'club_resident' | 'alumni';

const STATUS_LABELS: Record<string, string> = {
  intensive_active: 'Интенсив',
  intensive_completed: 'Интенсив завершён',
  club_resident: 'Резидент клуба',
  alumni: 'Выпускник',
};

const FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'Все' },
  { value: 'intensive_active', label: 'Интенсив' },
  { value: 'club_resident', label: 'Резиденты' },
  { value: 'alumni', label: 'Выпускники' },
];

export const AdminCoinsManagement: React.FC = () => {
  const { toast } = useToast();
  const [rows, setRows] = useState<CoinBalanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selected, setSelected] = useState<CoinBalanceRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase.rpc as any)('admin_list_coin_balances');
      if (error) throw error;
      setRows((data as CoinBalanceRow[]) || []);
    } catch (e: any) {
      console.error('Error loading coin balances:', e);
      toast({
        title: 'Ошибка',
        description: e?.message || 'Не удалось загрузить балансы',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (statusFilter !== 'all' && r.participant_status !== statusFilter) return false;
      if (!q) return true;
      const name = `${r.display_name || ''} ${r.first_name || ''} ${r.last_name || ''}`.toLowerCase();
      return name.includes(q) || (r.email || '').toLowerCase().includes(q);
    });
  }, [rows, search, statusFilter]);

  const fullName = (r: CoinBalanceRow) =>
    [r.first_name, r.last_name].filter(Boolean).join(' ') || r.display_name || 'Участник';

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="w-5 h-5 text-primary" />
            Коины участников
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Поиск по имени или email"
                className="pl-9"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {FILTERS.map((f) => (
                <Button
                  key={f.value}
                  size="sm"
                  variant={statusFilter === f.value ? 'secondary' : 'outline'}
                  onClick={() => setStatusFilter(f.value)}
                >
                  {f.label}
                </Button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Участники не найдены</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ФИО</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Статус</TableHead>
                    <TableHead>Поток</TableHead>
                    <TableHead className="text-right">Баланс</TableHead>
                    <TableHead className="text-right">Транзакций</TableHead>
                    <TableHead>Последняя</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r) => (
                    <TableRow key={r.user_id}>
                      <TableCell className="font-medium whitespace-nowrap">{fullName(r)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{r.email || '—'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="whitespace-nowrap">
                          {STATUS_LABELS[r.participant_status || ''] || r.participant_status || '—'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{r.stream_name || '—'}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant="default">{r.balance}</Badge>
                      </TableCell>
                      <TableCell className="text-right text-sm">{r.tx_count}</TableCell>
                      <TableCell className="text-sm whitespace-nowrap">
                        {r.last_tx_at
                          ? format(new Date(r.last_tx_at), 'dd.MM.yyyy HH:mm', { locale: ru })
                          : '—'}
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant="ghost" onClick={() => setSelected(r)}>
                          <Eye className="w-4 h-4 mr-1" />
                          Открыть
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={(open) => { if (!open) { setSelected(null); load(); } }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Коины — {selected ? fullName(selected) : ''}
            </DialogTitle>
          </DialogHeader>
          {selected && <ParticipantCoinsManager userId={selected.user_id} />}
        </DialogContent>
      </Dialog>
    </div>
  );
};
