import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Zap, TrendingUp, Plus, Edit, Trash2, CalendarIcon, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface CooperTestResult {
  id: string;
  user_id: string;
  test_date: string;
  distance: number;
  time_minutes: number;
  verified: boolean;
  age?: number;
  gender?: string;
  fitness_level?: string;
  notes?: string;
  verified_by?: string;
  profile?: {
    first_name?: string;
    last_name?: string;
    display_name?: string;
  };
}

interface Participant {
  id: string;
  user_id: string;
  display_name: string;
  first_name?: string;
  last_name?: string;
}

export const EnhancedCooperTest: React.FC = () => {
  const [activeTab, setActiveTab] = useState('test1');
  const [testResults, setTestResults] = useState<CooperTestResult[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingResult, setEditingResult] = useState<CooperTestResult | null>(null);
  const [formData, setFormData] = useState({
    user_id: '',
    test_number: '1',
    distance: '',
    time_seconds: '',
    age: '',
    gender: '',
    notes: '',
    test_date: new Date(),
  });
  
  const { toast } = useToast();

  useEffect(() => {
    fetchTestResults();
    fetchParticipants();
  }, []);

  const fetchTestResults = async () => {
    try {
      const { data, error } = await supabase
        .from('cooper_test_results')
        .select('*')
        .order('test_date', { ascending: false });

      if (error) throw error;
      
      // Fetch profiles separately
      const resultsWithProfiles = await Promise.all(
        (data || []).map(async (result) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('first_name, last_name, display_name')
            .eq('user_id', result.user_id)
            .single();
          
          return { ...result, profile };
        })
      );
      
      setTestResults(resultsWithProfiles);
    } catch (error) {
      console.error('Error fetching test results:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось загрузить результаты тестов',
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
        .order('display_name');

      if (error) throw error;
      setParticipants(data || []);
    } catch (error) {
      console.error('Error fetching participants:', error);
    }
  };

  const getFitnessLevel = (timeMinutes: number) => {
    if (timeMinutes <= 3) return { level: 'excellent', label: 'Отлично', color: 'bg-green-100 text-green-800' };
    if (timeMinutes <= 4) return { level: 'good', label: 'Хорошо', color: 'bg-blue-100 text-blue-800' };
    if (timeMinutes <= 5) return { level: 'satisfactory', label: 'Удовлетворительно', color: 'bg-yellow-100 text-yellow-800' };
    return { level: 'poor', label: 'Плохо', color: 'bg-red-100 text-red-800' };
  };

  const formatParticipantName = (result: CooperTestResult) => {
    if (result.profile?.first_name && result.profile?.last_name) {
      return `${result.profile.first_name} ${result.profile.last_name}`;
    }
    return result.profile?.display_name || 'Неизвестный участник';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.user_id || !formData.distance || !formData.time_seconds) {
      toast({
        title: 'Ошибка',
        description: 'Заполните обязательные поля',
        variant: 'destructive',
      });
      return;
    }

    try {
      const timeMinutes = parseInt(formData.time_seconds) / 60;
      const fitnessLevel = getFitnessLevel(timeMinutes);

      const testData = {
        user_id: formData.user_id,
        test_date: formData.test_date.toISOString(),
        distance: parseInt(formData.distance),
        time_minutes: Math.round(timeMinutes),
        age: formData.age ? parseInt(formData.age) : null,
        gender: formData.gender || null,
        fitness_level: fitnessLevel.level,
        notes: formData.notes || null,
        verified: false,
      };

      if (editingResult) {
        const { error } = await supabase
          .from('cooper_test_results')
          .update(testData)
          .eq('id', editingResult.id);

        if (error) throw error;

        toast({
          title: 'Результат обновлен',
          description: 'Результат теста успешно обновлен',
        });
      } else {
        const { error } = await supabase
          .from('cooper_test_results')
          .insert([testData]);

        if (error) throw error;

        toast({
          title: 'Результат добавлен',
          description: 'Результат теста успешно добавлен',
        });
      }

      setDialogOpen(false);
      setEditingResult(null);
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
      test_number: '1', // We'll determine this from the data
      distance: result.distance.toString(),
      time_seconds: (result.time_minutes * 60).toString(),
      age: result.age?.toString() || '',
      gender: result.gender || '',
      notes: result.notes || '',
      test_date: new Date(result.test_date),
    });
    setDialogOpen(true);
  };

  const handleVerification = async (resultId: string, verified: boolean) => {
    try {
      const { error } = await supabase
        .from('cooper_test_results')
        .update({ verified })
        .eq('id', resultId);

      if (error) throw error;

      fetchTestResults();
      toast({
        title: verified ? 'Результат подтвержден' : 'Подтверждение отменено',
        description: `Результат ${verified ? 'подтвержден' : 'не подтвержден'}`,
      });
    } catch (error) {
      console.error('Error updating verification:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось изменить статус подтверждения',
        variant: 'destructive',
      });
    }
  };

  const resetForm = () => {
    setFormData({
      user_id: '',
      test_number: '1',
      distance: '',
      time_seconds: '',
      age: '',
      gender: '',
      notes: '',
      test_date: new Date(),
    });
  };

  const getTestResults = (testNumber: string) => {
    // For now, we'll show all results as we don't have test_number field in the database
    return testResults;
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-pulse">Загрузка результатов...</div>
      </div>
    );
  }

  const test1Results = getTestResults('1');
  const test2Results = getTestResults('2');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Тест Купера</h1>
          <p className="text-muted-foreground">Управление результатами всех участников (4 круга в зале)</p>
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
                  <SelectContent className="bg-white">
                    {participants.map((participant) => (
                      <SelectItem key={participant.user_id} value={participant.user_id}>
                        {participant.first_name && participant.last_name 
                          ? `${participant.first_name} ${participant.last_name}`
                          : participant.display_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-white">Дистанция (м) *</Label>
                  <Input
                    type="number"
                    value={formData.distance}
                    onChange={(e) => setFormData(prev => ({ ...prev, distance: e.target.value }))}
                    placeholder="2000"
                    className="bg-white text-black"
                    required
                  />
                </div>
                <div>
                  <Label className="text-white">Время (сек) *</Label>
                  <Input
                    type="number"
                    value={formData.time_seconds}
                    onChange={(e) => setFormData(prev => ({ ...prev, time_seconds: e.target.value }))}
                    placeholder="180"
                    className="bg-white text-black"
                    required
                  />
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
                  />
                </div>
                <div>
                  <Label className="text-white">Пол</Label>
                  <Select value={formData.gender} onValueChange={(value) => setFormData(prev => ({ ...prev, gender: value }))}>
                    <SelectTrigger className="bg-white text-black">
                      <SelectValue placeholder="Выберите пол" />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      <SelectItem value="male">Мужской</SelectItem>
                      <SelectItem value="female">Женский</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label className="text-white">Дата теста</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal bg-white text-black hover:bg-gray-50"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(formData.test_date, "dd.MM.yyyy")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-white" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.test_date}
                      onSelect={(date) => date && setFormData(prev => ({ ...prev, test_date: date }))}
                      initialFocus
                      className="bg-white pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
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
                <Button 
                  type="submit" 
                  className="bg-destructive hover:bg-destructive/90 text-white"
                >
                  {editingResult ? 'Сохранить' : 'Добавить'}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setDialogOpen(false)}
                  className="border-gray-600 text-gray-300 hover:bg-gray-800"
                >
                  Отмена
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-muted/50">
          <TabsTrigger value="test1" className="flex items-center gap-2">
            <Zap className="w-4 h-4" />
            Тест 1 ({test1Results.length})
          </TabsTrigger>
          <TabsTrigger value="test2" className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Тест 2 ({test2Results.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="test1" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-kamp-accent" />
                Результаты теста Купера - Тест 1
              </CardTitle>
            </CardHeader>
            <CardContent>
              {test1Results.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Участник</TableHead>
                      <TableHead>Дистанция</TableHead>
                      <TableHead>Время</TableHead>
                      <TableHead>Возраст</TableHead>
                      <TableHead>Пол</TableHead>
                      <TableHead>Уровень</TableHead>
                      <TableHead>Дата теста</TableHead>
                      <TableHead>Статус</TableHead>
                      <TableHead>Действия</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {test1Results.map((result) => {
                      const fitnessLevel = getFitnessLevel(result.time_minutes);
                      return (
                        <TableRow key={result.id}>
                          <TableCell className="font-medium">
                            {formatParticipantName(result)}
                          </TableCell>
                          <TableCell>{result.distance}м</TableCell>
                          <TableCell>{result.time_minutes}мин</TableCell>
                          <TableCell>{result.age || '-'}</TableCell>
                          <TableCell>{result.gender === 'male' ? 'М' : result.gender === 'female' ? 'Ж' : '-'}</TableCell>
                          <TableCell>
                            <Badge className={fitnessLevel.color}>
                              {fitnessLevel.label}
                            </Badge>
                          </TableCell>
                          <TableCell>{format(new Date(result.test_date), 'dd.MM.yyyy')}</TableCell>
                          <TableCell>
                            {result.verified ? (
                              <Badge className="bg-green-100 text-green-800">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Подтвержден
                              </Badge>
                            ) : (
                              <Badge variant="secondary">
                                <XCircle className="w-3 h-3 mr-1" />
                                Не подтвержден
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEdit(result)}
                              >
                                <Edit className="w-3 h-3" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleVerification(result.id, !result.verified)}
                                className={result.verified ? "text-red-600" : "text-green-600"}
                              >
                                {result.verified ? <XCircle className="w-3 h-3" /> : <CheckCircle className="w-3 h-3" />}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Zap className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-semibold mb-2">Нет результатов</h3>
                  <p className="text-sm">Добавьте первый результат теста</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="test2" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-kamp-accent" />
                Результаты теста Купера - Тест 2
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <TrendingUp className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-semibold mb-2">Тест 2 в разработке</h3>
                <p className="text-sm">Функциональность для второго теста будет добавлена позже</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};