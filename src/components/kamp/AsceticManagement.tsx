import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Target, CheckCircle, XCircle, Calendar, User, Plus, Edit, Trash2, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useRole } from '@/hooks/useRole';
import { z } from 'zod';

interface AsceticActivity {
  id: string;
  user_id: string;
  activity_type: string;
  challenge_name?: string | null;
  duration_minutes: number | null;
  points_earned: number;
  verified: boolean;
  verified_by: string | null;
  completed_at: string;
  notes: string | null;
  created_at: string;
  challenge_duration: number;
  completion_percentage: number;
  profiles?: {
    display_name: string | null;
    first_name: string | null;
    last_name: string | null;
  } | null;
}

interface CreateAsceticForm {
  user_id: string;
  activity_type: string;
  challenge_name: string;
  duration_minutes: number;
  points_earned: number;
  notes: string;
}

const asceticSchema = z.object({
  user_id: z.string().uuid('Выберите участника'),
  activity_type: z.string().min(1, 'Выберите тип аскезы'),
  challenge_name: z.string().min(1, 'Введите название аскезы').max(200, 'Название слишком длинное'),
  duration_minutes: z.number().min(0, 'Длительность не может быть отрицательной').max(1440, 'Максимум 24 часа'),
  points_earned: z.number().min(1, 'Минимум 1 очко').max(100, 'Максимум 100 очков'),
  notes: z.string().max(500, 'Заметки слишком длинные').optional()
});

export const AsceticManagement: React.FC = () => {
  const [asceticActivities, setAsceticActivities] = useState<AsceticActivity[]>([]);
  const [participants, setParticipants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAscetic, setEditingAscetic] = useState<AsceticActivity | null>(null);
  const [formData, setFormData] = useState<CreateAsceticForm>({
    user_id: '',
    activity_type: '',
    challenge_name: '',
    duration_minutes: 0,
    points_earned: 1,
    notes: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();
  const { isAdmin, isSuperAdmin, loading: roleLoading } = useRole();

  const fetchAsceticActivities = async () => {
    if (!isAdmin && !isSuperAdmin) {
      setLoading(false);
      return;
    }
    
    try {
      const { data: activities, error } = await supabase
        .from('ascetic_activities')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Получаем профили отдельно
      const userIds = [...new Set(activities?.map(a => a.user_id) || [])];
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, display_name, first_name, last_name')
        .in('user_id', userIds);

      if (profilesError) throw profilesError;

      // Соединяем данные
      const activitiesWithProfiles = activities?.map(activity => {
        const profile = profiles?.find(p => p.user_id === activity.user_id);
        return {
          ...activity,
          profiles: profile ? {
            display_name: profile.display_name,
            first_name: profile.first_name,
            last_name: profile.last_name
          } : null
        };
      }) || [];

      setAsceticActivities(activitiesWithProfiles);
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

  const fetchParticipants = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, user_id, display_name, first_name, last_name')
        .order('display_name', { ascending: true });

      if (error) throw error;
      setParticipants(data || []);
    } catch (error) {
      console.error('Error fetching participants:', error);
    }
  };

  useEffect(() => {
    if (!roleLoading) {
      fetchAsceticActivities();
      fetchParticipants();
    }
  }, [isAdmin, isSuperAdmin, roleLoading]);

  const handleCreateAscetic = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    
    // Validate form data
    try {
      const validatedData = asceticSchema.parse({
        user_id: formData.user_id,
        activity_type: formData.activity_type,
        challenge_name: formData.challenge_name,
        duration_minutes: formData.duration_minutes,
        points_earned: formData.points_earned,
        notes: formData.notes
      });

      const asceticData = {
        user_id: validatedData.user_id,
        activity_type: validatedData.activity_type,
        challenge_name: validatedData.challenge_name,
        duration_minutes: validatedData.duration_minutes || null,
        points_earned: validatedData.points_earned,
        notes: validatedData.notes || null,
        verified: false,
        completed_at: new Date().toISOString(),
      };

      if (editingAscetic) {
        const { error } = await supabase
          .from('ascetic_activities')
          .update(asceticData)
          .eq('id', editingAscetic.id);

        if (error) throw error;

        toast({
          title: 'Успешно',
          description: 'Аскеза обновлена',
        });
      } else {
        const { error } = await supabase
          .from('ascetic_activities')
          .insert(asceticData);

        if (error) throw error;

        toast({
          title: 'Успешно',
          description: 'Аскеза создана',
        });
      }

      setDialogOpen(false);
      setEditingAscetic(null);
      resetForm();
      fetchAsceticActivities();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        error.issues.forEach((issue) => {
          if (issue.path[0]) {
            fieldErrors[issue.path[0] as string] = issue.message;
          }
        });
        setErrors(fieldErrors);
        return;
      }
      
      console.error('Error saving ascetic:', error);
      toast({
        title: 'Ошибка',
        description: editingAscetic ? 'Не удалось обновить аскезу' : 'Не удалось создать аскезу',
        variant: 'destructive',
      });
    }
  };

  const resetForm = () => {
    setFormData({
      user_id: '',
      activity_type: '',
      challenge_name: '',
      duration_minutes: 0,
      points_earned: 1,
      notes: '',
    });
    setErrors({});
  };

  const handleEditAscetic = (ascetic: AsceticActivity) => {
    setEditingAscetic(ascetic);
    setFormData({
      user_id: ascetic.user_id,
      activity_type: ascetic.activity_type,
      challenge_name: ascetic.challenge_name || '',
      duration_minutes: ascetic.duration_minutes || 0,
      points_earned: ascetic.points_earned,
      notes: ascetic.notes || '',
    });
    setErrors({});
    setDialogOpen(true);
  };

  const handleDeleteAscetic = async (asceticId: string) => {
    if (!confirm('Вы уверены, что хотите удалить эту аскезу?')) return;

    try {
      const { error } = await supabase
        .from('ascetic_activities')
        .delete()
        .eq('id', asceticId);

      if (error) throw error;

      toast({
        title: 'Успешно',
        description: 'Аскеза удалена',
      });

      fetchAsceticActivities();
    } catch (error) {
      console.error('Error deleting ascetic:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось удалить аскезу',
        variant: 'destructive',
      });
    }
  };

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

  const formatParticipantName = (participant: any) => {
    if (participant.first_name && participant.last_name) {
      return `${participant.first_name} ${participant.last_name}`;
    }
    return participant.display_name || 'Неизвестный пользователь';
  };

  const setupSuperAdmin = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('setup-super-admin');
      
      if (error) throw error;
      
      toast({
        title: 'Успешно',
        description: 'Супер-админ настроен',
      });
      
      // Refresh the page to update role
      window.location.reload();
    } catch (error) {
      console.error('Error setting up super admin:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось настроить супер-админа',
        variant: 'destructive',
      });
    }
  };

  if (roleLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-pulse text-gray-400">Загрузка...</div>
      </div>
    );
  }

  if (!isAdmin && !isSuperAdmin) {
    return (
      <div className="bg-gray-900 p-6 rounded-lg">
        <div className="text-center py-8">
          <AlertCircle className="w-16 h-16 mx-auto mb-4 text-yellow-500" />
          <h3 className="text-lg font-semibold text-white mb-2">Доступ ограничен</h3>
          <p className="text-gray-400 mb-4">
            Управление аскезами доступно только администраторам
          </p>
          <Button onClick={setupSuperAdmin} className="kamp-button-primary">
            Настроить супер-админа
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 p-6 rounded-lg">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-destructive" />
          <h2 className="text-xl font-semibold text-destructive">Управление аскезами</h2>
        </div>
        
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="kamp-button-primary">
              <Plus className="w-4 h-4 mr-2" />
              Создать аскезу
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] bg-gray-900 border-gray-700">
            <DialogHeader>
              <DialogTitle className="text-destructive">
                {editingAscetic ? 'Редактировать аскезу' : 'Создать новую аскезу'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateAscetic} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="participant" className="text-gray-300">Участник *</Label>
                <Select value={formData.user_id} onValueChange={(value) => setFormData({...formData, user_id: value})}>
                  <SelectTrigger className={`bg-gray-800 border-gray-700 text-white ${errors.user_id ? 'border-red-500' : ''}`}>
                    <SelectValue placeholder="Выберите участника" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    {participants.map((participant) => (
                      <SelectItem key={participant.user_id} value={participant.user_id} className="text-white">
                        {formatParticipantName(participant)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.user_id && <p className="text-red-400 text-sm">{errors.user_id}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="activity_type" className="text-gray-300">Тип аскезы *</Label>
                <Select value={formData.activity_type} onValueChange={(value) => setFormData({...formData, activity_type: value})}>
                  <SelectTrigger className={`bg-gray-800 border-gray-700 text-white ${errors.activity_type ? 'border-red-500' : ''}`}>
                    <SelectValue placeholder="Выберите тип аскезы" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    <SelectItem value="cold_shower" className="text-white">Холодный душ</SelectItem>
                    <SelectItem value="meditation" className="text-white">Медитация</SelectItem>
                    <SelectItem value="fasting" className="text-white">Голодание</SelectItem>
                    <SelectItem value="early_wake" className="text-white">Ранний подъем</SelectItem>
                    <SelectItem value="no_phone" className="text-white">Без телефона</SelectItem>
                    <SelectItem value="reading" className="text-white">Чтение</SelectItem>
                    <SelectItem value="exercise" className="text-white">Упражнения</SelectItem>
                    <SelectItem value="other" className="text-white">Другое</SelectItem>
                  </SelectContent>
                </Select>
                {errors.activity_type && <p className="text-red-400 text-sm">{errors.activity_type}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="challenge_name" className="text-gray-300">Название аскезы *</Label>
                <Input
                  id="challenge_name"
                  value={formData.challenge_name}
                  onChange={(e) => setFormData({...formData, challenge_name: e.target.value})}
                  className={`bg-gray-800 border-gray-700 text-white ${errors.challenge_name ? 'border-red-500' : ''}`}
                  placeholder="Например: 21 день холодного душа"
                />
                {errors.challenge_name && <p className="text-red-400 text-sm">{errors.challenge_name}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="duration" className="text-gray-300">Длительность (мин)</Label>
                  <Input
                    id="duration"
                    type="number"
                    value={formData.duration_minutes}
                    onChange={(e) => setFormData({...formData, duration_minutes: parseInt(e.target.value) || 0})}
                    className={`bg-gray-800 border-gray-700 text-white ${errors.duration_minutes ? 'border-red-500' : ''}`}
                    placeholder="0"
                  />
                  {errors.duration_minutes && <p className="text-red-400 text-sm">{errors.duration_minutes}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="points" className="text-gray-300">Очки</Label>
                  <Input
                    id="points"
                    type="number"
                    value={formData.points_earned}
                    onChange={(e) => setFormData({...formData, points_earned: parseInt(e.target.value) || 1})}
                    className={`bg-gray-800 border-gray-700 text-white ${errors.points_earned ? 'border-red-500' : ''}`}
                    min="1"
                  />
                  {errors.points_earned && <p className="text-red-400 text-sm">{errors.points_earned}</p>}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes" className="text-gray-300">Заметки</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  className={`bg-gray-800 border-gray-700 text-white ${errors.notes ? 'border-red-500' : ''}`}
                  placeholder="Дополнительные заметки..."
                  rows={3}
                />
                {errors.notes && <p className="text-red-400 text-sm">{errors.notes}</p>}
              </div>

              <div className="flex gap-2">
                <Button type="submit" className="kamp-button-primary flex-1">
                  {editingAscetic ? 'Сохранить изменения' : 'Создать аскезу'}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setDialogOpen(false);
                    setEditingAscetic(null);
                    resetForm();
                  }} 
                  className="border-gray-600 text-gray-300"
                >
                  Отмена
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
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
                <TableHead className="text-gray-300">Название</TableHead>
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
                    <div className="font-medium">{activity.challenge_name || '—'}</div>
                    {activity.notes && (
                      <div className="text-sm text-gray-400 mt-1">{activity.notes}</div>
                    )}
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
                          title="Подтвердить"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleVerification(activity.id, false)}
                          className="border-red-600 text-red-400 hover:bg-red-600 hover:text-white"
                          title="Отменить подтверждение"
                        >
                          <XCircle className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditAscetic(activity)}
                        className="border-blue-600 text-blue-400 hover:bg-blue-600 hover:text-white"
                        title="Редактировать"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteAscetic(activity.id)}
                        className="border-red-600 text-red-400 hover:bg-red-600 hover:text-white"
                        title="Удалить"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
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