import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, UserCheck, UserCog, GraduationCap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

type ParticipantStatus = 'intensive_active' | 'intensive_completed' | 'club_resident' | 'alumni';

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

const statusLabels: Record<ParticipantStatus, string> = {
  intensive_active: 'Активный участник',
  intensive_completed: 'Завершил интенсив (legacy)',
  club_resident: 'Резидент клуба',
  alumni: 'Выпускник'
};

const statusIcons: Record<ParticipantStatus, React.ReactNode> = {
  intensive_active: <Users className="w-4 h-4" />,
  intensive_completed: <UserCheck className="w-4 h-4" />,
  club_resident: <UserCog className="w-4 h-4" />,
  alumni: <GraduationCap className="w-4 h-4" />
};

const statusColors: Record<ParticipantStatus, string> = {
  intensive_active: 'bg-blue-100 text-blue-800',
  intensive_completed: 'bg-green-100 text-green-800',
  club_resident: 'bg-purple-100 text-purple-800',
  alumni: 'bg-gray-100 text-gray-800'
};

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
      setParticipants(data || []);
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
    try {
      const { error } = await supabase.rpc('update_participant_status', {
        p_user_id: userId,
        p_new_status: newStatus,
      });
      if (error) throw error;

      toast({
        title: 'Успех',
        description: `Статус участника изменен на "${statusLabels[newStatus]}"`,
      });
      await fetchParticipants();
    } catch (error: any) {
      console.error('RPC error update_participant_status:', error);
      // Fallback: прямое обновление профиля (для админов разрешено RLS)
      try {
        const { error: updErr } = await supabase
          .from('profiles')
          .update({ participant_status: newStatus })
          .eq('user_id', userId);
        if (updErr) throw updErr;

        const { error: lbErr } = await supabase.rpc('update_user_leaderboard', { user_uuid: userId });
        if (lbErr) console.warn('Leaderboard update warning:', lbErr);

        toast({
          title: 'Успех',
          description: `Статус участника изменен на "${statusLabels[newStatus]}" (fallback)`,
        });
        await fetchParticipants();
      } catch (innerErr: any) {
        console.error('Fallback status update failed:', innerErr);
        const msg = innerErr?.message || 'Неизвестная ошибка';
        toast({ title: 'Ошибка', description: `Не удалось изменить статус: ${msg}`, variant: 'destructive' });
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
              {participants.map((participant) => (
                <TableRow key={participant.id}>
                  <TableCell className="font-medium">
                    {getDisplayName(participant)}
                  </TableCell>
                  <TableCell>
                    <Badge className={statusColors[participant.participant_status]}>
                      <span className="flex items-center gap-1">
                        {statusIcons[participant.participant_status]}
                        {statusLabels[participant.participant_status]}
                      </span>
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {participant.intensive_completed_at
                      ? new Date(participant.intensive_completed_at).toLocaleDateString('ru-RU')
                      : '-'}
                  </TableCell>
                  <TableCell>
                    {participant.club_joined_at
                      ? new Date(participant.club_joined_at).toLocaleDateString('ru-RU')
                      : '-'}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={participant.participant_status}
                      onValueChange={(value) => handleStatusChange(participant.user_id, value as ParticipantStatus)}
                    >
                      <SelectTrigger className="w-[200px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="intensive_active">
                          Активный участник
                        </SelectItem>
                        {/* intensive_completed — legacy-статус: не предлагается для назначения */}
                        {participant.participant_status === 'intensive_completed' && (
                          <SelectItem value="intensive_completed" disabled>
                            Завершил интенсив (legacy)
                          </SelectItem>
                        )}
                        <SelectItem value="club_resident">
                          Резидент клуба
                        </SelectItem>
                        <SelectItem value="alumni">
                          Выпускник
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
