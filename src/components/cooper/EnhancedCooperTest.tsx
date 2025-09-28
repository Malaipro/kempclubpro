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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Activity, Plus, Edit, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface CooperTestResult {
  id: string;
  user_id: string;
  total_minutes: number | null;
  total_seconds: number | null;
  total_time: number | null;
  age: number | null;
  gender: string | null;
  test_date: string;
  test_phase: string;
  verified: boolean;
  verified_by: string | null;
  created_at: string;
  notes: string | null;
  fitness_level: string | null;
  profiles?: {
    display_name: string | null;
    first_name: string | null;
    last_name: string | null;
  } | null;
}

interface Participant {
  user_id: string;
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
}

export const EnhancedCooperTest: React.FC = () => {
  const [testResults, setTestResults] = useState<CooperTestResult[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingResult, setEditingResult] = useState<CooperTestResult | null>(null);

  const [formData, setFormData] = useState({
    user_id: '',
    total_minutes: '',
    total_seconds: '',
    age: '',
    gender: '',
    test_date: new Date().toISOString().split('T')[0],
    test_phase: 'during_stream',
    notes: '',
  });

  const { toast } = useToast();

  const fetchTestResults = async () => {
    try {
      const { data, error } = await supabase
        .from('cooper_test_results')
        .select('*')
        .order('test_date', { ascending: false });

      if (error) throw error;
      
      // Fetch profiles separately to avoid relationship issues  
      const userIds = (data || []).map(result => result.user_id);
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, display_name, first_name, last_name')
        .in('user_id', userIds);

      // Merge profiles with results
      const resultsWithProfiles = (data || []).map(result => ({
        ...result,
        profiles: profilesData?.find(p => p.user_id === result.user_id) || null
      }));

      setTestResults(resultsWithProfiles);
    } catch (error) {
      console.error('Error fetching test results:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось загрузить результаты теста',
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
        .select('user_id, display_name, first_name, last_name')
        .order('display_name', { ascending: true });

      if (error) throw error;
      setParticipants(data || []);
    } catch (error) {
      console.error('Error fetching participants:', error);
    }
  };

  useEffect(() => {
    fetchTestResults();
    fetchParticipants();
  }, []);

  const getFitnessLevel = (totalMinutes: number | null): string => {
    if (!totalMinutes) return 'unknown';
    
    // Based on total time in minutes for all 4 exercises
    if (totalMinutes <= 3) return 'excellent';      // 3 minutes or less
    if (totalMinutes <= 4) return 'good';           // 4 minutes or less  
    if (totalMinutes <= 5) return 'satisfactory';   // 5 minutes or less
    return 'poor';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.user_id || !formData.total_minutes || !formData.total_seconds) {
      toast({
        title: 'Ошибка',
        description: 'Заполните все обязательные поля',
        variant: 'destructive',
      });
      return;
    }

    try {
      const totalMinutes = parseInt(formData.total_minutes);
      const totalSeconds = parseInt(formData.total_seconds);
      const totalTime = totalMinutes * 60 + totalSeconds;
      const fitnessLevel = getFitnessLevel(totalMinutes);

      const testData = {
        user_id: formData.user_id,
        total_minutes: totalMinutes,
        total_seconds: totalSeconds,
        total_time: totalTime,
        age: formData.age ? parseInt(formData.age) : null,
        gender: formData.gender || null,
        test_date: new Date(formData.test_date).toISOString(),
        test_phase: formData.test_phase,
        notes: formData.notes || null,
        fitness_level: fitnessLevel,
        verified: false,
      };

      if (editingResult) {
        const { error } = await supabase
          .from('cooper_test_results')
          .update(testData)
          .eq('id', editingResult.id);
        
        if (error) throw error;
        toast({ title: 'Успешно', description: 'Результат обновлен' });
      } else {
        const { error } = await supabase
          .from('cooper_test_results')
          .insert([testData]);
        
        if (error) throw error;
        toast({ title: 'Успешно', description: 'Результат добавлен' });
      }

      setDialogOpen(false);
      resetForm();
      fetchTestResults();
    } catch (error) {
      console.error('Error saving test result:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось сохранить результат',
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (result: CooperTestResult) => {
    setEditingResult(result);
    setFormData({
      user_id: result.user_id,
      total_minutes: result.total_minutes?.toString() || '',
      total_seconds: result.total_seconds?.toString() || '',
      age: result.age?.toString() || '',
      gender: result.gender || '',
      test_date: result.test_date.split('T')[0],
      test_phase: result.test_phase,
      notes: result.notes || '',
    });
    setDialogOpen(true);
  };

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

  const resetForm = () => {
    setFormData({
      user_id: '',
      total_minutes: '',
      total_seconds: '',
      age: '',
      gender: '',
      test_date: new Date().toISOString().split('T')[0],
      test_phase: 'during_stream',
      notes: '',
    });
    setEditingResult(null);
  };

  const formatParticipantName = (result: CooperTestResult) => {
    if (result.profiles?.first_name && result.profiles?.last_name) {
      return `${result.profiles.first_name} ${result.profiles.last_name}`;
    }
    return result.profiles?.display_name || 'Неизвестный участник';
  };

  const getFitnessLevelColor = (level: string | null) => {
    switch (level) {
      case 'excellent':
        return 'bg-green-600 text-white';
      case 'good':
        return 'bg-blue-600 text-white';
      case 'satisfactory':
        return 'bg-yellow-600 text-white';
      case 'poor':
        return 'bg-red-600 text-white';
      default:
        return 'bg-gray-600 text-white';
    }
  };

  const getFitnessLevelLabel = (level: string | null) => {
    switch (level) {
      case 'excellent':
        return 'Отлично';
      case 'good':
        return 'Хорошо';
      case 'satisfactory':
        return 'Удовлетворительно';
      case 'poor':
        return 'Плохо';
      default:
        return 'Неизвестно';
    }
  };

  // Group results by test phase for different measurements
  const getTestResults = (phase: string) => {
    return testResults.filter(result => result.test_phase === phase);  
  };

  // Get user's different test phases to show improvement
  const getUserTestHistory = (userId: string) => {
    return testResults.filter(result => result.user_id === userId)
      .sort((a, b) => new Date(a.test_date).getTime() - new Date(b.test_date).getTime());
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-pulse text-lg">Загрузка результатов теста...</div>
      </div>
    );
  }

  const beforeStreamResults = getTestResults('before_stream');
  const duringStreamResults = getTestResults('during_stream'); 
  const afterStreamResults = getTestResults('after_stream');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Тест Купера</h1>
          <p className="text-muted-foreground">Управление результатами всех участников (общее время за 4 упражнения)</p>
        </div>
        
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              className="bg-destructive hover:bg-destructive/90 text-white"
              onClick={() => {
                setEditingResult(null);
                resetForm();
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Добавить результат
            </Button>
          </DialogTrigger>
          
          <DialogContent className="max-w-md bg-gray-900 border-gray-700">
            <DialogHeader>
              <DialogTitle className="text-white">
                {editingResult ? 'Редактировать результат' : 'Добавить результат теста'}
              </DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label className="text-white">Участник *</Label>
                <Select value={formData.user_id} onValueChange={(value) => setFormData(prev => ({ ...prev, user_id: value }))}>
                  <SelectTrigger className="bg-white text-black">
                    <SelectValue placeholder="Выберите участника" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-gray-300 shadow-lg z-50">
                    {participants.map((participant) => (
                      <SelectItem key={participant.user_id} value={participant.user_id} className="hover:bg-gray-100">
                        {participant.first_name && participant.last_name 
                          ? `${participant.first_name} ${participant.last_name}`
                          : participant.display_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-white">Фаза теста</Label>
                <Select value={formData.test_phase} onValueChange={(value) => setFormData(prev => ({ ...prev, test_phase: value }))}>
                  <SelectTrigger className="bg-white text-black">
                    <SelectValue placeholder="Выберите фазу" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-gray-300 shadow-lg z-50">
                    <SelectItem value="before_stream" className="hover:bg-gray-100">До потока</SelectItem>
                    <SelectItem value="during_stream" className="hover:bg-gray-100">Во время потока</SelectItem>
                    <SelectItem value="after_stream" className="hover:bg-gray-100">После потока</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-white">Минуты *</Label>
                    <Input
                      type="number"
                      value={formData.total_minutes}
                      onChange={(e) => setFormData(prev => ({ ...prev, total_minutes: e.target.value }))}
                      placeholder="3"
                      className="bg-white text-black"
                      min="0"
                      required
                    />
                  </div>
                  <div>
                    <Label className="text-white">Секунды *</Label>
                    <Input
                      type="number"
                      value={formData.total_seconds}
                      onChange={(e) => setFormData(prev => ({ ...prev, total_seconds: e.target.value }))}
                      placeholder="30"
                      className="bg-white text-black"
                      min="0"
                      max="59"
                      required
                    />
                  </div>
                </div>
                <div className="text-sm text-gray-300">
                  Общее время выполнения всех 4 упражнений
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-white">Возраст</Label>
                  <Input
                    type="number"
                    value={formData.age}
                    onChange={(e) => setFormData(prev => ({ ...prev, age: e.target.value }))}
                    placeholder="25"
                    className="bg-white text-black"
                    min="16"
                    max="80"
                  />
                </div>
                <div>
                  <Label className="text-white">Пол</Label>
                  <Select value={formData.gender} onValueChange={(value) => setFormData(prev => ({ ...prev, gender: value }))}>
                    <SelectTrigger className="bg-white text-black">
                      <SelectValue placeholder="Выберите пол" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-gray-300 shadow-lg z-50">
                      <SelectItem value="male" className="hover:bg-gray-100">Мужской</SelectItem>
                      <SelectItem value="female" className="hover:bg-gray-100">Женский</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label className="text-white">Дата теста</Label>
                <Input
                  type="date"
                  value={formData.test_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, test_date: e.target.value }))}
                  className="bg-white text-black"
                />
              </div>

              <div>
                <Label className="text-white">Заметки</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Дополнительная информация о тесте"
                  className="bg-white text-black"
                  rows={3}
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit" className="flex-1 bg-destructive hover:bg-destructive/90">
                  {editingResult ? 'Обновить' : 'Добавить'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Отмена
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">Все результаты</TabsTrigger>
          <TabsTrigger value="before">До потока ({beforeStreamResults.length})</TabsTrigger>
          <TabsTrigger value="during">Во время ({duringStreamResults.length})</TabsTrigger>
          <TabsTrigger value="after">После потока ({afterStreamResults.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-destructive" />
                Все результаты теста Купера
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Участник</TableHead>
                    <TableHead>Общее время</TableHead>
                    <TableHead>Возраст</TableHead>
                    <TableHead>Пол</TableHead>
                    <TableHead>Уровень физ. подготовки</TableHead>
                    <TableHead>Дата теста</TableHead>
                    <TableHead>Фаза</TableHead>
                    <TableHead>Статус</TableHead>
                    <TableHead>Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {testResults.map((result) => (
                    <TableRow key={result.id} className="hover:bg-gray-50">
                      <TableCell>
                        <div className="font-medium">
                          {formatParticipantName(result)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-semibold">
                          {result.total_minutes !== null && result.total_seconds !== null 
                            ? `${result.total_minutes}:${result.total_seconds.toString().padStart(2, '0')}` 
                            : '—'}
                        </div>
                      </TableCell>
                      <TableCell>{result.age || '—'}</TableCell>
                      <TableCell>{result.gender === 'male' ? 'М' : result.gender === 'female' ? 'Ж' : '—'}</TableCell>
                      <TableCell>
                        <Badge className={getFitnessLevelColor(result.fitness_level)}>
                          {getFitnessLevelLabel(result.fitness_level)}
                        </Badge>
                      </TableCell>
                      <TableCell>{new Date(result.test_date).toLocaleDateString('ru-RU')}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {result.test_phase === 'before_stream' ? 'До потока' : 
                           result.test_phase === 'during_stream' ? 'Во время потока' : 
                           result.test_phase === 'after_stream' ? 'После потока' : result.test_phase}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={result.verified ? "default" : "secondary"}>
                          {result.verified ? 'Подтверждено' : 'Ожидает'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(result)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleVerification(result.id, !result.verified)}
                            className={result.verified ? "text-red-600" : "text-green-600"}
                          >
                            {result.verified ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {testResults.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  Результаты тестов не найдены
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="before" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Результаты до потока</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Similar table structure for before stream results */}
              {beforeStreamResults.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Нет результатов до потока
                </div>
              ) : (
                <div className="text-center py-4">
                  Найдено результатов: {beforeStreamResults.length}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="during" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Результаты во время потока</CardTitle>
            </CardHeader>
            <CardContent>
              {duringStreamResults.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Нет результатов во время потока
                </div>
              ) : (
                <div className="text-center py-4">
                  Найдено результатов: {duringStreamResults.length}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="after" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Результаты после потока</CardTitle>
            </CardHeader>
            <CardContent>
              {afterStreamResults.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Нет результатов после потока
                </div>
              ) : (
                <div className="text-center py-4">
                  Найдено результатов: {afterStreamResults.length}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};