import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
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
  Zap,
  FileText,
  Shield
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/use-mobile';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { CooperTestResults } from '@/components/cooper/CooperTestResults';
import { ParticipantAchievements } from './ParticipantAchievements';
import { UserTotems } from './UserTotems';
import { UserActivities } from '@/components/leaderboard/UserActivities';
import { UserContracts } from './UserContracts';

interface Profile {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  middle_name?: string;
  display_name: string;
  email?: string;
  date_of_birth?: string;
  height_cm?: number;
  weight_kg?: number;
  weight_before_stream?: number;
  weight_after_stream?: number;
  phone?: string;
  telegram?: string;
  personal_data_consent?: boolean;
  personal_data_consent_date?: string;
}

interface ContractData {
  id?: string;
  user_id?: string;
  passport_series?: string;
  passport_number?: string;
  passport_issued_by?: string;
  passport_issued_date?: string;
  passport_department_code?: string;
  registration_address?: string;
  inn?: string;
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
  total_minutes: number | null;
  total_seconds: number | null;
  total_time: number | null;
  fitness_level?: string;
  verified: boolean;
  notes?: string;
}

export const EnhancedPersonalProfile: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [contractData, setContractData] = useState<ContractData>({});
  const [habits, setHabits] = useState<Habit[]>([]);
  const [cooperTests, setCooperTests] = useState<CooperTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingProfile, setEditingProfile] = useState(false);
  const [habitDialogOpen, setHabitDialogOpen] = useState(false);
  
  const [profileForm, setProfileForm] = useState({
    first_name: '',
    last_name: '',
    middle_name: '',
    email: '',
    date_of_birth: null as Date | null,
    height_cm: '',
    weight_kg: '',
    weight_before_stream: '',
    weight_after_stream: '',
    phone: '',
    telegram: '',
    personal_data_consent: false,
    personal_data_consent_date: null as string | null,
  });

  const [contractForm, setContractForm] = useState({
    passport_series: '',
    passport_number: '',
    passport_issued_by: '',
    passport_issued_date: '',
    passport_department_code: '',
    registration_address: '',
    inn: '',
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
        .maybeSingle();

      if (profileError) throw profileError;
      setProfile(profileData);
      
      // Заполняем форму профиля
      setProfileForm({
        first_name: profileData?.first_name || '',
        last_name: profileData?.last_name || '',
        middle_name: profileData?.middle_name || '',
        email: profileData?.email || user.email || '',
        date_of_birth: profileData?.date_of_birth ? new Date(profileData.date_of_birth) : null,
        height_cm: profileData?.height_cm?.toString() || '',
        weight_kg: profileData?.weight_kg?.toString() || '',
        weight_before_stream: profileData?.weight_before_stream?.toString() || '',
        weight_after_stream: profileData?.weight_after_stream?.toString() || '',
        phone: profileData?.phone || '',
        telegram: profileData?.telegram || '',
        personal_data_consent: profileData?.personal_data_consent || false,
        personal_data_consent_date: profileData?.personal_data_consent_date || null,
      });

      // Загружаем паспортные данные
      const { data: contractDataResult, error: contractError } = await supabase
        .from('contract_data')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (contractError && contractError.code !== 'PGRST116') {
        console.error('Error loading contract data:', contractError);
      }

      if (contractDataResult) {
        setContractData(contractDataResult);
        setContractForm({
          passport_series: contractDataResult.passport_series || '',
          passport_number: contractDataResult.passport_number || '',
          passport_issued_by: contractDataResult.passport_issued_by || '',
          passport_issued_date: contractDataResult.passport_issued_date || '',
          passport_department_code: contractDataResult.passport_department_code || '',
          registration_address: contractDataResult.registration_address || '',
          inn: contractDataResult.inn || '',
        });
      }

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
      setCooperTests((cooperData as any) || []);

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
    if (!user) return;

    try {
      const updateData = {
        user_id: user.id,
        first_name: profileForm.first_name,
        last_name: profileForm.last_name,
        middle_name: profileForm.middle_name,
        email: profileForm.email,
        display_name: `${profileForm.first_name} ${profileForm.last_name}`,
        date_of_birth: profileForm.date_of_birth?.toISOString().split('T')[0] || null,
        height_cm: profileForm.height_cm ? parseInt(profileForm.height_cm) : null,
        weight_kg: profileForm.weight_kg ? parseInt(profileForm.weight_kg) : null,
        weight_before_stream: profileForm.weight_before_stream ? parseInt(profileForm.weight_before_stream) : null,
        weight_after_stream: profileForm.weight_after_stream ? parseInt(profileForm.weight_after_stream) : null,
        phone: profileForm.phone,
        telegram: profileForm.telegram,
        personal_data_consent: profileForm.personal_data_consent,
        personal_data_consent_date: profileForm.personal_data_consent ? (profileForm.personal_data_consent_date || new Date().toISOString()) : null,
      };

      const { error: profileError } = await supabase
        .from('profiles')
        .upsert(updateData);

      if (profileError) throw profileError;

      // Сохраняем паспортные данные
      const contractDataToSave = {
        user_id: user.id,
        passport_series: contractForm.passport_series || null,
        passport_number: contractForm.passport_number || null,
        passport_issued_by: contractForm.passport_issued_by || null,
        passport_issued_date: contractForm.passport_issued_date || null,
        passport_department_code: contractForm.passport_department_code || null,
        registration_address: contractForm.registration_address || null,
        inn: contractForm.inn || null,
      };

      const { error: contractError } = await supabase
        .from('contract_data')
        .upsert(contractDataToSave, { onConflict: 'user_id' });

      if (contractError) throw contractError;

      setEditingProfile(false);
      loadProfileData();
      toast({
        title: 'Данные сохранены',
        description: 'Профиль и паспортные данные успешно сохранены',
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

  const handleConsentChange = (checked: boolean) => {
    setProfileForm(prev => ({
      ...prev,
      personal_data_consent: checked,
      personal_data_consent_date: checked ? new Date().toISOString() : null,
    }));
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
    
    if (!beforeTest || !afterTest || !beforeTest.total_time || !afterTest.total_time) return null;
    
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
      {/* Документы (договоры) */}
      <UserContracts />
      
      {/* Карточка достижений */}
      <ParticipantAchievements />
      
      {/* Карточка тотемов */}
      <UserTotems />
      
      {/* Активности и краш-тесты */}
      <UserActivities />
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Личный профиль</h1>
          <p className="text-muted-foreground">Управление профилем и отслеживание прогресса</p>
        </div>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className={`grid w-full ${isMobile ? 'grid-cols-2' : 'grid-cols-4'} bg-muted/50 p-1`}>
          <TabsTrigger value="profile" className={`flex items-center gap-2 ${isMobile ? 'text-xs' : ''} text-white data-[state=active]:bg-white data-[state=active]:text-black data-[state=active]:shadow-md border-2 border-transparent data-[state=active]:border-gray-300 font-semibold hover:bg-white/10`}>
            <User className="w-4 h-4" />
            {!isMobile && 'Профиль'}
          </TabsTrigger>
          <TabsTrigger value="progress" className={`flex items-center gap-2 ${isMobile ? 'text-xs' : ''} text-white data-[state=active]:bg-white data-[state=active]:text-black data-[state=active]:shadow-md border-2 border-transparent data-[state=active]:border-gray-300 font-semibold hover:bg-white/10`}>
            <TrendingUp className="w-4 h-4" />
            {!isMobile && 'Прогресс'}
          </TabsTrigger>
          {!isMobile && (
            <>
              <TabsTrigger value="habits" className="flex items-center gap-2 text-white data-[state=active]:bg-white data-[state=active]:text-black data-[state=active]:shadow-md border-2 border-transparent data-[state=active]:border-gray-300 font-semibold hover:bg-white/10">
                <Target className="w-4 h-4" />
                Привычки
              </TabsTrigger>
              <TabsTrigger value="tests" className="flex items-center gap-2 text-white data-[state=active]:bg-white data-[state=active]:text-black data-[state=active]:shadow-md border-2 border-transparent data-[state=active]:border-gray-300 font-semibold hover:bg-white/10">
                <Activity className="w-4 h-4" />
                Тесты
              </TabsTrigger>
            </>
          )}
          {isMobile && (
            <>
              <TabsTrigger value="habits" className="flex items-center gap-2 text-xs text-white data-[state=active]:bg-white data-[state=active]:text-black data-[state=active]:shadow-md border-2 border-transparent data-[state=active]:border-gray-300 font-semibold hover:bg-white/10">
                <Target className="w-4 h-4" />
              </TabsTrigger>
            </>
          )}
        </TabsList>
        
        {isMobile && (
          <TabsList className="grid w-full grid-cols-1 bg-muted/50 mt-2 p-1">
            <TabsTrigger value="tests" className="flex items-center gap-2 text-xs text-white data-[state=active]:bg-white data-[state=active]:text-black data-[state=active]:shadow-md border-2 border-transparent data-[state=active]:border-gray-300 font-semibold hover:bg-white/10">
              <Activity className="w-4 h-4" />
              Тесты
            </TabsTrigger>
          </TabsList>
        )}

        <TabsContent value="profile" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Основная информация</CardTitle>
                <Button
                  variant="outline"
                  onClick={() => setEditingProfile(!editingProfile)}
                  className="border-2 border-gray-600 hover:bg-gray-800 hover:border-gray-400 font-semibold"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  {editingProfile ? 'Отмена' : 'Редактировать'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {editingProfile ? (
                <div className="space-y-6">
                  {/* ФИО */}
                  <div>
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <User className="w-4 h-4 text-primary" />
                      Личные данные
                    </h3>
                    <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-3'} gap-4`}>
                      <div>
                        <Label>Фамилия *</Label>
                        <Input
                          value={profileForm.last_name}
                          onChange={(e) => setProfileForm(prev => ({ ...prev, last_name: e.target.value }))}
                          placeholder="Иванов"
                        />
                      </div>
                      <div>
                        <Label>Имя *</Label>
                        <Input
                          value={profileForm.first_name}
                          onChange={(e) => setProfileForm(prev => ({ ...prev, first_name: e.target.value }))}
                          placeholder="Иван"
                        />
                      </div>
                      <div>
                        <Label>Отчество</Label>
                        <Input
                          value={profileForm.middle_name}
                          onChange={(e) => setProfileForm(prev => ({ ...prev, middle_name: e.target.value }))}
                          placeholder="Иванович"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Контакты */}
                  <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-2'} gap-4`}>
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
                        <PopoverContent className="w-auto p-0 bg-white border border-gray-300 shadow-lg z-[9999]" align="start">
                          <Calendar
                            mode="single"
                            selected={profileForm.date_of_birth}
                            onSelect={(date) => setProfileForm(prev => ({ ...prev, date_of_birth: date }))}
                            disabled={(date) => date > new Date()}
                            initialFocus
                            className="pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div>
                      <Label>Телефон *</Label>
                      <Input
                        value={profileForm.phone}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, phone: e.target.value }))}
                        placeholder="+7 (999) 123-45-67"
                      />
                    </div>
                  </div>

                  <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-2'} gap-4`}>
                    <div>
                      <Label>E-mail</Label>
                      <Input
                        type="email"
                        value={profileForm.email}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="example@mail.ru"
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

                  {/* Паспортные данные */}
                  <div className="pt-4 border-t">
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-primary" />
                      Паспортные данные (для договора)
                    </h3>
                    <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-2'} gap-4`}>
                      <div>
                        <Label>Серия паспорта</Label>
                        <Input
                          value={contractForm.passport_series}
                          onChange={(e) => setContractForm(prev => ({ ...prev, passport_series: e.target.value }))}
                          placeholder="1234"
                          maxLength={4}
                        />
                      </div>
                      <div>
                        <Label>Номер паспорта</Label>
                        <Input
                          value={contractForm.passport_number}
                          onChange={(e) => setContractForm(prev => ({ ...prev, passport_number: e.target.value }))}
                          placeholder="567890"
                          maxLength={6}
                        />
                      </div>
                    </div>

                    <div className="mt-4">
                      <Label>Кем выдан</Label>
                      <Input
                        value={contractForm.passport_issued_by}
                        onChange={(e) => setContractForm(prev => ({ ...prev, passport_issued_by: e.target.value }))}
                        placeholder="ГУ МВД России по г. Москве"
                      />
                    </div>

                    <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-2'} gap-4 mt-4`}>
                      <div>
                        <Label>Дата выдачи</Label>
                        <Input
                          type="date"
                          value={contractForm.passport_issued_date}
                          onChange={(e) => setContractForm(prev => ({ ...prev, passport_issued_date: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label>Код подразделения</Label>
                        <Input
                          value={contractForm.passport_department_code}
                          onChange={(e) => setContractForm(prev => ({ ...prev, passport_department_code: e.target.value }))}
                          placeholder="770-001"
                        />
                      </div>
                    </div>

                    <div className="mt-4">
                      <Label>Адрес по прописке</Label>
                      <Input
                        value={contractForm.registration_address}
                        onChange={(e) => setContractForm(prev => ({ ...prev, registration_address: e.target.value }))}
                        placeholder="г. Москва, ул. Примерная, д. 1, кв. 1"
                      />
                    </div>

                    <div className="mt-4">
                      <Label>ИНН (при наличии)</Label>
                      <Input
                        value={contractForm.inn}
                        onChange={(e) => setContractForm(prev => ({ ...prev, inn: e.target.value }))}
                        placeholder="123456789012"
                        maxLength={12}
                      />
                    </div>
                  </div>

                  {/* Физические параметры */}
                  <div className="pt-4 border-t">
                    <h3 className="font-semibold mb-3">Физические параметры</h3>
                    <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-2'} gap-4`}>
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

                    <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-2'} gap-4 mt-4`}>
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
                  </div>

                  {/* Согласие на обработку ПД */}
                  <div className="pt-4 border-t">
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <Shield className="w-4 h-4 text-primary" />
                      Согласия
                    </h3>
                    <div className="p-4 bg-muted/50 rounded-lg border">
                      <div className="flex items-start space-x-3">
                        <Checkbox
                          id="personal_data_consent"
                          checked={profileForm.personal_data_consent}
                          onCheckedChange={handleConsentChange}
                          className="mt-1"
                        />
                        <div>
                          <Label htmlFor="personal_data_consent" className="text-sm font-medium cursor-pointer">
                            Согласие на обработку персональных данных *
                          </Label>
                          <p className="text-xs text-muted-foreground mt-1">
                            Я даю согласие на обработку моих персональных данных в соответствии с 
                            Федеральным законом от 27.07.2006 № 152-ФЗ «О персональных данных» 
                            для целей заключения и исполнения договора об оказании услуг.
                          </p>
                          {profileForm.personal_data_consent && profileForm.personal_data_consent_date && (
                            <p className="text-xs text-green-600 mt-2">
                              ✓ Согласие дано: {format(new Date(profileForm.personal_data_consent_date), "dd.MM.yyyy HH:mm")}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className={`flex ${isMobile ? 'flex-col' : 'flex-row'} gap-2 pt-4`}>
                    <Button onClick={handleProfileSave} className="bg-kamp-accent hover:bg-red-600 text-white font-bold shadow-lg">
                      Сохранить
                    </Button>
                    <Button variant="outline" onClick={() => setEditingProfile(false)} className="border-2 border-gray-600 hover:bg-gray-800 hover:border-gray-400 font-semibold">
                      Отмена
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-2'} gap-6`}>
                    <div>
                      <h3 className="font-semibold mb-2 flex items-center gap-2">
                        <User className="w-4 h-4 text-primary" />
                        Личные данные
                      </h3>
                      <div className="space-y-2 text-sm">
                        <p><span className="text-muted-foreground">Фамилия:</span> {profile?.last_name || 'Не указано'}</p>
                        <p><span className="text-muted-foreground">Имя:</span> {profile?.first_name || 'Не указано'}</p>
                        <p><span className="text-muted-foreground">Отчество:</span> {profile?.middle_name || 'Не указано'}</p>
                        <p><span className="text-muted-foreground">Дата рождения:</span> {profile?.date_of_birth ? format(new Date(profile.date_of_birth), "dd.MM.yyyy") : 'Не указано'}</p>
                        <p><span className="text-muted-foreground">Телефон:</span> {profile?.phone || 'Не указан'}</p>
                        <p><span className="text-muted-foreground">E-mail:</span> {profile?.email || user?.email || 'Не указан'}</p>
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

                  {/* Паспортные данные - только если заполнены */}
                  {(contractData.passport_series || contractData.passport_number) && (
                    <div className="pt-4 border-t">
                      <h3 className="font-semibold mb-2 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-primary" />
                        Паспортные данные
                      </h3>
                      <div className="space-y-2 text-sm">
                        <p><span className="text-muted-foreground">Серия и номер:</span> {contractData.passport_series} {contractData.passport_number}</p>
                        {contractData.passport_issued_by && <p><span className="text-muted-foreground">Кем выдан:</span> {contractData.passport_issued_by}</p>}
                        {contractData.passport_issued_date && <p><span className="text-muted-foreground">Дата выдачи:</span> {format(new Date(contractData.passport_issued_date), "dd.MM.yyyy")}</p>}
                        {contractData.passport_department_code && <p><span className="text-muted-foreground">Код подразделения:</span> {contractData.passport_department_code}</p>}
                        {contractData.registration_address && <p><span className="text-muted-foreground">Адрес прописки:</span> {contractData.registration_address}</p>}
                      </div>
                    </div>
                  )}

                  {/* Статус согласия */}
                  {profile?.personal_data_consent && (
                    <div className="pt-4 border-t">
                      <div className="flex items-center gap-2 text-sm text-green-600">
                        <Shield className="w-4 h-4" />
                        <span>Согласие на обработку ПД получено {profile.personal_data_consent_date && format(new Date(profile.personal_data_consent_date), "dd.MM.yyyy")}</span>
                      </div>
                    </div>
                  )}
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
                  <Button className="bg-kamp-accent hover:bg-red-600 text-white font-bold shadow-lg">
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
                          <PopoverContent className="w-auto p-0 bg-white border border-gray-300 shadow-lg z-[9999]" align="start">
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
                      <Button onClick={handleHabitSave} className="bg-kamp-accent hover:bg-red-600 text-white font-bold shadow-lg">
                        Добавить
                      </Button>
                      <Button variant="outline" onClick={() => setHabitDialogOpen(false)} className="border-2 border-gray-500 text-gray-200 hover:bg-gray-800 hover:border-gray-400 font-semibold">
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
          <CooperTestResults />
        </TabsContent>
      </Tabs>
    </div>
  );
};