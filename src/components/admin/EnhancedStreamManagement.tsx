import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Calendar, Users, Plus, Eye, Edit } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface Stream {
  id: string;
  name: string;
  description?: string;
  start_date: string;
  end_date?: string;
  max_participants?: number;
  is_active: boolean;
  stream_type: string;
  participant_count?: number;
}

export const EnhancedStreamManagement: React.FC = () => {
  const [streams, setStreams] = useState<Stream[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchStreams();
  }, []);

  const fetchStreams = async () => {
    try {
      const { data, error } = await supabase
        .from('streams')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Add mock participant counts for demo
      const streamsWithCounts = data?.map((stream, index) => ({
        ...stream,
        participant_count: index === 0 ? 1 : 0, // First stream has 1 participant
      })) || [];

      setStreams(streamsWithCounts);
    } catch (error) {
      console.error('Error fetching streams:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось загрузить потоки',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleStreamStatus = async (streamId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('streams')
        .update({ is_active: !currentStatus })
        .eq('id', streamId);

      if (error) throw error;

      setStreams(prev => 
        prev.map(stream => 
          stream.id === streamId 
            ? { ...stream, is_active: !currentStatus }
            : stream
        )
      );

      toast({
        title: 'Статус изменен',
        description: `Поток ${!currentStatus ? 'активирован' : 'деактивирован'}`,
      });
    } catch (error) {
      console.error('Error updating stream status:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось изменить статус потока',
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = (isActive: boolean, isCurrent: boolean = false) => {
    if (isCurrent) {
      return <Badge className="bg-green-100 text-green-800">Текущий</Badge>;
    }
    return isActive 
      ? <Badge className="bg-blue-100 text-blue-800">Активный</Badge>
      : <Badge variant="secondary">Неактивный</Badge>;
  };

  const formatDateRange = (startDate: string, endDate?: string) => {
    const start = format(new Date(startDate), 'dd.MM.yyyy');
    const end = endDate ? format(new Date(endDate), 'dd.MM.yyyy') : null;
    return end ? `${start} - ${end}` : start;
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-pulse">Загрузка потоков...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Управление потоками</h1>
          <p className="text-muted-foreground">Создавайте и управляйте интенсивными потоками</p>
        </div>
        <Button className="bg-destructive hover:bg-destructive/90 text-white">
          <Plus className="w-4 h-4 mr-2" />
          Создать поток
        </Button>
      </div>

      <div className="grid gap-4">
        {streams.map((stream, index) => {
          const isCurrent = index === 0 && stream.is_active; // First active stream is current
          
          return (
            <Card key={stream.id} className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-lg">{stream.name}</h3>
                    {getStatusBadge(stream.is_active, isCurrent)}
                  </div>
                  
                  <p className="text-muted-foreground mb-3">
                    {stream.description || 'Без описания'}
                  </p>
                  
                  <div className="flex items-center gap-6 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {formatDateRange(stream.start_date, stream.end_date)}
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {stream.participant_count || 0} участников
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  {/* Toggle Switch */}
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={stream.is_active}
                      onCheckedChange={() => toggleStreamStatus(stream.id, stream.is_active)}
                    />
                    <div className="w-6 h-6 bg-muted rounded-full flex items-center justify-center">
                      <div className="w-3 h-3 bg-white rounded-full" />
                    </div>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm">
                      <Edit className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  {/* Special Button for Current Stream */}
                  {isCurrent && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-red-600 border-red-200 hover:bg-red-50"
                    >
                      Сделать текущим
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {streams.length === 0 && (
        <Card className="p-8">
          <div className="text-center text-muted-foreground">
            <Calendar className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-semibold mb-2">Нет потоков</h3>
            <p className="text-sm">Создайте первый поток, чтобы начать</p>
          </div>
        </Card>
      )}
    </div>
  );
};