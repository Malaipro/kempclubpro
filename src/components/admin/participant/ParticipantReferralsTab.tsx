import React, { useCallback, useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { participantService, ReferralLead } from '@/services/participantService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { UserPlus, Loader2, Check, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface Props { userId: string; }

const STATUS_LABELS: Record<string, string> = {
  new: 'Новый', confirmed: 'Подтверждён', rejected: 'Отклонён',
};

export const ParticipantReferralsTab: React.FC<Props> = ({ userId }) => {
  const { toast } = useToast();
  const [items, setItems] = useState<ReferralLead[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try { setItems(await participantService.listReferralLeads(userId)); }
    catch (e: any) { toast({ title: 'Ошибка', description: e?.message || 'Не удалось загрузить рефералов', variant: 'destructive' }); }
    finally { setLoading(false); }
  }, [userId, toast]);

  useEffect(() => { load(); }, [load]);

  const confirm_ = async (id: string) => {
    try { await participantService.confirmReferralLead(id); toast({ title: 'Готово', description: 'Бонус начислен' }); load(); }
    catch (e: any) { toast({ title: 'Ошибка', description: e?.message, variant: 'destructive' }); }
  };

  const remove = async (id: string) => {
    if (!confirm('Удалить заявку реферала?')) return;
    try { await participantService.deleteReferralLead(id); toast({ title: 'Удалено' }); load(); }
    catch (e: any) { toast({ title: 'Ошибка', description: e?.message, variant: 'destructive' }); }
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><UserPlus className="w-5 h-5 text-primary" />Рефералы</CardTitle></CardHeader>
      <CardContent>
        {items.length === 0 ? <p className="text-muted-foreground text-center py-6">Приглашённых нет</p> : (
          <div className="overflow-x-auto"><Table>
            <TableHeader><TableRow><TableHead>Дата</TableHead><TableHead>Имя</TableHead><TableHead>Контакт</TableHead><TableHead>Статус</TableHead><TableHead>Бонус</TableHead><TableHead className="text-right">Действия</TableHead></TableRow></TableHeader>
            <TableBody>
              {items.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="text-sm">{format(new Date(r.created_at), 'dd.MM.yyyy', { locale: ru })}</TableCell>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell className="text-sm">{r.telegram || r.phone || '—'}</TableCell>
                  <TableCell><Badge variant={r.status === 'confirmed' ? 'default' : r.status === 'rejected' ? 'destructive' : 'secondary'}>{STATUS_LABELS[r.status] || r.status}</Badge></TableCell>
                  <TableCell>{r.bonus_awarded ? `+${r.bonus_amount ?? ''}` : '—'}</TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    {!r.bonus_awarded && <Button size="icon" variant="ghost" title="Подтвердить и начислить бонус" onClick={() => confirm_(r.id)}><Check className="w-4 h-4 text-green-600" /></Button>}
                    <Button size="icon" variant="ghost" onClick={() => remove(r.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
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
