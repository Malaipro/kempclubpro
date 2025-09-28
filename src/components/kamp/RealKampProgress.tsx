import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Trophy, Target, Activity, Zap, Users, Calendar, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface UserStats {
  totalPoints: number;
  rank: number;
  trainingsSessions: number;
  asceticActivities: number;
  cooperTestsCompleted: number;
  monthlyGoal: number;
  monthlyProgress: number;
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  badge_type: string;
  icon_name: string;
  icon_color: string;
  completed: boolean;
  progress: number;
}

export const RealKampProgress: React.FC = () => {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    loadUserStats();
    loadAchievements();
  }, [user]);

  const loadUserStats = async () => {
    if (!user) return;

    try {
      // Получаем данные из leaderboard
      const { data: leaderboardData } = await supabase
        .from('leaderboard')
        .select('*')
        .eq('user_id', user.id)
        .single();

      // Получаем количество тренировочных сессий
      const { count: trainingsCount } = await supabase
        .from('training_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('verified', true);

      // Получаем количество аскетических активностей
      const { count: asceticCount } = await supabase
        .from('ascetic_activities')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('verified', true);

      // Получаем количество тестов Купера
      const { count: cooperCount } = await supabase
        .from('cooper_test_results')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      const currentMonthPoints = leaderboardData?.monthly_points || 0;
      const monthlyGoal = 50; // Цель на месяц

      setStats({
        totalPoints: leaderboardData?.total_points || 0,
        rank: leaderboardData?.rank_position || 0,
        trainingsSessions: trainingsCount || 0,
        asceticActivities: asceticCount || 0,
        cooperTestsCompleted: cooperCount || 0,
        monthlyGoal,
        monthlyProgress: (currentMonthPoints / monthlyGoal) * 100
      });
    } catch (error) {
      console.error('Error loading user stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAchievements = async () => {
    if (!user) return;

    try {
      // Получаем все достижения
      const { data: allAchievements } = await supabase
        .from('achievements')
        .select('*')
        .eq('is_active', true);

      // Получаем достижения пользователя
      const { data: userAchievements } = await supabase
        .from('user_achievements')
        .select('*')
        .eq('user_id', user.id);

      // Объединяем данные
      const achievementsWithProgress = (allAchievements || []).map(achievement => ({
        ...achievement,
        completed: userAchievements?.some(ua => ua.achievement_id === achievement.id && ua.is_completed) || false,
        progress: userAchievements?.find(ua => ua.achievement_id === achievement.id)?.progress || 0
      }));

      setAchievements(achievementsWithProgress);
    } catch (error) {
      console.error('Error loading achievements:', error);
    }
  };

  if (loading) {
    return (
      <Card className="kamp-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-kamp-accent">
            <Trophy className="w-5 h-5" />
            Прогресс КЭМП
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="animate-pulse">Загрузка прогресса...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!stats) {
    return (
      <Card className="kamp-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-kamp-accent">
            <Trophy className="w-5 h-5" />
            Прогресс КЭМП
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-gray-400 py-8">
            <Trophy className="w-16 h-16 mx-auto mb-4 text-kamp-accent/50" />
            <h3 className="text-lg font-semibold mb-2">Начните свой путь</h3>
            <p className="text-sm">
              Участвуйте в тренировках и активностях, чтобы увидеть прогресс
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="kamp-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-kamp-accent">
          <Trophy className="w-5 h-5" />
          Прогресс КЭМП
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Рейтинг - Главная информация */}
        <div className="text-center p-6 bg-gradient-to-r from-kamp-accent/10 to-kamp-accent/5 rounded-lg border border-kamp-accent/20 mb-6">
          <div className="text-4xl font-bold text-kamp-accent mb-2">#{stats.rank || '—'}</div>
          <div className="text-lg font-semibold text-gray-800 mb-1">Ваше место в рейтинге</div>
          <div className="text-2xl font-bold text-kamp-accent">{stats.totalPoints} баллов</div>
        </div>

        {/* Детализированная статистика */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-kamp-accent">{stats.trainingsSessions}</div>
            <div className="text-sm text-gray-600">Тренировки</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-kamp-accent">{stats.cooperTestsCompleted}</div>
            <div className="text-sm text-gray-600">Тесты Купера</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-kamp-accent">{stats.asceticActivities}</div>
            <div className="text-sm text-gray-600">Аскезы</div>
          </div>
        </div>

        {/* Прогресс за месяц */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Прогресс за месяц</span>
            <span className="text-sm text-gray-600">
              {Math.round(stats.monthlyProgress)}% от цели
            </span>
          </div>
          <Progress value={stats.monthlyProgress} className="h-2" />
          <div className="text-xs text-gray-500">
            Цель: {stats.monthlyGoal} баллов в месяц
          </div>
        </div>

        {/* Последние достижения */}
        {achievements.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-semibold text-gray-900 flex items-center gap-2">
              <Target className="w-4 h-4 text-kamp-accent" />
              Достижения
            </h4>
            <div className="grid grid-cols-1 gap-2">
              {achievements.slice(0, 3).map((achievement) => (
                <div 
                  key={achievement.id}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    achievement.completed 
                      ? 'bg-green-50 border-green-200' 
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div 
                      className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        achievement.completed ? 'bg-green-100' : 'bg-gray-100'
                      }`}
                    >
                      <Trophy 
                        className={`w-4 h-4 ${
                          achievement.completed ? 'text-green-600' : 'text-gray-400'
                        }`} 
                      />
                    </div>
                    <div>
                      <div className="text-sm font-medium">{achievement.name}</div>
                      <div className="text-xs text-gray-600 line-clamp-1">
                        {achievement.description}
                      </div>
                    </div>
                  </div>
                  {achievement.completed ? (
                    <Badge className="bg-green-100 text-green-800 text-xs">
                      Выполнено
                    </Badge>
                  ) : (
                    <div className="text-xs text-gray-500">
                      {achievement.progress}%
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Активности */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t">
          <div className="text-center">
            <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg mx-auto mb-2">
              <Activity className="w-6 h-6 text-blue-600" />
            </div>
            <div className="text-lg font-semibold">{stats.asceticActivities}</div>
            <div className="text-xs text-gray-600">Аскезы</div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center w-12 h-12 bg-purple-100 rounded-lg mx-auto mb-2">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
            <div className="text-lg font-semibold">
              {stats.totalPoints > 0 ? '+' + Math.round(stats.totalPoints * 0.1) : '0'}
            </div>
            <div className="text-xs text-gray-600">Рост за неделю</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};