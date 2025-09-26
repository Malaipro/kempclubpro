import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Users, Search, UserPlus, Mail, Phone, Calendar, CheckCircle, Clock, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Profile {
  id: string;
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  phone: string | null;
  telegram: string | null;
  total_points: number;
  rank_position: number;
  created_at: string;
  approved: boolean;
  approved_at: string | null;
  approved_by: string | null;
}

export const ParticipantManagement: React.FC = () => {
  const [participants, setParticipants] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  const fetchParticipants = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setParticipants(data || []);
    } catch (error) {
      console.error('Error fetching participants:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось загрузить список участников',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApproveParticipant = async (participantId: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          approved: true,
          approved_at: new Date().toISOString(),
          approved_by: (await supabase.auth.getUser()).data.user?.id
        })
        .eq('id', participantId);

      if (error) throw error;

      toast({
        title: 'Успешно',
        description: 'Участник утвержден',
      });

      fetchParticipants();
    } catch (error) {
      console.error('Error approving participant:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось утвердить участника',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteParticipant = async (userId: string, displayName: string) => {
    if (!confirm(`Вы уверены, что хотите удалить пользователя "${displayName}"? Это действие необратимо!`)) {
      return;
    }

    try {
      const { error } = await supabase.functions.invoke('delete-user', {
        body: { userId }
      });

      if (error) throw error;

      toast({
        title: 'Успех',
        description: 'Пользователь успешно удален',
        variant: 'default',
      });

      fetchParticipants();
    } catch (error) {
      console.error('Error deleting participant:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось удалить пользователя',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    fetchParticipants();
  }, []);

  const filteredParticipants = participants.filter(participant =>
    (participant.display_name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (participant.first_name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (participant.last_name?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const formatName = (participant: Profile) => {
    if (participant.first_name && participant.last_name) {
      return `${participant.first_name} ${participant.last_name}`;
    }
    return participant.display_name || 'Не указано';
  };

  return (
    <div className="bg-gray-900 p-6 rounded-lg">
      <div className="flex items-center gap-2 mb-6">
        <Users className="w-5 h-5 text-destructive" />
        <h2 className="text-xl font-semibold text-destructive">Управление участниками</h2>
      </div>
      
      {/* Search and Actions */}
      <div className="flex gap-4 items-center mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Поиск участников..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-white text-gray-900 border-gray-300"
          />
        </div>
        <Button className="flex items-center gap-2 bg-destructive hover:bg-destructive/90 text-white">
          <UserPlus className="w-4 h-4" />
          Добавить участника
        </Button>
      </div>

      {/* Participants Table */}
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-pulse text-gray-400">Загрузка участников...</div>
        </div>
      ) : (
        <div className="bg-gray-800 border border-gray-700 rounded-lg">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-gray-700">
                <TableHead className="text-gray-300">Участник</TableHead>
                <TableHead className="text-gray-300">Контакты</TableHead>
                <TableHead className="text-gray-300">Статус</TableHead>
                <TableHead className="text-gray-300">Очки</TableHead>
                <TableHead className="text-gray-300">Дата регистрации</TableHead>
                <TableHead className="text-gray-300">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredParticipants.map((participant) => (
                <TableRow key={participant.id} className="border-b border-gray-700">
                  <TableCell>
                    <div className="font-medium text-white">{formatName(participant)}</div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1 text-sm text-gray-300">
                      {participant.phone && (
                        <div className="flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {participant.phone}
                        </div>
                      )}
                      {participant.telegram && (
                        <div className="flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {participant.telegram}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {participant.approved ? (
                      <Badge variant="secondary" className="bg-green-600 text-white flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        Утвержден
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-yellow-600 text-white flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Зарегистрирован
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="bg-destructive text-white">{participant.total_points}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm text-gray-300">
                      <Calendar className="w-3 h-3" />
                      {new Date(participant.created_at).toLocaleDateString('ru-RU')}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2 flex-wrap">
                      {!participant.approved && (
                        <Button 
                          onClick={() => handleApproveParticipant(participant.id)}
                          size="sm" 
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Утвердить
                        </Button>
                      )}
                      <Button variant="outline" size="sm" className="border-gray-600 text-gray-300 hover:bg-gray-700">
                        Редактировать
                      </Button>
                      <Button 
                        onClick={() => handleDeleteParticipant(participant.user_id, participant.display_name || 'Неизвестный')}
                        size="sm" 
                        variant="outline"
                        className="border-red-600 text-red-400 hover:bg-red-600 hover:text-white"
                      >
                        <Trash2 className="w-3 h-3 mr-1" />
                        Удалить
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {filteredParticipants.length === 0 && !loading && (
        <div className="text-center py-8 text-gray-400">
          {searchTerm ? 'Участники не найдены' : 'Нет зарегистрированных участников'}
        </div>
      )}
    </div>
  );
};