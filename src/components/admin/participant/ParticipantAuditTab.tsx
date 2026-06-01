import React, { useCallback, useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { participantService, AuditEntry } from '@/services/participantService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { History, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface Props { userId: string; }

export const ParticipantAuditTab: React.FC<Props> = ({ userId }) => {
  const { toast } = useToast();
  const [items, setItems] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try { setItems(await participantService.listAudit(userId)); }
    catch (e: any) { toast({ title: 'Ошибка', description: e?.message || 'Не удалось загрузить аудит', variant: 'destructive' }); }
    finally { setLoading(false); }
  }, [userId, toast]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><History className="w-5 h-5 text-primary" />Аудит действий</CardTitle></CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-muted-foreground text-center py-6">
            По этому участнику записей аудита пока нет. Полная лента изменений (статус, поток, тотемы, коины) выносится в Партию D.
          </p>
        ) : (
          <div className="overflow-x-auto"><Table>
            <TableHeader><TableRow><TableHead>Дата</TableHead><TableHead>Действие</TableHead><TableHead>Таблица</TableHead></TableRow></TableHeader>
            <TableBody>
              {items.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="text-sm">{a.timestamp ? format(new Date(a.timestamp), 'dd.MM.yyyy HH:mm', { locale: ru }) : '—'}</TableCell>
                  <TableCell><Badge variant="outline">{a.action}</Badge></TableCell>
                  <TableCell className="text-sm">{a.table_name || '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table></div>
        )}
      </CardContent>
    </Card>
  );
};
