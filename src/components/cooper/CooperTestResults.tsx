import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, TrendingUp, TrendingDown, Minus, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface CooperTestResult {
  id: string;
  total_minutes: number | null;
  total_seconds: number | null;
  total_time: number | null;
  test_date: string;
  test_phase: string;
  fitness_level: string | null;
  verified: boolean;
  notes: string | null;
}

interface CooperTestResultsProps {
  participantId?: string;
}

export const CooperTestResults: React.FC<CooperTestResultsProps> = ({ participantId }) => {
  const [testResults, setTestResults] = useState<CooperTestResult[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const userId = participantId || user?.id;

  useEffect(() => {
    if (!userId) return;
    
    const fetchResults = async () => {
      try {
        const { data, error } = await supabase
          .from('cooper_test_results')
          .select('*')
          .eq('user_id', userId)
          .order('test_date', { ascending: true });

        if (error) throw error;
        setTestResults(data || []);
      } catch (error) {
        console.error('Error fetching Cooper test results:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [userId]);

  const getPhaseLabel = (phase: string) => {
    switch (phase) {
      case 'before_stream': return 'До потока';
      case 'during_stream': return 'Во время потока';
      case 'after_stream': return 'После потока';
      default: return phase;
    }
  };

  const getFitnessLevelColor = (level: string | null) => {
    switch (level) {
      case 'excellent': return 'bg-green-600 text-white';
      case 'good': return 'bg-blue-600 text-white';
      case 'satisfactory': return 'bg-yellow-600 text-white';
      case 'poor': return 'bg-red-600 text-white';
      default: return 'bg-gray-600 text-white';
    }
  };

  const getFitnessLevelLabel = (level: string | null) => {
    switch (level) {
      case 'excellent': return 'Отлично';
      case 'good': return 'Хорошо';
      case 'satisfactory': return 'Удовлетворительно';
      case 'poor': return 'Плохо';
      default: return 'Неизвестно';
    }
  };

  const formatTime = (minutes: number | null, seconds: number | null) => {
    if (!minutes && !seconds) return '—';
    return `${minutes || 0}:${(seconds || 0).toString().padStart(2, '0')}`;
  };

  const getImprovement = (currentTime: number | null, previousTime: number | null) => {
    if (!currentTime || !previousTime) return null;
    
    const diff = currentTime - previousTime;
    if (Math.abs(diff) < 5) return null; // Less than 5 seconds difference
    
    return diff < 0 ? 'improved' : 'declined';
  };

  if (loading) {
    return (
      <Card className="bg-white border-gray-300">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-900">
            <Activity className="w-5 h-5 text-kamp-accent" />
            Результаты теста Купера
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <div className="animate-pulse">Загрузка результатов...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (testResults.length === 0) {
    return (
      <Card className="bg-white border-gray-300">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-900">
            <Activity className="w-5 h-5 text-kamp-accent" />
            Результаты теста Купера
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-gray-400 py-8">
            <Activity className="w-16 h-16 mx-auto mb-4 text-kamp-accent/50" />
            <h3 className="text-lg font-semibold mb-2">Нет результатов</h3>
            <p className="text-sm">
              Результаты теста Купера еще не добавлены
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white border-gray-300">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-gray-900">
          <Activity className="w-5 h-5 text-kamp-accent" />
          Результаты теста Купера
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {testResults.map((result, index) => {
          const previousResult = index > 0 ? testResults[index - 1] : null;
          const improvement = getImprovement(result.total_time, previousResult?.total_time);
          
          return (
            <div key={result.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-sm">
                    {getPhaseLabel(result.test_phase)}
                  </Badge>
                  {result.verified && (
                    <Badge className="bg-green-100 text-green-800 text-xs">
                      Подтверждено
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-1 text-sm text-gray-500">
                  <Calendar className="w-3 h-3" />
                  {new Date(result.test_date).toLocaleDateString('ru-RU')}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-3">
                <div>
                  <div className="text-sm text-gray-600">Общее время</div>
                  <div className="text-2xl font-bold text-kamp-accent">
                    {formatTime(result.total_minutes, result.total_seconds)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Уровень физподготовки</div>
                  <Badge className={`${getFitnessLevelColor(result.fitness_level)} text-sm`}>
                    {getFitnessLevelLabel(result.fitness_level)}
                  </Badge>
                </div>
              </div>

              {improvement && (
                <div className="flex items-center gap-2 text-sm">
                  {improvement === 'improved' ? (
                    <>
                      <TrendingUp className="w-4 h-4 text-green-600" />
                      <span className="text-green-600">Улучшение по сравнению с предыдущим тестом</span>
                    </>
                  ) : (
                    <>
                      <TrendingDown className="w-4 h-4 text-red-600" />
                      <span className="text-red-600">Ухудшение по сравнению с предыдущим тестом</span>
                    </>
                  )}
                </div>
              )}

              {result.notes && (
                <div className="mt-3 text-sm text-gray-600 bg-gray-50 p-2 rounded">
                  <strong>Заметки:</strong> {result.notes}
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};