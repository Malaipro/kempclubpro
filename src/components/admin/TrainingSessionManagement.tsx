import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { CalendarIcon, Activity, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface Profile {
  user_id: string;
  display_name: string;
  first_name: string;
  last_name: string;
}

export const TrainingSessionManagement: React.FC = () => {
  const { toast } = useToast();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [sessionType, setSessionType] = useState<string>('bjj');
  const [activityType, setActivityType] = useState<string>('bjj');
  const [sessionDate, setSessionDate] = useState<Date>(new Date());
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingProfiles, setLoadingProfiles] = useState(true);

  useEffect(() => {
    loadProfiles();
  }, []);

  useEffect(() => {
    // Синхронизируем activity_type с session_type
    setActivityType(sessionType);
  }, [sessionType]);

  const loadProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, display_name, first_name, last_name')
        .order('display_name');

      if (error) throw error;
      setProfiles(data || []);
    } catch (error) {
      console.error('Error loading profiles:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось загрузить участников',
        variant: 'destructive',
      });
    } finally {
      setLoadingProfiles(false);
    }
  };

  const getPointsForType = (type: string): number => {
    return 1; // Все тренировки дают 1 балл
  };

  const handleSubmit = async () => {
    if (!selectedUserId) {
      toast({
        title: 'Ошибка',
        description: 'Выберите участника',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Пользователь не авторизован');
      }

      const points = getPointsForType(sessionType);

      const { error } = await supabase
        .from('training_sessions')
        .insert([{
          user_id: selectedUserId,
          session_type: sessionType,
          activity_type: activityType,
          session_date: sessionDate.toISOString(),
          points_earned: points,
          verified: true,
          notes: notes || null,
        }]);

      if (error) throw error;

      toast({
        title: 'Успешно',
        description: 'Тренировка добавлена',
      });

      // Сброс формы
      setSelectedUserId('');
      setSessionType('bjj');
      setActivityType('bjj');
      setSessionDate(new Date());
      setNotes('');

    } catch (error: any) {
      console.error('Error adding training session:', error);
      toast({
        title: 'Ошибка',
        description: error.message || 'Не удалось добавить тренировку',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (loadingProfiles) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-kamp-accent" />
          Добавить тренировку
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>Участник</Label>
          <Select value={selectedUserId} onValueChange={setSelectedUserId}>
            <SelectTrigger>
              <SelectValue placeholder="Выберите участника" />
            </SelectTrigger>
            <SelectContent>
              {profiles.map((profile) => (
                <SelectItem key={profile.user_id} value={profile.user_id}>
                  {profile.display_name || `${profile.first_name} ${profile.last_name}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Тип тренировки</Label>
          <Select value={sessionType} onValueChange={setSessionType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="bjj">БЖЖ (1 балл)</SelectItem>
              <SelectItem value="kickboxing">Кикбоксинг (1 балл)</SelectItem>
              <SelectItem value="ofp">ОФП (1 балл)</SelectItem>
              <SelectItem value="theory">Теория (1 балл)</SelectItem>
              <SelectItem value="tactics">Тактика (1 балл)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Дата тренировки</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start text-left font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(sessionDate, "dd MMMM yyyy", { locale: ru })}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-white border border-gray-300 shadow-lg z-[9999]" align="start">
              <Calendar
                mode="single"
                selected={sessionDate}
                onSelect={(date) => date && setSessionDate(date)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        <div>
          <Label>Примечание</Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Дополнительная информация..."
            rows={3}
          />
        </div>

        <Button
          onClick={handleSubmit}
          disabled={loading || !selectedUserId}
          className="w-full bg-kamp-accent hover:bg-red-600 text-white font-bold"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Добавляю...
            </>
          ) : (
            'Добавить тренировку'
          )}
        </Button>
      </CardContent>
    </Card>
  );
};
