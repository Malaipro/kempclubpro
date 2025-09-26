import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Activity, 
  Users, 
  Zap,
  CheckCircle,
  Calendar
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface ParticipantStats {
  id: string;
  first_name: string;
  last_name: string;
  display_name: string;
  weight_before_stream?: number;
  weight_after_stream?: number;
  stream_start_date?: string;
  stream_end_date?: string;
  active_habits_count: number;
  completed_habits_count: number;
  cooper_improvement?: number;
  latest_cooper_time?: number;
}

interface PublicHabit {
  id: string;
  participant_name: string;
  habit_name: string;
  habit_type: string;
  target_days: number;
  completed_days: number;
  is_completed: boolean;
  start_date: string;
}

interface CooperTestSummary {
  participant_name: string;
  before_time?: number;
  after_time?: number;
  improvement?: number;
  latest_test_date?: string;
}

export const PublicParticipantResults: React.FC = () => {
  const [participantStats, setParticipantStats] = useState<ParticipantStats[]>([]);
  const [publicHabits, setPublicHabits] = useState<PublicHabit[]>([]);
  const [cooperTests, setCooperTests] = useState<CooperTestSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPublicData();
  }, []);

  const loadPublicData = async () => {
    try {
      // Загружаем статистику участников (только утвержденные)
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select(`
          id,
          first_name,
          last_name,
          display_name,
          weight_before_stream,
          weight_after_stream,
          stream_start_date,
          stream_end_date,
          approved
        `)
        .eq('approved', true)
        .order('display_name');

      if (profilesError) throw profilesError;

      // Для каждого участника подсчитываем статистику привычек
      const statsPromises = (profilesData || []).map(async (profile) => {
        // Подсчет активных привычек
        const { count: activeHabitsCount } = await supabase
          .from('participant_habits')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', profile.id)
          .eq('is_active', true);

        // Подсчет выполненных привычек
        const { count: completedHabitsCount } = await supabase
          .from('participant_habits')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', profile.id)
          .eq('is_completed', true);

        // Получаем тесты Купера для расчета улучшения
        const { data: cooperData } = await supabase
          .from('cooper_test_results')
          .select('total_time, test_phase, test_date')
          .eq('user_id', profile.id)
          .order('test_date', { ascending: false });

        let cooper_improvement = undefined;
        let latest_cooper_time = undefined;

        if (cooperData && cooperData.length > 0) {
          const beforeTest = cooperData.find(test => test.test_phase === 'before_stream');
          const afterTest = cooperData.find(test => test.test_phase === 'after_stream');
          
          if (beforeTest && afterTest) {
            cooper_improvement = beforeTest.total_time - afterTest.total_time;
          }
          
          latest_cooper_time = cooperData[0].total_time;
        }

        return {
          ...profile,
          active_habits_count: activeHabitsCount || 0,
          completed_habits_count: completedHabitsCount || 0,
          cooper_improvement,
          latest_cooper_time,
        };
      });

      const stats = await Promise.all(statsPromises);
      setParticipantStats(stats);

      // Загружаем публичные привычки (только активные и недавно выполненные)
      const { data: habitsData, error: habitsError } = await supabase
        .from('participant_habits')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(20);

      if (habitsError) throw habitsError;

      // Получаем имена участников отдельно
      const formattedHabitsPromises = (habitsData || []).map(async (habit) => {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('first_name, last_name, display_name')
          .eq('user_id', habit.user_id)
          .single();

        return {
          id: habit.id,
          participant_name: profileData?.display_name || `${profileData?.first_name} ${profileData?.last_name}` || 'Неизвестный',
          habit_name: habit.habit_name,
          habit_type: habit.habit_type,
          target_days: habit.target_days,
          completed_days: habit.completed_days,
          is_completed: habit.is_completed,
          start_date: habit.start_date,
        };
      });

      const formattedHabits = await Promise.all(formattedHabitsPromises);

      setPublicHabits(formattedHabits);

      // Загружаем сводку тестов Купера
      const cooperSummaryPromises = (profilesData || []).map(async (profile) => {
        const { data: cooperData } = await supabase
          .from('cooper_test_results')
          .select('total_time, test_phase, test_date')
          .eq('user_id', profile.id);

        if (!cooperData || cooperData.length === 0) return null;

        const beforeTest = cooperData.find(test => test.test_phase === 'before_stream');
        const afterTest = cooperData.find(test => test.test_phase === 'after_stream');
        const latestTest = cooperData.sort((a, b) => new Date(b.test_date).getTime() - new Date(a.test_date).getTime())[0];

        let improvement = undefined;
        if (beforeTest && afterTest) {
          improvement = beforeTest.total_time - afterTest.total_time;
        }

        return {
          participant_name: profile.display_name || `${profile.first_name} ${profile.last_name}`,
          before_time: beforeTest?.total_time,
          after_time: afterTest?.total_time,
          improvement,
          latest_test_date: latestTest?.test_date,
        };
      });

      const cooperSummary = (await Promise.all(cooperSummaryPromises)).filter(Boolean) as CooperTestSummary[];
      setCooperTests(cooperSummary);

    } catch (error) {
      console.error('Error loading public data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getWeightChangeStats = () => {
    const participantsWithWeightData = participantStats.filter(
      p => p.weight_before_stream && p.weight_after_stream
    );

    if (participantsWithWeightData.length === 0) return null;

    const totalWeightLoss = participantsWithWeightData.reduce((acc, p) => {
      const diff = p.weight_before_stream! - p.weight_after_stream!;
      return acc + (diff > 0 ? diff : 0);
    }, 0);

    const averageWeightLoss = totalWeightLoss / participantsWithWeightData.length;

    return {
      totalParticipants: participantsWithWeightData.length,
      totalWeightLoss: Math.round(totalWeightLoss * 10) / 10,
      averageWeightLoss: Math.round(averageWeightLoss * 10) / 10,
    };
  };

  const getHabitsStats = () => {
    const totalHabits = participantStats.reduce((acc, p) => acc + p.active_habits_count, 0);
    const totalCompleted = participantStats.reduce((acc, p) => acc + p.completed_habits_count, 0);
    
    return {
      totalHabits,
      totalCompleted,
      completionRate: totalHabits > 0 ? Math.round((totalCompleted / totalHabits) * 100) : 0,
    };
  };

  const getCooperStats = () => {
    const testsWithImprovement = cooperTests.filter(test => test.improvement !== undefined);
    
    if (testsWithImprovement.length === 0) return null;

    const totalImprovement = testsWithImprovement.reduce((acc, test) => acc + (test.improvement || 0), 0);
    const averageImprovement = totalImprovement / testsWithImprovement.length;
    const improvedCount = testsWithImprovement.filter(test => (test.improvement || 0) > 0).length;

    return {
      totalTests: testsWithImprovement.length,
      averageImprovement: Math.round(averageImprovement),
      improvedCount,
      improvementRate: Math.round((improvedCount / testsWithImprovement.length) * 100),
    };
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-pulse">Загрузка результатов участников...</div>
      </div>
    );
  }

  const weightStats = getWeightChangeStats();
  const habitsStats = getHabitsStats();
  const cooperStats = getCooperStats();

  return (
    <section className="kamp-section bg-gray-900">
      <div className="kamp-container">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-white mb-4">Результаты участников</h2>
          <p className="text-gray-300 max-w-2xl mx-auto">
            Отслеживайте прогресс всех участников программы КЭМП в реальном времени
          </p>
        </div>

        {/* Общая статистика */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-400">Участников</p>
                  <p className="text-2xl font-bold text-white">{participantStats.length}</p>
                </div>
                <Users className="w-8 h-8 text-kamp-accent" />
              </div>
            </CardContent>
          </Card>

          {weightStats && (
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-400">Общая потеря веса</p>
                    <p className="text-2xl font-bold text-green-400">{weightStats.totalWeightLoss} кг</p>
                  </div>
                  <TrendingDown className="w-8 h-8 text-green-400" />
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-400">Активных привычек</p>
                  <p className="text-2xl font-bold text-blue-400">{habitsStats.totalHabits}</p>
                </div>
                <Target className="w-8 h-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="participants" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-gray-800">
            <TabsTrigger value="participants" className="text-gray-300 data-[state=active]:text-white">
              Участники
            </TabsTrigger>
            <TabsTrigger value="habits" className="text-gray-300 data-[state=active]:text-white">
              Привычки
            </TabsTrigger>
            <TabsTrigger value="cooper" className="text-gray-300 data-[state=active]:text-white">
              Тесты Купера
            </TabsTrigger>
          </TabsList>

          <TabsContent value="participants" className="mt-6">
            <div className="grid gap-4">
              {participantStats.map((participant) => {
                const weightDiff = participant.weight_before_stream && participant.weight_after_stream
                  ? participant.weight_before_stream - participant.weight_after_stream
                  : null;

                return (
                  <Card key={participant.id} className="bg-gray-800 border-gray-700">
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="font-semibold text-white">{participant.display_name}</h3>
                          <p className="text-sm text-gray-400">
                            {participant.first_name} {participant.last_name}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Badge variant="outline" className="text-blue-400 border-blue-400">
                            {participant.active_habits_count} активных привычек
                          </Badge>
                          <Badge variant="outline" className="text-green-400 border-green-400">
                            {participant.completed_habits_count} выполнено
                          </Badge>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        {weightDiff !== null && (
                          <div className="flex items-center gap-2">
                            {weightDiff > 0 ? (
                              <TrendingDown className="w-4 h-4 text-green-400" />
                            ) : (
                              <TrendingUp className="w-4 h-4 text-red-400" />
                            )}
                            <span className="text-gray-300">
                              Вес: {weightDiff > 0 ? '-' : '+'}{Math.abs(weightDiff).toFixed(1)} кг
                            </span>
                          </div>
                        )}

                        {participant.cooper_improvement !== undefined && (
                          <div className="flex items-center gap-2">
                            <Zap className="w-4 h-4 text-kamp-accent" />
                            <span className="text-gray-300">
                              Купер: {participant.cooper_improvement > 0 ? '-' : '+'}{Math.abs(participant.cooper_improvement)}с
                            </span>
                          </div>
                        )}

                        {participant.stream_start_date && (
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-300">
                              Поток: {format(new Date(participant.stream_start_date), "dd.MM.yyyy")}
                            </span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="habits" className="mt-6">
            <div className="grid gap-4">
              {publicHabits.map((habit) => (
                <Card key={habit.id} className="bg-gray-800 border-gray-700">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="font-semibold text-white">{habit.habit_name}</h3>
                        <p className="text-sm text-gray-400">{habit.participant_name}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={habit.habit_type === 'ascetic' ? 'destructive' : 'default'}>
                          {habit.habit_type === 'ascetic' ? 'Аскеза' : 'Привычка'}
                        </Badge>
                        {habit.is_completed && (
                          <CheckCircle className="w-5 h-5 text-green-400" />
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm text-gray-300">
                        <span>Прогресс</span>
                        <span>{habit.completed_days}/{habit.target_days} дней</span>
                      </div>
                      <Progress 
                        value={(habit.completed_days / habit.target_days) * 100} 
                        className="h-2"
                      />
                    </div>

                    <div className="flex justify-between text-xs text-gray-400 mt-3">
                      <span>Начало: {format(new Date(habit.start_date), "dd.MM.yyyy")}</span>
                      <span>{Math.round((habit.completed_days / habit.target_days) * 100)}% выполнено</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="cooper" className="mt-6">
            {cooperStats && (
              <div className="mb-6">
                <Card className="bg-gray-800 border-gray-700">
                  <CardContent className="pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-sm text-gray-400">Тестов проведено</p>
                        <p className="text-2xl font-bold text-white">{cooperStats.totalTests}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-400">Среднее улучшение</p>
                        <p className="text-2xl font-bold text-green-400">{cooperStats.averageImprovement}с</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-400">Улучшили результат</p>
                        <p className="text-2xl font-bold text-blue-400">{cooperStats.improvementRate}%</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            <div className="grid gap-4">
              {cooperTests.filter(test => test.improvement !== undefined).map((test, index) => (
                <Card key={index} className="bg-gray-800 border-gray-700">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="font-semibold text-white">{test.participant_name}</h3>
                        {test.latest_test_date && (
                          <p className="text-sm text-gray-400">
                            Последний тест: {format(new Date(test.latest_test_date), "dd.MM.yyyy")}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        {test.improvement !== undefined && (
                          <div className="flex items-center gap-2">
                            {test.improvement > 0 ? (
                              <TrendingUp className="w-5 h-5 text-green-400" />
                            ) : (
                              <TrendingDown className="w-5 h-5 text-red-400" />
                            )}
                            <span className={`font-semibold ${test.improvement > 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {test.improvement > 0 ? '-' : '+'}{Math.abs(test.improvement)}с
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      {test.before_time && (
                        <div>
                          <p className="text-gray-400">До потока</p>
                          <p className="font-semibold text-white">{test.before_time}с</p>
                        </div>
                      )}
                      {test.after_time && (
                        <div>
                          <p className="text-gray-400">После потока</p>
                          <p className="font-semibold text-white">{test.after_time}с</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </section>
  );
};