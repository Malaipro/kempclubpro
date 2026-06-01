import React, { useCallback, useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { participantService, RewardRequest } from '@/services/participantService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Gift, Loader2, Check, X, Package } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface Props { userId: string; }

const STATUS_LABELS: Record<string, string> = {
  pending: 'Ожидает', approved: 'Одобрено', rejected: 'Отклонено', fulfilled: 'Выдано', cancelled: 'Отменено',
};

export const ParticipantRewardsTab: React.FC<Props> = ({ userId }) => {
  const { toast } = useToast();
  const [items, setItems] = useState<RewardRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try { setItems(await participantService.listRewardRequests(userId)); }
    catch (e: any) { toast({ title: 'Ошибка', description: e?.message || 'Не удалось загрузить награды', variant: 'destructive' }); }
    finally { setLoading(false); }
  }, [userId, toast]);

  useEffect(() => { load(); }, [load]);

  const review = async (id: string, status: 'approved' | 'rejected' | 'fulfilled' | 'cancelled') => {
    try { await participantService.reviewRewardRequest(id, status); toast({ title: 'Готово' }); load(); }
    catch (e: any) { toast({ title: 'Ошибка', description: e?.message, variant: 'destructive' }); }
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><Gift className="w-5 h-5 text-primary" />Заявки на награды</CardTitle></CardHeader>
      <CardContent>
        {items.length === 0 ? <p className="text-muted-foreground text-center py-6">Заявок нет</p> : (
          <div className="overflow-x-auto"><Table>
            <TableHeader><TableRow><TableHead>Дата</TableHead><TableHead>Награда</TableHead><TableHead>Стоимость</TableHead><TableHead>Статус</TableHead><TableHead className="text-right">Действия</TableHead></TableRow></TableHeader>
            <TableBody>
              {items.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="text-sm">{format(new Date(r.created_at), 'dd.MM.yyyy', { locale: ru })}</TableCell>
                  <TableCell>{r.rewards?.title || '—'}</TableCell>
                  <TableCell>{r.cost_coins}</TableCell>
                  <TableCell><Badge variant={r.status === 'fulfilled' || r.status === 'approved' ? 'default' : r.status === 'rejected' || r.status === 'cancelled' ? 'destructive' : 'secondary'}>{STATUS_LABELS[r.status] || r.status}</Badge></TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <Button size="icon" variant="ghost" title="Одобрить" onClick={() => review(r.id, 'approved')}><Check className="w-4 h-4 text-green-600" /></Button>
                    <Button size="icon" variant="ghost" title="Выдано" onClick={() => review(r.id, 'fulfilled')}><Package className="w-4 h-4 text-blue-600" /></Button>
                    <Button size="icon" variant="ghost" title="Отклонить" onClick={() => review(r.id, 'rejected')}><X className="w-4 h-4 text-destructive" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table></div>
        )}
      </CardContent>
    </Card>
  );
};
