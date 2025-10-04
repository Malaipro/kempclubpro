import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Archive, Award, Trophy, Target, Activity } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface CooperTest {
  test_date: string;
  total_time: number;
  fitness_level: string;
}

interface CrashTest {
  test_date: string;
  test_type: string;
  passed: boolean;
}

interface ArchiveData {
  totalPoints: number;
  cooperTests: CooperTest[];
  crashTests: CrashTest[];
  asceticActivities: number;
}

export const IntensiveArchive: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [archiveData, setArchiveData] = useState<ArchiveData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchArchiveData();
    }
  }, [user]);

  const fetchArchiveData = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Fetch total points from leaderboard
      const { data: leaderboardData } = await supabase
        .from('leaderboard')
        .select('total_points')
        .eq('user_id', user.id)
        .single();

      // Fetch Cooper test results
      const { data: cooperData } = await supabase
        .from('cooper_test_results')
        .select('test_date, total_time, fitness_level')
        .eq('user_id', user.id)
        .order('test_date', { ascending: false });

      // Fetch crash tests
      const { data: crashData } = await supabase
        .from('crash_tests')
        .select('test_date, test_type, passed')
        .eq('user_id', user.id)
        .order('test_date', { ascending: false });

      // Count ascetic activities
      const { count: asceticCount } = await supabase
        .from('ascetic_activities')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('verified', true);

      setArchiveData({
        totalPoints: leaderboardData?.total_points || 0,
        cooperTests: cooperData || [],
        crashTests: crashData || [],
        asceticActivities: asceticCount || 0
      });
    } catch (error) {
      console.error('Error fetching archive data:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось загрузить архив интенсива',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-muted-foreground">Загрузка архива...</div>
        </CardContent>
      </Card>
    );
  }

  if (!archiveData) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-muted-foreground">Нет данных</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Archive className="w-6 h-6 text-destructive" />
          Архив интенсива
        </h1>
        <p className="text-muted-foreground">
          Ваши результаты и достижения из интенсивного потока
        </p>
      </div>

      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-destructive" />
            Общие результаты
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">Всего баллов</div>
            <div className="text-3xl font-bold text-destructive">{archiveData.totalPoints}</div>
          </div>
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">Аскез выполнено</div>
            <div className="text-3xl font-bold">{archiveData.asceticActivities}</div>
          </div>
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">Краш-тестов</div>
            <div className="text-3xl font-bold">{archiveData.crashTests.length}</div>
          </div>
        </CardContent>
      </Card>

      {/* Cooper Tests */}
      {archiveData.cooperTests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-destructive" />
              Тесты Купера
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {archiveData.cooperTests.map((test, index) => (
                <div key={index} className="flex items-center justify-between border-b pb-3 last:border-0">
                  <div>
                    <div className="font-medium">
                      {new Date(test.test_date).toLocaleDateString('ru-RU')}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Время: {Math.floor(test.total_time / 60)}:{(test.total_time % 60).toString().padStart(2, '0')}
                    </div>
                  </div>
                  <Badge variant="outline">{test.fitness_level}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Crash Tests */}
      {archiveData.crashTests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-destructive" />
              Краш-тесты
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {archiveData.crashTests.map((test, index) => (
                <div key={index} className="flex items-center justify-between border-b pb-3 last:border-0">
                  <div>
                    <div className="font-medium">{test.test_type}</div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(test.test_date).toLocaleDateString('ru-RU')}
                    </div>
                  </div>
                  <Badge variant={test.passed ? "default" : "destructive"}>
                    {test.passed ? 'Пройден' : 'Не пройден'}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
