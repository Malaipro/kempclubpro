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
    <div className="bg-gray-900 p-6 rounded-lg">
      <div className="flex items-center gap-2 mb-6">
        <Target className="w-5 h-5 text-destructive" />
        <h2 className="text-xl font-semibold text-destructive">Управление аскезами</h2>
      </div>
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-pulse text-gray-400">Загрузка аскез...</div>
        </div>
      ) : (
        <div className="bg-gray-800 border border-gray-700 rounded-lg">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-gray-700">
                <TableHead className="text-gray-300">Участник</TableHead>
                <TableHead className="text-gray-300">Тип аскезы</TableHead>
                <TableHead className="text-gray-300">Длительность</TableHead>
                <TableHead className="text-gray-300">Очки</TableHead>
                <TableHead className="text-gray-300">Дата выполнения</TableHead>
                <TableHead className="text-gray-300">Статус</TableHead>
                <TableHead className="text-gray-300">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {asceticActivities.map((activity) => (
                <TableRow key={activity.id} className="border-b border-gray-700">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-400" />
                      <div className="font-medium text-white">{formatUserName(activity)}</div>
                    </div>
                  </TableCell>
                  <TableCell className="text-gray-300">
                    <Badge variant="outline" className="border-gray-600 text-gray-300">
                      {getActivityTypeLabel(activity.activity_type)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-gray-300">
                    {activity.duration_minutes ? `${activity.duration_minutes} мин` : '—'}
                  </TableCell>
                  <TableCell className="text-gray-300">
                    <Badge className="bg-destructive text-white">{activity.points_earned}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm text-gray-300">
                      <Calendar className="w-3 h-3" />
                      {new Date(activity.completed_at).toLocaleDateString('ru-RU')}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={activity.verified ? "default" : "secondary"} className={activity.verified ? "bg-green-600 text-white" : "bg-gray-600 text-white"}>
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
                          className="border-green-600 text-green-400 hover:bg-green-600 hover:text-white"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleVerification(activity.id, false)}
                          className="border-red-600 text-red-400 hover:bg-red-600 hover:text-white"
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
        <div className="text-center py-8 text-gray-400">
          Нет записей об аскезах
        </div>
      )}
    </div>
  );
};