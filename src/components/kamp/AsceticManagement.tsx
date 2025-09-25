import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Target, CheckCircle, XCircle, Calendar, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AsceticActivity {
  id: string;
  user_id: string;
  activity_type: string;
  duration_minutes: number | null;
  points_earned: number;
  verified: boolean;
  verified_by: string | null;
  completed_at: string;
  notes: string | null;
  created_at: string;
  profiles?: {
    display_name: string | null;
    first_name: string | null;
    last_name: string | null;
  } | null;
}

export const AsceticManagement: React.FC = () => {
  const [asceticActivities, setAsceticActivities] = useState<AsceticActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchAsceticActivities = async () => {
    try {
      const { data, error } = await supabase
        .from('ascetic_activities')
        .select(`
          *,
          profiles:user_id (
            display_name,
            first_name,
            last_name
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAsceticActivities((data as unknown) as AsceticActivity[] || []);
    } catch (error) {
      console.error('Error fetching ascetic activities:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось загрузить список аскез',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAsceticActivities();
  }, []);

  const handleVerification = async (activityId: string, verified: boolean) => {
    try {
      const { error } = await supabase
        .from('ascetic_activities')
        .update({ 
          verified,
          verified_by: verified ? (await supabase.auth.getUser()).data.user?.id : null
        })
        .eq('id', activityId);

      if (error) throw error;
      
      toast({
        title: verified ? 'Аскеза подтверждена' : 'Подтверждение отменено',
        description: 'Статус успешно обновлен',
      });
      
      fetchAsceticActivities();
    } catch (error) {
      console.error('Error updating verification:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось обновить статус подтверждения',
        variant: 'destructive',
      });
    }
  };

  const formatUserName = (activity: AsceticActivity) => {
    const profile = activity.profiles;
    if (profile?.first_name && profile?.last_name) {
      return `${profile.first_name} ${profile.last_name}`;
    }
    return profile?.display_name || 'Неизвестный пользователь';
  };

  const getActivityTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      'cold_shower': 'Холодный душ',
      'meditation': 'Медитация',
      'fasting': 'Голодание',
      'early_wake': 'Ранний подъем',
      'no_phone': 'Без телефона',
      'reading': 'Чтение',
      'exercise': 'Упражнения',
      'other': 'Другое'
    };
    return types[type] || type;
  };

  return (
    <Card className="bg-white border-gray-300">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-gray-900">
          <Target className="w-5 h-5 text-kamp-accent" />
          Управление аскезами
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-pulse">Загрузка аскез...</div>
          </div>
        ) : (
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Участник</TableHead>
                  <TableHead>Тип аскезы</TableHead>
                  <TableHead>Длительность</TableHead>
                  <TableHead>Очки</TableHead>
                  <TableHead>Дата выполнения</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {asceticActivities.map((activity) => (
                  <TableRow key={activity.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-400" />
                        <div className="font-medium">{formatUserName(activity)}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {getActivityTypeLabel(activity.activity_type)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {activity.duration_minutes ? `${activity.duration_minutes} мин` : '—'}
                    </TableCell>
                    <TableCell>
                      <Badge>{activity.points_earned}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Calendar className="w-3 h-3" />
                        {new Date(activity.completed_at).toLocaleDateString('ru-RU')}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={activity.verified ? "default" : "secondary"}>
                        {activity.verified ? 'Подтверждено' : 'Ожидает подтверждения'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {!activity.verified ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleVerification(activity.id, true)}
                            className="text-green-600"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleVerification(activity.id, false)}
                            className="text-red-600"
                          >
                            <XCircle className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {asceticActivities.length === 0 && !loading && (
          <div className="text-center py-8 text-gray-500">
            Нет записей об аскезах
          </div>
        )}
      </CardContent>
    </Card>
  );
};