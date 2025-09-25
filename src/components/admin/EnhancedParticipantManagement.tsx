import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Users, Plus, Edit, Trash2, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Participant {
  id: string;
  user_id: string;
  display_name: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  total_points: number;
  stream?: string;
  status: 'registered' | 'active' | 'completed';
}

export const EnhancedParticipantManagement: React.FC = () => {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchParticipants();
  }, []);

  const fetchParticipants = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, user_id, display_name, first_name, last_name, total_points')
        .order('display_name');

      if (error) throw error;

      // Transform data to match our interface
      const transformedData = data?.map(item => ({
        ...item,
        total_points: item.total_points || 0,
        stream: '2-й поток',
        status: 'registered' as const,
        email: 'Garaev2195@mail.ru' // Mock email, would come from auth.users in real implementation
      })) || [];

      setParticipants(transformedData);
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

  const formatParticipantName = (participant: Participant) => {
    if (participant.first_name && participant.last_name) {
      return `${participant.first_name} ${participant.last_name}`;
    }
    return participant.display_name || 'Неизвестный участник';
  };

  const getInitials = (participant: Participant) => {
    const name = formatParticipantName(participant);
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'registered':
        return <Badge className="bg-green-100 text-green-800">Зарегистрирован</Badge>;
      case 'active':
        return <Badge className="bg-blue-100 text-blue-800">Активен</Badge>;
      case 'completed':
        return <Badge className="bg-gray-100 text-gray-800">Завершен</Badge>;
      default:
        return <Badge>Неизвестно</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-pulse">Загрузка участников...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Управление участниками</h1>
          <p className="text-muted-foreground">Добавляйте и редактируйте участников интенсивов</p>
        </div>
        <Button className="bg-destructive hover:bg-destructive/90 text-white">
          <Plus className="w-4 h-4 mr-2" />
          Добавить участника
        </Button>
      </div>

      <div className="grid gap-4">
        {participants.map((participant) => (
          <Card key={participant.id} className="p-4">
            <CardContent className="p-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Avatar className="h-12 w-12 bg-destructive/10">
                    <AvatarFallback className="text-destructive font-medium">
                      <User className="w-6 h-6" />
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold text-lg">
                      {formatParticipantName(participant)}
                    </h3>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{participant.total_points} баллов</span>
                      <span>•</span>
                      <span>{participant.email}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline">{participant.stream}</Badge>
                      {getStatusBadge(participant.status)}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {participants.length === 0 && (
        <Card className="p-8">
          <div className="text-center text-muted-foreground">
            <Users className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-semibold mb-2">Нет участников</h3>
            <p className="text-sm">Добавьте первого участника, чтобы начать</p>
          </div>
        </Card>
      )}
    </div>
  );
};