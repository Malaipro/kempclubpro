import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Users, CheckCircle, Clock, Target, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface Habit {
  id: string;
  user_id: string;
  habit_name: string;
  habit_type: string;
  description?: string;
  start_date: string;
  end_date?: string;
  target_days: number;
  completed_days: number;
  is_completed: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  participant_name?: string;
}

export const HabitsManagement: React.FC = () => {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  const { toast } = useToast();

  useEffect(() => {
    loadHabits();
  }, []);

  const loadHabits = async () => {
    try {
      setLoading(true);
      
      const { data: habitsData, error } = await supabase
        .from('participant_habits')
        .select(`
          *
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Получаем информацию об участниках отдельно
      const userIds = [...new Set((habitsData || []).map(habit => habit.user_id))];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, display_name, first_name, last_name')
        .in('user_id', userIds);

      const profilesMap = new Map(
        (profilesData || []).map(profile => [profile.user_id, profile])
      );

      const formattedHabits = (habitsData || []).map(habit => {
        const profile = profilesMap.get(habit.user_id);
        return {
          ...habit,
          participant_name: profile?.display_name || 
            `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || 
            'Неизвестный участник'
        };
      });

      setHabits(formattedHabits);
    } catch (error) {
      console.error('Error loading habits:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить привычки",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredHabits = habits.filter(habit => {
    if (filter === 'active') return habit.is_active && !habit.is_completed;
    if (filter === 'completed') return habit.is_completed;
    return true;
  });

  const getStats = () => {
    const total = habits.length;
    const active = habits.filter(h => h.is_active && !h.is_completed).length;
    const completed = habits.filter(h => h.is_completed).length;
    const ascetic = habits.filter(h => h.habit_type === 'ascetic').length;

    return { total, active, completed, ascetic };
  };

  const stats = getStats();

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-pulse">Загрузка привычек...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Управление привычками</h2>
          <p className="text-muted-foreground">
            Отслеживание привычек и аскез участников
          </p>
        </div>
        <Button onClick={loadHabits} variant="outline">
          Обновить
        </Button>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="flex items-center p-6">
            <Users className="w-8 h-8 text-blue-600 mr-3" />
            <div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-sm text-muted-foreground">Всего привычек</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-6">
            <Clock className="w-8 h-8 text-orange-600 mr-3" />
            <div>
              <p className="text-2xl font-bold">{stats.active}</p>
              <p className="text-sm text-muted-foreground">Активных</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-6">
            <CheckCircle className="w-8 h-8 text-green-600 mr-3" />
            <div>
              <p className="text-2xl font-bold">{stats.completed}</p>
              <p className="text-sm text-muted-foreground">Выполнено</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-6">
            <Zap className="w-8 h-8 text-red-600 mr-3" />
            <div>
              <p className="text-2xl font-bold">{stats.ascetic}</p>
              <p className="text-sm text-muted-foreground">Аскез</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Фильтры */}
      <div className="flex space-x-2">
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          onClick={() => setFilter('all')}
        >
          Все ({habits.length})
        </Button>
        <Button
          variant={filter === 'active' ? 'default' : 'outline'}
          onClick={() => setFilter('active')}
        >
          Активные ({stats.active})
        </Button>
        <Button
          variant={filter === 'completed' ? 'default' : 'outline'}
          onClick={() => setFilter('completed')}
        >
          Выполненные ({stats.completed})
        </Button>
      </div>

      {/* Список привычек */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredHabits.map((habit) => {
          const progressPercentage = (habit.completed_days / habit.target_days) * 100;
          
          return (
            <Card key={habit.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{habit.habit_name}</CardTitle>
                  <div className="flex items-center space-x-2">
                    <Badge 
                      variant={habit.habit_type === 'ascetic' ? 'destructive' : 'default'}
                    >
                      {habit.habit_type === 'ascetic' ? 'Аскеза' : 'Привычка'}
                    </Badge>
                    {habit.is_completed && (
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Выполнено
                      </Badge>
                    )}
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Участник: {habit.participant_name}
                </p>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {habit.description && (
                  <p className="text-sm text-gray-600">{habit.description}</p>
                )}
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Прогресс</span>
                    <span className="font-medium">
                      {habit.completed_days}/{habit.target_days} дней
                    </span>
                  </div>
                  <Progress value={progressPercentage} className="h-2" />
                  <div className="text-xs text-gray-500 text-right">
                    {Math.round(progressPercentage)}% выполнено
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>Начало: {format(new Date(habit.start_date), "dd.MM.yyyy")}</span>
                  <span>
                    Создано: {format(new Date(habit.created_at), "dd.MM.yyyy")}
                  </span>
                </div>

                {!habit.is_active && (
                  <Badge variant="outline" className="w-full justify-center">
                    Неактивная привычка
                  </Badge>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredHabits.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <Target className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Привычки не найдены</h3>
            <p className="text-muted-foreground">
              {filter === 'all' 
                ? 'Участники еще не добавили привычки'
                : `Нет привычек в категории "${filter === 'active' ? 'активные' : 'выполненные'}"`
              }
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};