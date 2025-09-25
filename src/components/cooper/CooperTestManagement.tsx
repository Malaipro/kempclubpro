import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Activity, CheckCircle, XCircle, Calendar, User, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface CooperTestResult {
  id: string;
  user_id: string;
  distance: number;
  time_minutes: number;
  age: number | null;
  gender: string | null;
  fitness_level: string | null;
  verified: boolean;
  verified_by: string | null;
  test_date: string;
  notes: string | null;
  created_at: string;
  profiles?: {
    display_name: string | null;
    first_name: string | null;
    last_name: string | null;
  } | null;
}

export const CooperTestManagement: React.FC = () => {
  const [testResults, setTestResults] = useState<CooperTestResult[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchTestResults = async () => {
    try {
      const { data, error } = await supabase
        .from('cooper_test_results')
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
      setTestResults((data as unknown) as CooperTestResult[] || []);
    } catch (error) {
      console.error('Error fetching Cooper test results:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось загрузить результаты теста Купера',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTestResults();
  }, []);

  const handleVerification = async (resultId: string, verified: boolean) => {
    try {
      const { error } = await supabase
        .from('cooper_test_results')
        .update({ 
          verified,
          verified_by: verified ? (await supabase.auth.getUser()).data.user?.id : null
        })
        .eq('id', resultId);

      if (error) throw error;
      
      toast({
        title: verified ? 'Результат подтвержден' : 'Подтверждение отменено',
        description: 'Статус успешно обновлен',
      });
      
      fetchTestResults();
    } catch (error) {
      console.error('Error updating verification:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось обновить статус подтверждения',
        variant: 'destructive',
      });
    }
  };

  const formatUserName = (result: CooperTestResult) => {
    const profile = result.profiles;
    if (profile?.first_name && profile?.last_name) {
      return `${profile.first_name} ${profile.last_name}`;
    }
    return profile?.display_name || 'Неизвестный пользователь';
  };

  const getFitnessLevelColor = (level: string | null) => {
    switch (level) {
      case 'excellent': return 'bg-green-100 text-green-800';
      case 'good': return 'bg-blue-100 text-blue-800';
      case 'average': return 'bg-yellow-100 text-yellow-800';
      case 'poor': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getFitnessLevelLabel = (level: string | null) => {
    switch (level) {
      case 'excellent': return 'Отлично';
      case 'good': return 'Хорошо';
      case 'average': return 'Средне';
      case 'poor': return 'Плохо';
      default: return 'Не определен';
    }
  };

  return (
    <div className="bg-gray-900 p-6 rounded-lg">
      <div className="flex items-center gap-2 mb-6">
        <Activity className="w-5 h-5 text-destructive" />
        <h2 className="text-xl font-semibold text-destructive">Управление тестом Купера</h2>
      </div>
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-pulse text-gray-400">Загрузка результатов...</div>
        </div>
      ) : (
        <div className="bg-gray-800 border border-gray-700 rounded-lg">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-gray-700">
                <TableHead className="text-gray-300">Участник</TableHead>
                <TableHead className="text-gray-300">Дистанция</TableHead>
                <TableHead className="text-gray-300">Время</TableHead>
                <TableHead className="text-gray-300">Возраст</TableHead>
                <TableHead className="text-gray-300">Пол</TableHead>
                <TableHead className="text-gray-300">Уровень</TableHead>
                <TableHead className="text-gray-300">Дата теста</TableHead>
                <TableHead className="text-gray-300">Статус</TableHead>
                <TableHead className="text-gray-300">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {testResults.map((result) => (
                <TableRow key={result.id} className="border-b border-gray-700">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-400" />
                      <div className="font-medium text-white">{formatUserName(result)}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-white">{result.distance} м</div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-gray-300">
                      <Clock className="w-3 h-3" />
                      {result.time_minutes} мин
                    </div>
                  </TableCell>
                  <TableCell className="text-gray-300">
                    {result.age ? `${result.age} лет` : '—'}
                  </TableCell>
                  <TableCell className="text-gray-300">
                    {result.gender === 'male' ? 'М' : result.gender === 'female' ? 'Ж' : '—'}
                  </TableCell>
                  <TableCell>
                    <Badge className={getFitnessLevelColor(result.fitness_level)}>
                      {getFitnessLevelLabel(result.fitness_level)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm text-gray-300">
                      <Calendar className="w-3 h-3" />
                      {new Date(result.test_date).toLocaleDateString('ru-RU')}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={result.verified ? "default" : "secondary"} className={result.verified ? "bg-green-600 text-white" : "bg-gray-600 text-white"}>
                      {result.verified ? 'Подтвержден' : 'Ожидает подтверждения'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {!result.verified ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleVerification(result.id, true)}
                          className="border-green-600 text-green-400 hover:bg-green-600 hover:text-white"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleVerification(result.id, false)}
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

      {testResults.length === 0 && !loading && (
        <div className="text-center py-8 text-gray-400">
          Нет результатов теста Купера
        </div>
      )}
    </div>
  );
};