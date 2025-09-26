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
import { Target, CheckCircle, XCircle, Calendar, User, Plus } from 'lucide-react';
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

interface CreateAsceticForm {
  user_id: string;
  activity_type: string;
  challenge_name: string;
  duration_minutes: number;
  points_earned: number;
  notes: string;
}

export const AsceticManagement: React.FC = () => {
  const [asceticActivities, setAsceticActivities] = useState<AsceticActivity[]>([]);
  const [participants, setParticipants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState<CreateAsceticForm>({
    user_id: '',
    activity_type: '',
    challenge_name: '',
    duration_minutes: 0,
    points_earned: 1,
    notes: '',
  });
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
    fetchAsceticActivities();
    fetchParticipants();
  }, []);

  const handleCreateAscetic = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.user_id || !formData.activity_type || !formData.challenge_name) {
      toast({
        title: 'Ошибка',
        description: 'Заполните все обязательные поля',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('ascetic_activities')
        .insert({
          user_id: formData.user_id,
          activity_type: formData.activity_type,
          challenge_name: formData.challenge_name,
          duration_minutes: formData.duration_minutes || null,
          points_earned: formData.points_earned,
          notes: formData.notes || null,
          verified: false,
          completed_at: new Date().toISOString(),
        });

      if (error) throw error;

      toast({
        title: 'Успешно',
        description: 'Аскеза создана',
      });

      setDialogOpen(false);
      setFormData({
        user_id: '',
        activity_type: '',
        challenge_name: '',
        duration_minutes: 0,
        points_earned: 1,
        notes: '',
      });
      fetchAsceticActivities();
    } catch (error) {
      console.error('Error creating ascetic:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось создать аскезу',
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
              <DialogTitle className="text-destructive">Создать новую аскезу</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateAscetic} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="participant" className="text-gray-300">Участник *</Label>
                <Select value={formData.user_id} onValueChange={(value) => setFormData({...formData, user_id: value})}>
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
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
              </div>

              <div className="space-y-2">
                <Label htmlFor="activity_type" className="text-gray-300">Тип аскезы *</Label>
                <Select value={formData.activity_type} onValueChange={(value) => setFormData({...formData, activity_type: value})}>
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
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
              </div>

              <div className="space-y-2">
                <Label htmlFor="challenge_name" className="text-gray-300">Название аскезы *</Label>
                <Input
                  id="challenge_name"
                  value={formData.challenge_name}
                  onChange={(e) => setFormData({...formData, challenge_name: e.target.value})}
                  className="bg-gray-800 border-gray-700 text-white"
                  placeholder="Например: 21 день холодного душа"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="duration" className="text-gray-300">Длительность (мин)</Label>
                  <Input
                    id="duration"
                    type="number"
                    value={formData.duration_minutes}
                    onChange={(e) => setFormData({...formData, duration_minutes: parseInt(e.target.value) || 0})}
                    className="bg-gray-800 border-gray-700 text-white"
                    placeholder="0"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="points" className="text-gray-300">Очки</Label>
                  <Input
                    id="points"
                    type="number"
                    value={formData.points_earned}
                    onChange={(e) => setFormData({...formData, points_earned: parseInt(e.target.value) || 1})}
                    className="bg-gray-800 border-gray-700 text-white"
                    min="1"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes" className="text-gray-300">Заметки</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  className="bg-gray-800 border-gray-700 text-white"
                  placeholder="Дополнительные заметки..."
                  rows={3}
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit" className="kamp-button-primary flex-1">
                  Создать аскезу
                </Button>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="border-gray-600 text-gray-300">
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