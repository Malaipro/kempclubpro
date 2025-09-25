import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Users, Search, UserPlus, Mail, Phone, Calendar } from 'lucide-react';
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
        .order('total_points', { ascending: false });

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
    <Card className="kamp-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-kamp-accent">
          <Users className="w-5 h-5" />
          Управление участниками
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search and Actions */}
        <div className="flex gap-4 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Поиск участников..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button className="flex items-center gap-2">
            <UserPlus className="w-4 h-4" />
            Добавить участника
          </Button>
        </div>

        {/* Participants Table */}
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-pulse">Загрузка участников...</div>
          </div>
        ) : (
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Участник</TableHead>
                  <TableHead>Контакты</TableHead>
                  <TableHead>Очки</TableHead>
                  <TableHead>Позиция</TableHead>
                  <TableHead>Дата регистрации</TableHead>
                  <TableHead>Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredParticipants.map((participant) => (
                  <TableRow key={participant.id}>
                    <TableCell>
                      <div className="font-medium">{formatName(participant)}</div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1 text-sm text-gray-600">
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
                      <Badge variant="secondary">{participant.total_points}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">#{participant.rank_position}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <Calendar className="w-3 h-3" />
                        {new Date(participant.created_at).toLocaleDateString('ru-RU')}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          Редактировать
                        </Button>
                        <Button variant="outline" size="sm">
                          Профиль
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
          <div className="text-center py-8 text-gray-500">
            {searchTerm ? 'Участники не найдены' : 'Нет зарегистрированных участников'}
          </div>
        )}
      </CardContent>
    </Card>
  );
};