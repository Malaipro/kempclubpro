import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  User, 
  Edit, 
  Plus, 
  TrendingUp, 
  TrendingDown, 
  Calendar as CalendarIcon,
  Target,
  Activity,
  CheckCircle,
  XCircle,
  Zap
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface Profile {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  display_name: string;
  date_of_birth?: string;
  height_cm?: number;
  weight_kg?: number;
  weight_before_stream?: number;
  weight_after_stream?: number;
  stream_start_date?: string;
  stream_end_date?: string;
  phone?: string;
  telegram?: string;
}

interface Habit {
  id: string;
  habit_name: string;
  habit_type: string;
  description?: string;
  start_date: string;
  end_date?: string;
  target_days: number;
  completed_days: number;
  is_active: boolean;
  is_completed: boolean;
  notes?: string;
}

interface CooperTest {
  id: string;
  test_date: string;
  test_phase: string;
  exercise_1_time: number;
  exercise_2_time: number;
  exercise_3_time: number;
  exercise_4_time: number;
  total_time: number;
  fitness_level?: string;
}

export const EnhancedPersonalProfile: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [cooperTests, setCooperTests] = useState<CooperTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingProfile, setEditingProfile] = useState(false);
  const [habitDialogOpen, setHabitDialogOpen] = useState(false);
  
  const [profileForm, setProfileForm] = useState({
    first_name: '',
    last_name: '',
    date_of_birth: null as Date | null,
    height_cm: '',
    weight_kg: '',
    weight_before_stream: '',
    weight_after_stream: '',
    stream_start_date: null as Date | null,
    stream_end_date: null as Date | null,
    phone: '',
    telegram: '',
  });

  const [habitForm, setHabitForm] = useState({
    habit_name: '',
    habit_type: 'habit' as 'ascetic' | 'habit',
    description: '',
    start_date: new Date(),
    end_date: null as Date | null,
    target_days: 21,
    notes: '',
  });

  useEffect(() => {
    if (user) {
      loadProfileData();
    }
  }, [user]);

  const loadProfileData = async () => {
    if (!user) return;

    try {
      // Загружаем профиль
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (profileError) throw profileError;
      setProfile(profileData);
      
      // Заполняем форму профиля
      setProfileForm({
        first_name: profileData?.first_name || '',
        last_name: profileData?.last_name || '',
        date_of_birth: profileData?.date_of_birth ? new Date(profileData.date_of_birth) : null,
        height_cm: profileData?.height_cm?.toString() || '',
        weight_kg: profileData?.weight_kg?.toString() || '',
        weight_before_stream: profileData?.weight_before_stream?.toString() || '',
        weight_after_stream: profileData?.weight_after_stream?.toString() || '',
        stream_start_date: profileData?.stream_start_date ? new Date(profileData.stream_start_date) : null,
        stream_end_date: profileData?.stream_end_date ? new Date(profileData.stream_end_date) : null,
        phone: profileData?.phone || '',
        telegram: profileData?.telegram || '',
      });

      // Загружаем привычки
      const { data: habitsData, error: habitsError } = await supabase
        .from('participant_habits')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (habitsError) throw habitsError;
      setHabits(habitsData || []);

      // Загружаем тесты Купера
      const { data: cooperData, error: cooperError } = await supabase
        .from('cooper_test_results')
        .select('*')
        .eq('user_id', user.id)
        .order('test_date', { ascending: false });

      if (cooperError) throw cooperError;
      setCooperTests(cooperData || []);

    } catch (error) {
      console.error('Error loading profile data:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось загрузить данные профиля',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleProfileSave = async () => {
    if (!user || !profile) return;

    try {
      const updateData = {
        first_name: profileForm.first_name,
        last_name: profileForm.last_name,
        display_name: `${profileForm.first_name} ${profileForm.last_name}`,
        date_of_birth: profileForm.date_of_birth?.toISOString().split('T')[0] || null,
        height_cm: profileForm.height_cm ? parseInt(profileForm.height_cm) : null,
        weight_kg: profileForm.weight_kg ? parseInt(profileForm.weight_kg) : null,
        weight_before_stream: profileForm.weight_before_stream ? parseInt(profileForm.weight_before_stream) : null,
        weight_after_stream: profileForm.weight_after_stream ? parseInt(profileForm.weight_after_stream) : null,
        stream_start_date: profileForm.stream_start_date?.toISOString().split('T')[0] || null,
        stream_end_date: profileForm.stream_end_date?.toISOString().split('T')[0] || null,
        phone: profileForm.phone,
        telegram: profileForm.telegram,
      };

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('user_id', user.id);

      if (error) throw error;

      setEditingProfile(false);
      loadProfileData();
      toast({
        title: 'Профиль обновлен',
        description: 'Данные профиля успешно сохранены',
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось обновить профиль',
        variant: 'destructive',
      });
    }
  };

  const handleHabitSave = async () => {
    if (!user) return;

    try {
      const habitData = {
        user_id: user.id,
        habit_name: habitForm.habit_name,
        habit_type: habitForm.habit_type,
        description: habitForm.description,
        start_date: habitForm.start_date.toISOString().split('T')[0],
        end_date: habitForm.end_date?.toISOString().split('T')[0] || null,
        target_days: habitForm.target_days,
        notes: habitForm.notes,
      };

      const { error } = await supabase
        .from('participant_habits')
        .insert([habitData]);

      if (error) throw error;

      setHabitDialogOpen(false);
      resetHabitForm();
      loadProfileData();
      toast({
        title: 'Привычка добавлена',
        description: 'Новая привычка успешно создана',
      });
    } catch (error) {
      console.error('Error creating habit:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось создать привычку',
        variant: 'destructive',
      });
    }
  };

  const resetHabitForm = () => {
    setHabitForm({
      habit_name: '',
      habit_type: 'habit',
      description: '',
      start_date: new Date(),
      end_date: null,
      target_days: 21,
      notes: '',
    });
  };

  const getWeightProgress = () => {
    const before = profile?.weight_before_stream;
    const after = profile?.weight_after_stream;
    
    if (!before || !after) return null;
    
    const diff = after - before;
    const percentage = Math.abs((diff / before) * 100);
    
    return {
      difference: diff,
      percentage: percentage.toFixed(1),
      isLoss: diff < 0,
    };
  };

  const getCooperProgress = () => {
    const beforeTest = cooperTests.find(test => test.test_phase === 'before_stream');
    const afterTest = cooperTests.find(test => test.test_phase === 'after_stream');
    
    if (!beforeTest || !afterTest) return null;
    
    const improvement = beforeTest.total_time - afterTest.total_time;
    const percentage = Math.abs((improvement / beforeTest.total_time) * 100);
    
    return {
      beforeTime: beforeTest.total_time,
      afterTime: afterTest.total_time,
      improvement,
      percentage: percentage.toFixed(1),
      isImprovement: improvement > 0,
    };
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-pulse">Загрузка профиля...</div>
      </div>
    );
  }

  const weightProgress = getWeightProgress();
  const cooperProgress = getCooperProgress();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Личный профиль</h1>
          <p className="text-muted-foreground">Управление профилем и отслеживание прогресса</p>
        </div>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-muted/50">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="w-4 h-4" />
            Профиль
          </TabsTrigger>
          <TabsTrigger value="progress" className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Прогресс
          </TabsTrigger>
          <TabsTrigger value="habits" className="flex items-center gap-2">
            <Target className="w-4 h-4" />
            Привычки
          </TabsTrigger>
          <TabsTrigger value="tests" className="flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Тесты
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Основная информация</CardTitle>
                <Button
                  variant="outline"
                  onClick={() => setEditingProfile(!editingProfile)}
                >
                  <Edit className="w-4 h-4 mr-2" />
                  {editingProfile ? 'Отмена' : 'Редактировать'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {editingProfile ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Имя</Label>
                      <Input
                        value={profileForm.first_name}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, first_name: e.target.value }))}
                        placeholder="Введите имя"
                      />
                    </div>
                    <div>
                      <Label>Фамилия</Label>
                      <Input
                        value={profileForm.last_name}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, last_name: e.target.value }))}
                        placeholder="Введите фамилию"
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Дата рождения</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {profileForm.date_of_birth
                            ? format(profileForm.date_of_birth, "dd MMMM yyyy", { locale: ru })
                            : "Выберите дату"
                          }
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 bg-white" align="start">
                        <Calendar
                          mode="single"
                          selected={profileForm.date_of_birth}
                          onSelect={(date) => setProfileForm(prev => ({ ...prev, date_of_birth: date }))}
                          disabled={(date) => date > new Date()}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Рост (см)</Label>
                      <Input
                        type="number"
                        value={profileForm.height_cm}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, height_cm: e.target.value }))}
                        placeholder="170"
                      />
                    </div>
                    <div>
                      <Label>Текущий вес (кг)</Label>
                      <Input
                        type="number"
                        value={profileForm.weight_kg}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, weight_kg: e.target.value }))}
                        placeholder="70"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Вес до потока (кг)</Label>
                      <Input
                        type="number"
                        value={profileForm.weight_before_stream}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, weight_before_stream: e.target.value }))}
                        placeholder="75"
                      />
                    </div>
                    <div>
                      <Label>Вес после потока (кг)</Label>
                      <Input
                        type="number"
                        value={profileForm.weight_after_stream}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, weight_after_stream: e.target.value }))}
                        placeholder="70"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Дата начала потока</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full justify-start text-left font-normal"
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {profileForm.stream_start_date
                              ? format(profileForm.stream_start_date, "dd.MM.yyyy")
                              : "Выберите дату"
                            }
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 bg-white" align="start">
                          <Calendar
                            mode="single"
                            selected={profileForm.stream_start_date}
                            onSelect={(date) => setProfileForm(prev => ({ ...prev, stream_start_date: date }))}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div>
                      <Label>Дата окончания потока</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full justify-start text-left font-normal"
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {profileForm.stream_end_date
                              ? format(profileForm.stream_end_date, "dd.MM.yyyy")
                              : "Выберите дату"
                            }
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 bg-white" align="start">
                          <Calendar
                            mode="single"
                            selected={profileForm.stream_end_date}
                            onSelect={(date) => setProfileForm(prev => ({ ...prev, stream_end_date: date }))}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Телефон</Label>
                      <Input
                        value={profileForm.phone}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, phone: e.target.value }))}
                        placeholder="+7 (999) 123-45-67"
                      />
                    </div>
                    <div>
                      <Label>Telegram</Label>
                      <Input
                        value={profileForm.telegram}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, telegram: e.target.value }))}
                        placeholder="@username"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button onClick={handleProfileSave} className="bg-kamp-accent hover:bg-kamp-accent/90">
                      Сохранить
                    </Button>
                    <Button variant="outline" onClick={() => setEditingProfile(false)}>
                      Отмена
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <h3 className="font-semibold mb-2">Личные данные</h3>
                      <div className="space-y-2 text-sm">
                        <p><span className="text-muted-foreground">Имя:</span> {profile?.first_name || 'Не указано'}</p>
                        <p><span className="text-muted-foreground">Фамилия:</span> {profile?.last_name || 'Не указано'}</p>
                        <p><span className="text-muted-foreground">Дата рождения:</span> {profile?.date_of_birth ? format(new Date(profile.date_of_birth), "dd.MM.yyyy") : 'Не указано'}</p>
                        <p><span className="text-muted-foreground">Телефон:</span> {profile?.phone || 'Не указан'}</p>
                        <p><span className="text-muted-foreground">Telegram:</span> {profile?.telegram || 'Не указан'}</p>
                      </div>
                    </div>
                    <div>
                      <h3 className="font-semibold mb-2">Физические параметры</h3>
                      <div className="space-y-2 text-sm">
                        <p><span className="text-muted-foreground">Рост:</span> {profile?.height_cm ? `${profile.height_cm} см` : 'Не указан'}</p>
                        <p><span className="text-muted-foreground">Текущий вес:</span> {profile?.weight_kg ? `${profile.weight_kg} кг` : 'Не указан'}</p>
                        <p><span className="text-muted-foreground">Вес до потока:</span> {profile?.weight_before_stream ? `${profile.weight_before_stream} кг` : 'Не указан'}</p>
                        <p><span className="text-muted-foreground">Вес после потока:</span> {profile?.weight_after_stream ? `${profile.weight_after_stream} кг` : 'Не указан'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="progress" className="mt-6">
          <div className="grid gap-6">
            {weightProgress && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {weightProgress.isLoss ? (
                      <TrendingDown className="w-5 h-5 text-green-500" />
                    ) : (
                      <TrendingUp className="w-5 h-5 text-red-500" />
                    )}
                    Изменение веса
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-2xl font-bold">
                        {weightProgress.isLoss ? '-' : '+'}{Math.abs(weightProgress.difference)} кг
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {weightProgress.percentage}% изменение
                      </p>
                    </div>
                    <Badge className={weightProgress.isLoss ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                      {weightProgress.isLoss ? 'Потеря веса' : 'Набор веса'}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <p>До потока: {profile?.weight_before_stream} кг</p>
                    <p>После потока: {profile?.weight_after_stream} кг</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {cooperProgress && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="w-5 h-5 text-kamp-accent" />
                    Прогресс тестов Купера
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-2xl font-bold">
                        {cooperProgress.isImprovement ? '-' : '+'}{Math.abs(cooperProgress.improvement)} сек
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {cooperProgress.percentage}% {cooperProgress.isImprovement ? 'улучшение' : 'ухудшение'}
                      </p>
                    </div>
                    <Badge className={cooperProgress.isImprovement ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                      {cooperProgress.isImprovement ? 'Улучшение' : 'Ухудшение'}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <p>До потока: {cooperProgress.beforeTime} сек</p>
                    <p>После потока: {cooperProgress.afterTime} сек</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="habits" className="mt-6">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Мои привычки и аскезы</h2>
              <Dialog open={habitDialogOpen} onOpenChange={setHabitDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-kamp-accent hover:bg-kamp-accent/90">
                    <Plus className="w-4 h-4 mr-2" />
                    Добавить привычку
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md bg-gray-900 border-gray-700">
                  <DialogHeader>
                    <DialogTitle className="text-white">Новая привычка</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label className="text-white">Название</Label>
                      <Input
                        value={habitForm.habit_name}
                        onChange={(e) => setHabitForm(prev => ({ ...prev, habit_name: e.target.value }))}
                        placeholder="Медитация, отжимания, чтение..."
                        className="bg-white text-black"
                      />
                    </div>

                    <div>
                      <Label className="text-white">Тип</Label>
                      <Select value={habitForm.habit_type} onValueChange={(value: 'ascetic' | 'habit') => setHabitForm(prev => ({ ...prev, habit_type: value }))}>
                        <SelectTrigger className="bg-white text-black">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-white border-gray-300 shadow-lg z-50">
                          <SelectItem value="habit">Привычка</SelectItem>
                          <SelectItem value="ascetic">Аскеза</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-white">Описание</Label>
                      <Textarea
                        value={habitForm.description}
                        onChange={(e) => setHabitForm(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Подробное описание привычки..."
                        className="bg-white text-black"
                        rows={3}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-white">Дата начала</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className="w-full justify-start text-left font-normal bg-white text-black"
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {format(habitForm.start_date, "dd.MM.yyyy")}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0 bg-white" align="start">
                            <Calendar
                              mode="single"
                              selected={habitForm.start_date}
                              onSelect={(date) => date && setHabitForm(prev => ({ ...prev, start_date: date }))}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                      <div>
                        <Label className="text-white">Целевые дни</Label>
                        <Input
                          type="number"
                          value={habitForm.target_days}
                          onChange={(e) => setHabitForm(prev => ({ ...prev, target_days: parseInt(e.target.value) || 21 }))}
                          className="bg-white text-black"
                        />
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button onClick={handleHabitSave} className="bg-kamp-accent hover:bg-kamp-accent/90">
                        Добавить
                      </Button>
                      <Button variant="outline" onClick={() => setHabitDialogOpen(false)} className="border-gray-600 text-gray-300 hover:bg-gray-800">
                        Отмена
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid gap-4">
              {habits.map((habit) => (
                <Card key={habit.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="font-semibold">{habit.habit_name}</h3>
                        <Badge variant={habit.habit_type === 'ascetic' ? 'destructive' : 'default'}>
                          {habit.habit_type === 'ascetic' ? 'Аскеза' : 'Привычка'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        {habit.is_completed ? (
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        ) : habit.is_active ? (
                          <Activity className="w-5 h-5 text-blue-500" />
                        ) : (
                          <XCircle className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Прогресс</span>
                        <span>{habit.completed_days}/{habit.target_days} дней</span>
                      </div>
                      <Progress 
                        value={(habit.completed_days / habit.target_days) * 100} 
                        className="h-2"
                      />
                    </div>

                    {habit.description && (
                      <p className="text-sm text-muted-foreground mt-3">{habit.description}</p>
                    )}

                    <div className="flex justify-between text-xs text-muted-foreground mt-3">
                      <span>Начало: {format(new Date(habit.start_date), "dd.MM.yyyy")}</span>
                      {habit.end_date && (
                        <span>Окончание: {format(new Date(habit.end_date), "dd.MM.yyyy")}</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}

              {habits.length === 0 && (
                <Card>
                  <CardContent className="pt-6 text-center">
                    <div className="text-muted-foreground">
                      <Target className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>У вас пока нет привычек или аскез</p>
                      <p className="text-sm">Добавьте первую привычку для отслеживания прогресса</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="tests" className="mt-6">
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">История тестов Купера</h2>
            
            <div className="grid gap-4">
              {cooperTests.map((test) => (
                <Card key={test.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="font-semibold">
                          Тест от {format(new Date(test.test_date), "dd.MM.yyyy")}
                        </h3>
                        <Badge variant={
                          test.test_phase === 'before_stream' ? 'destructive' :
                          test.test_phase === 'after_stream' ? 'default' : 'secondary'
                        }>
                          {test.test_phase === 'before_stream' ? 'До потока' :
                           test.test_phase === 'after_stream' ? 'После потока' : 'Во время потока'}
                        </Badge>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold">{test.total_time}с</p>
                        <p className="text-sm text-muted-foreground">Общее время</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-4 text-sm">
                      <div className="text-center">
                        <p className="font-semibold">{test.exercise_1_time}с</p>
                        <p className="text-muted-foreground">Упр. 1</p>
                      </div>
                      <div className="text-center">
                        <p className="font-semibold">{test.exercise_2_time}с</p>
                        <p className="text-muted-foreground">Упр. 2</p>
                      </div>
                      <div className="text-center">
                        <p className="font-semibold">{test.exercise_3_time}с</p>
                        <p className="text-muted-foreground">Упр. 3</p>
                      </div>
                      <div className="text-center">
                        <p className="font-semibold">{test.exercise_4_time}с</p>
                        <p className="text-muted-foreground">Упр. 4</p>
                      </div>
                    </div>

                    {test.fitness_level && (
                      <div className="mt-4">
                        <Badge className={
                          test.fitness_level === 'excellent' ? 'bg-green-100 text-green-800' :
                          test.fitness_level === 'good' ? 'bg-blue-100 text-blue-800' :
                          test.fitness_level === 'satisfactory' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }>
                          {test.fitness_level === 'excellent' ? 'Отлично' :
                           test.fitness_level === 'good' ? 'Хорошо' :
                           test.fitness_level === 'satisfactory' ? 'Удовлетворительно' : 'Плохо'}
                        </Badge>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}

              {cooperTests.length === 0 && (
                <Card>
                  <CardContent className="pt-6 text-center">
                    <div className="text-muted-foreground">
                      <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>У вас пока нет результатов тестов Купера</p>
                      <p className="text-sm">Результаты будут появляться после прохождения тестов</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};