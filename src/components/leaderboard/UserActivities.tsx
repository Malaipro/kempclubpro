import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, CheckCircle, XCircle, Target, Zap, Dumbbell, Book, Shield, Trophy } from 'lucide-react';
import { toast } from 'sonner';

interface Activity {
  id: string;
  type: string;
  category: string;
  points_earned: number;
  verified: boolean;
  created_at: string;
  session_date?: string;
  notes?: string;
}

export const UserActivities: React.FC = () => {
  const { user } = useAuth();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalPoints: 0,
    verifiedCount: 0,
    pendingCount: 0,
    categoryCounts: {} as Record<string, number>
  });

  useEffect(() => {
    if (user) {
      fetchUserActivities();
    }
  }, [user]);

  const fetchUserActivities = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const allActivities: Activity[] = [];

      // Тренировочные сессии
      const { data: trainingSessions } = await supabase
        .from('training_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (trainingSessions) {
        trainingSessions.forEach(session => {
          allActivities.push({
            id: session.id,
            type: 'training',
            category: session.session_type || 'training',
            points_earned: session.points_earned || 0,
            verified: session.verified || false,
            created_at: session.created_at,
            session_date: session.session_date,
            notes: session.notes
          });
        });
      }

      // Тактические сессии
      const { data: tacticalSessions } = await supabase
        .from('tactical_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (tacticalSessions) {
        tacticalSessions.forEach(session => {
          allActivities.push({
            id: session.id,
            type: 'tactical',
            category: 'tactical',
            points_earned: session.points_earned || 0,
            verified: session.verified || false,
            created_at: session.created_at,
            session_date: session.session_date,
            notes: session.notes
          });
        });
      }

      // Лекции
      const { data: lectures } = await supabase
        .from('lectures')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (lectures) {
        lectures.forEach(lecture => {
          allActivities.push({
            id: lecture.id,
            type: 'lecture',
            category: 'theory',
            points_earned: lecture.points_earned || 0,
            verified: lecture.verified || false,
            created_at: lecture.created_at,
            session_date: lecture.lecture_date,
            notes: lecture.notes
          });
        });
      }

      // Домашние задания
      const { data: homework } = await supabase
        .from('homework_submissions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (homework) {
        homework.forEach(hw => {
          allActivities.push({
            id: hw.id,
            type: 'homework',
            category: 'theory',
            points_earned: hw.points_earned || 0,
            verified: hw.verified || false,
            created_at: hw.created_at,
            session_date: hw.submitted_at,
            notes: hw.notes
          });
        });
      }

      // Гонки героев
      const { data: heroRaces } = await supabase
        .from('hero_races')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (heroRaces) {
        heroRaces.forEach(race => {
          allActivities.push({
            id: race.id,
            type: 'hero_race',
            category: 'challenge',
            points_earned: race.points_earned || 0,
            verified: race.verified || false,
            created_at: race.created_at,
            session_date: race.race_date,
            notes: race.notes
          });
        });
      }

      // Краш-тесты
      const { data: crashTests } = await supabase
        .from('crash_tests')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (crashTests) {
        crashTests.forEach(test => {
          allActivities.push({
            id: test.id,
            type: 'crash_test',
            category: 'challenge',
            points_earned: test.points_earned || 0,
            verified: test.verified || false,
            created_at: test.created_at,
            session_date: test.test_date,
            notes: test.notes
          });
        });
      }

      // Аскетические активности
      const { data: asceticActivities } = await supabase
        .from('ascetic_activities')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (asceticActivities) {
        asceticActivities.forEach(activity => {
          allActivities.push({
            id: activity.id,
            type: 'ascetic',
            category: 'challenge',
            points_earned: activity.points_earned || 0,
            verified: activity.verified || false,
            created_at: activity.created_at,
            session_date: activity.completed_at,
            notes: activity.notes
          });
        });
      }

      // Сортируем по дате
      allActivities.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      setActivities(allActivities);

      // Вычисляем статистику
      const totalPoints = allActivities.reduce((sum, activity) => sum + (activity.verified ? activity.points_earned : 0), 0);
      const verifiedCount = allActivities.filter(activity => activity.verified).length;
      const pendingCount = allActivities.filter(activity => !activity.verified).length;
      
      const categoryCounts = allActivities.reduce((counts, activity) => {
        counts[activity.category] = (counts[activity.category] || 0) + 1;
        return counts;
      }, {} as Record<string, number>);

      setStats({
        totalPoints,
        verifiedCount,
        pendingCount,
        categoryCounts
      });

    } catch (error) {
      console.error('Error fetching user activities:', error);
      toast.error('Ошибка загрузки активностей');
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (type: string, category: string) => {
    switch (category) {
      case 'bjj':
        return <Target className="w-4 h-4 text-blue-600" />;
      case 'kickboxing':
        return <Zap className="w-4 h-4 text-red-600" />;
      case 'physical':
      case 'ofp':
        return <Dumbbell className="w-4 h-4 text-green-600" />;
      case 'theory':
        return <Book className="w-4 h-4 text-purple-600" />;
      case 'tactical':
        return <Shield className="w-4 h-4 text-orange-600" />;
      case 'challenge':
        return <Trophy className="w-4 h-4 text-yellow-600" />;
      default:
        return <Calendar className="w-4 h-4 text-gray-600" />;
    }
  };

  const getActivityName = (type: string, category: string) => {
    const names: Record<string, string> = {
      'training': 'Тренировка',
      'tactical': 'Тактическая сессия',
      'lecture': 'Лекция',
      'homework': 'Домашнее задание',
      'hero_race': 'Гонка героев',
      'crash_test': 'Краш-тест',
      'ascetic': 'Аскетическая активность'
    };
    return names[type] || 'Активность';
  };

  const getCategoryName = (category: string) => {
    const names: Record<string, string> = {
      'bjj': 'БЖЖ',
      'kickboxing': 'Кикбоксинг',
      'physical': 'ОФП',
      'ofp': 'ОФП',
      'theory': 'Теория',
      'tactical': 'Тактика',
      'challenge': 'Испытание'
    };
    return names[category] || category;
  };

  if (!user) {
    return (
      <Card className="bg-white border-gray-300">
        <CardContent className="p-6 text-center">
          <p className="text-gray-500">Войдите в систему, чтобы увидеть свои активности</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white border-gray-300">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-gray-900">
          <Calendar className="w-5 h-5 text-kamp-accent" />
          Мои активности
        </CardTitle>
        <div className="flex flex-wrap gap-4 text-sm text-gray-600">
          <div className="flex items-center gap-1">
            <span className="font-semibold">{stats.totalPoints}</span>
            <span>баллов заработано</span>
          </div>
          <div className="flex items-center gap-1">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span>{stats.verifiedCount} подтверждено</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4 text-orange-600" />
            <span>{stats.pendingCount} на проверке</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin w-8 h-8 border-2 border-kamp-accent border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-sm text-gray-500">Загрузка активностей...</p>
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center py-8">
            <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-semibold mb-2">Пока нет активностей</h3>
            <p className="text-sm text-gray-500">Начните участвовать в тренировках и мероприятиях</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {activities.slice(0, 20).map((activity) => (
              <div
                key={activity.id}
                className="flex items-center justify-between p-3 border border-gray-200 rounded-lg bg-gray-50"
              >
                <div className="flex items-center gap-3">
                  {getActivityIcon(activity.type, activity.category)}
                  <div>
                    <p className="font-medium text-gray-900">
                      {getActivityName(activity.type, activity.category)}
                    </p>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Badge variant="outline" className="text-xs">
                        {getCategoryName(activity.category)}
                      </Badge>
                      <span>
                        {new Date(activity.session_date || activity.created_at).toLocaleDateString('ru-RU')}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-kamp-accent">
                    +{activity.points_earned}
                  </span>
                  {activity.verified ? (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  ) : (
                    <XCircle className="w-4 h-4 text-orange-600" />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};