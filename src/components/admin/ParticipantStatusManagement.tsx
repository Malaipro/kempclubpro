import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserCog } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  PARTICIPANT_STATUSES,
  PARTICIPANT_STATUS_META,
  getParticipantStatusMeta,
  type ParticipantStatus,
} from '@/constants/participantStatus';

interface Participant {
  id: string;
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  participant_status: ParticipantStatus;
  intensive_completed_at: string | null;
  club_joined_at: string | null;
}

export const ParticipantStatusManagement: React.FC = () => {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchParticipants();
  }, []);

  const fetchParticipants = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('id, user_id, first_name, last_name, display_name, participant_status, intensive_completed_at, club_joined_at')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setParticipants((data || []) as Participant[]);
    } catch (error) {
      console.error('Error fetching participants:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось загрузить участников',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (userId: string, newStatus: ParticipantStatus) => {
    const label = PARTICIPANT_STATUS_META[newStatus]?.label ?? newStatus;
    try {
      const { error } = await supabase.rpc('update_participant_status', {
        p_user_id: userId,
        p_new_status: newStatus,
      });
      if (error) throw error;

      toast({ title: 'Успех', description: `Статус участника изменён на «${label}»` });
      await fetchParticipants();
    } catch (error: any) {
      console.error('RPC error update_participant_status:', error);
      try {
        const { error: updErr } = await supabase
          .from('profiles')
          .update({ participant_status: newStatus })
          .eq('user_id', userId);
        if (updErr) throw updErr;

        const { error: lbErr } = await supabase.rpc('update_user_leaderboard', { user_uuid: userId });
        if (lbErr) console.warn('Leaderboard update warning:', lbErr);

        toast({ title: 'Успех', description: `Статус участника изменён на «${label}» (fallback)` });
        await fetchParticipants();
      } catch (innerErr: any) {
        console.error('Fallback status update failed:', innerErr);
        toast({
          title: 'Ошибка',
          description: `Не удалось изменить статус: ${innerErr?.message || 'Неизвестная ошибка'}`,
          variant: 'destructive',
        });
      }
    }
  };

  const getDisplayName = (participant: Participant) => {
    return participant.display_name ||
      `${participant.first_name || ''} ${participant.last_name || ''}`.trim() ||
      'Без имени';
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-muted-foreground">Загрузка...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <UserCog className="w-6 h-6 text-destructive" />
          Управление статусами участников
        </h1>
        <p className="text-muted-foreground">
          Изменяйте статусы участников для управления доступом к различным разделам ЛК
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Участники ({participants.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Участник</TableHead>
                <TableHead>Текущий статус</TableHead>
                <TableHead>Дата завершения интенсива</TableHead>
                <TableHead>Дата вступления в клуб</TableHead>
                <TableHead>Изменить статус</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {participants.map((participant) => {
                const meta = getParticipantStatusMeta(participant.participant_status);
                const Icon = meta?.icon;
                return (
                  <TableRow key={participant.id}>
                    <TableCell className="font-medium">{getDisplayName(participant)}</TableCell>
                    <TableCell>
                      <Badge className={meta?.badgeClass}>
                        <span className="flex items-center gap-1">
                          {Icon ? <Icon className="w-4 h-4" /> : null}
                          {meta?.label ?? participant.participant_status ?? '—'}
                        </span>
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {participant.intensive_completed_at
                        ? new Date(participant.intensive_completed_at).toLocaleDateString('ru-RU')
                        : '—'}
                    </TableCell>
                    <TableCell>
                      {participant.club_joined_at
                        ? new Date(participant.club_joined_at).toLocaleDateString('ru-RU')
                        : '—'}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={participant.participant_status}
                        onValueChange={(value) => handleStatusChange(participant.user_id, value as ParticipantStatus)}
                      >
                        <SelectTrigger className="w-[220px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PARTICIPANT_STATUSES.map((s) => (
                            <SelectItem key={s.value} value={s.value}>
                              <span className="flex items-center gap-2">
                                <s.icon className="w-4 h-4" />
                                {s.label}
                                {s.legacy ? (
                                  <span className="text-xs text-muted-foreground">(legacy)</span>
                                ) : null}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
