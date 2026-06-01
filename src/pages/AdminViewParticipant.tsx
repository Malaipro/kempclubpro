import React, { useState, useEffect, lazy, Suspense } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useRole } from '@/hooks/useRole';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, User, Target, Award, FileText, Calendar, Loader2, Coins, LayoutDashboard } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { ParticipantCoinsManager } from '@/components/admin/ParticipantCoinsManager';

// Lazy load heavy components
const DetailedLeaderboard = lazy(() => import('@/components/leaderboard/DetailedLeaderboard').then(m => ({ default: m.DetailedLeaderboard })));

interface ParticipantData {
  id: string;
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  middle_name: string | null;
  display_name: string | null;
  email: string | null;
  phone: string | null;
  telegram: string | null;
  date_of_birth: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  weight_before_stream: number | null;
  weight_after_stream: number | null;
  total_points: number | null;
  rank_position: number | null;
  participant_status: string | null;
  approved: boolean | null;
  current_stream_id: string | null;
  personal_data_consent: boolean | null;
  personal_data_consent_date: string | null;
}

interface LeaderboardData {
  bjj_points: number | null;
  kickboxing_points: number | null;
  ofp_points: number | null;
  theory_points: number | null;
  tactical_points: number | null;
  kamp_pyramid_points: number | null;
  nutrition_points: number | null;
  challenges_points: number | null;
  total_points: number | null;
}

interface ContractData {
  passport_series: string | null;
  passport_number: string | null;
  passport_issued_by: string | null;
  passport_issued_date: string | null;
  passport_department_code: string | null;
  registration_address: string | null;
  inn: string | null;
}

interface CooperTestResult {
  id: string;
  test_date: string;
  total_minutes: number | null;
  total_seconds: number | null;
  fitness_level: string | null;
  test_phase: string | null;
  verified: boolean | null;
}

interface Totem {
  id: string;
  name: string;
  discipline: string;
  totem_type: string;
  assigned_at: string;
}

export default function AdminViewParticipant() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { isAdmin, isSuperAdmin, loading: roleLoading } = useRole();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [participant, setParticipant] = useState<ParticipantData | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardData | null>(null);
  const [contractData, setContractData] = useState<ContractData | null>(null);
  const [cooperTests, setCooperTests] = useState<CooperTestResult[]>([]);
  const [totems, setTotems] = useState<Totem[]>([]);
  const [streamName, setStreamName] = useState<string>('');

  useEffect(() => {
    if (!roleLoading && !isAdmin && !isSuperAdmin) {
      toast({
        title: 'Доступ запрещен',
        description: 'У вас нет прав для просмотра этой страницы',
        variant: 'destructive',
      });
      navigate('/dashboard');
      return;
    }

    if (userId && !roleLoading && (isAdmin || isSuperAdmin)) {
      loadParticipantData();
    }
  }, [userId, roleLoading, isAdmin, isSuperAdmin]);

  const loadParticipantData = async () => {
    if (!userId) return;

    try {
      // Fetch all data in parallel
      const [
        profileResult,
        leaderboardResult,
        contractResult,
        cooperResult,
        totemsResult
      ] = await Promise.all([
        supabase.from('profiles').select('*').eq('user_id', userId).single(),
        supabase.from('leaderboard').select('*').eq('user_id', userId).maybeSingle(),
        supabase.from('contract_data').select('*').eq('user_id', userId).maybeSingle(),
        supabase.from('cooper_test_results').select('*').eq('user_id', userId).order('test_date', { ascending: false }),
        supabase.from('user_totems').select('*, totems(*)').eq('user_id', userId)
      ]);

      if (profileResult.error) throw profileResult.error;
      
      setParticipant(profileResult.data);
      setLeaderboard(leaderboardResult.data);
      setContractData(contractResult.data);
      setCooperTests(cooperResult.data || []);
      
      // Process totems
      const processedTotems = (totemsResult.data || []).map((ut: any) => ({
        id: ut.totem_id,
        name: ut.totems?.name || 'Неизвестный тотем',
        discipline: ut.totems?.discipline || '',
        totem_type: ut.totems?.totem_type || '',
        assigned_at: ut.assigned_at
      }));
      setTotems(processedTotems);

      // Fetch stream name if available
      if (profileResult.data?.current_stream_id) {
        const { data: streamData } = await supabase
          .from('streams')
          .select('name')
          .eq('id', profileResult.data.current_stream_id)
          .single();
        setStreamName(streamData?.name || '');
      }

    } catch (error) {
      console.error('Error loading participant data:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось загрузить данные участника',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getFullName = () => {
    if (!participant) return 'Участник';
    return [participant.last_name, participant.first_name, participant.middle_name]
      .filter(Boolean)
      .join(' ') || participant.display_name || 'Участник';
  };

  const getStatusLabel = (status: string | null) => {
    switch (status) {
      case 'intensive_active': return 'Активный участник интенсива';
      case 'intensive_completed': return 'Завершил интенсив';
      case 'club_resident': return 'Резидент клуба';
      case 'alumni': return 'Выпускник';
      default: return 'Не указан';
    }
  };

  const formatCooperTime = (minutes: number | null, seconds: number | null) => {
    if (minutes === null && seconds === null) return 'Не указано';
    const m = minutes || 0;
    const s = seconds || 0;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (roleLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Загрузка данных участника...</p>
        </div>
      </div>
    );
  }

  if (!participant) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <User className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">Участник не найден</h2>
            <p className="text-muted-foreground mb-4">Не удалось найти данные участника</p>
            <Button onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Вернуться в панель
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="outline" onClick={() => navigate('/dashboard')}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Назад
              </Button>
              <div>
                <h1 className="text-xl font-bold">{getFullName()}</h1>
                <p className="text-sm text-muted-foreground">Просмотр ЛК участника</p>
              </div>
            </div>
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
              Режим администратора
            </Badge>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-6">
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="mb-6 flex-wrap h-auto">
            <TabsTrigger value="overview" className="gap-2">
              <LayoutDashboard className="w-4 h-4" />
              Обзор
            </TabsTrigger>
            <TabsTrigger value="profile" className="gap-2">
              <User className="w-4 h-4" />
              Профиль
            </TabsTrigger>
            <TabsTrigger value="progress" className="gap-2">
              <Target className="w-4 h-4" />
              Прогресс
            </TabsTrigger>
            <TabsTrigger value="achievements" className="gap-2">
              <Award className="w-4 h-4" />
              Достижения
            </TabsTrigger>
            <TabsTrigger value="documents" className="gap-2">
              <FileText className="w-4 h-4" />
              Документы
            </TabsTrigger>
            <TabsTrigger value="coins" className="gap-2">
              <Coins className="w-4 h-4" />
              Коины
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Personal Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="w-5 h-5" />
                    Личные данные
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">ФИО:</span>
                      <p className="font-medium">{getFullName()}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Email:</span>
                      <p className="font-medium">{participant.email || 'Не указан'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Телефон:</span>
                      <p className="font-medium">{participant.phone || 'Не указан'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Telegram:</span>
                      <p className="font-medium">{participant.telegram || 'Не указан'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Дата рождения:</span>
                      <p className="font-medium">
                        {participant.date_of_birth 
                          ? format(new Date(participant.date_of_birth), 'dd.MM.yyyy')
                          : 'Не указана'}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Рост/Вес:</span>
                      <p className="font-medium">
                        {participant.height_cm ? `${participant.height_cm} см` : '-'} / {participant.weight_kg ? `${participant.weight_kg} кг` : '-'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Status Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    Статус участия
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Статус:</span>
                      <p className="font-medium">{getStatusLabel(participant.participant_status)}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Поток:</span>
                      <p className="font-medium">{streamName || 'Не указан'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Утвержден:</span>
                      <p className="font-medium">{participant.approved ? 'Да' : 'Нет'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Согласие ПД:</span>
                      <p className="font-medium">{participant.personal_data_consent ? 'Получено' : 'Нет'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Позиция в рейтинге:</span>
                      <p className="font-medium">{participant.rank_position || 'Не определена'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Всего баллов:</span>
                      <p className="font-medium text-primary">{participant.total_points || 0}</p>
                    </div>
                  </div>

                  {(participant.weight_before_stream || participant.weight_after_stream) && (
                    <div className="pt-4 border-t">
                      <h4 className="font-medium mb-2">Изменение веса</h4>
                      <div className="flex items-center gap-4 text-sm">
                        <span>До: {participant.weight_before_stream || '-'} кг</span>
                        <span>→</span>
                        <span>После: {participant.weight_after_stream || '-'} кг</span>
                        {participant.weight_before_stream && participant.weight_after_stream && (
                          <Badge variant={participant.weight_after_stream < participant.weight_before_stream ? 'default' : 'secondary'}>
                            {participant.weight_after_stream - participant.weight_before_stream} кг
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Progress Tab */}
          <TabsContent value="progress">
            <div className="grid gap-6">
              {/* Points Breakdown */}
              {leaderboard && (
                <Card>
                  <CardHeader>
                    <CardTitle>Детализация баллов</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <p className="text-sm text-muted-foreground">БЖЖ</p>
                        <p className="text-2xl font-bold text-blue-600">{leaderboard.bjj_points || 0}</p>
                      </div>
                      <div className="p-4 bg-red-50 rounded-lg">
                        <p className="text-sm text-muted-foreground">Кикбоксинг</p>
                        <p className="text-2xl font-bold text-red-600">{leaderboard.kickboxing_points || 0}</p>
                      </div>
                      <div className="p-4 bg-green-50 rounded-lg">
                        <p className="text-sm text-muted-foreground">ОФП</p>
                        <p className="text-2xl font-bold text-green-600">{leaderboard.ofp_points || 0}</p>
                      </div>
                      <div className="p-4 bg-purple-50 rounded-lg">
                        <p className="text-sm text-muted-foreground">Теория</p>
                        <p className="text-2xl font-bold text-purple-600">{leaderboard.theory_points || 0}</p>
                      </div>
                      <div className="p-4 bg-yellow-50 rounded-lg">
                        <p className="text-sm text-muted-foreground">Тактика</p>
                        <p className="text-2xl font-bold text-yellow-600">{leaderboard.tactical_points || 0}</p>
                      </div>
                      <div className="p-4 bg-orange-50 rounded-lg">
                        <p className="text-sm text-muted-foreground">Пирамида КЭМП</p>
                        <p className="text-2xl font-bold text-orange-600">{leaderboard.kamp_pyramid_points || 0}</p>
                      </div>
                      <div className="p-4 bg-teal-50 rounded-lg">
                        <p className="text-sm text-muted-foreground">Питание</p>
                        <p className="text-2xl font-bold text-teal-600">{leaderboard.nutrition_points || 0}</p>
                      </div>
                      <div className="p-4 bg-indigo-50 rounded-lg">
                        <p className="text-sm text-muted-foreground">Челленджи</p>
                        <p className="text-2xl font-bold text-indigo-600">{leaderboard.challenges_points || 0}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Cooper Tests */}
              <Card>
                <CardHeader>
                  <CardTitle>Тесты Купера</CardTitle>
                </CardHeader>
                <CardContent>
                  {cooperTests.length > 0 ? (
                    <div className="space-y-3">
                      {cooperTests.map(test => (
                        <div key={test.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                          <div>
                            <p className="font-medium">
                              {format(new Date(test.test_date), 'dd.MM.yyyy', { locale: ru })}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {test.test_phase === 'before_stream' ? 'До интенсива' : 
                               test.test_phase === 'after_stream' ? 'После интенсива' : 'Во время интенсива'}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-lg">{formatCooperTime(test.total_minutes, test.total_seconds)}</p>
                            <Badge variant={test.verified ? 'default' : 'secondary'}>
                              {test.fitness_level || 'Не определен'}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-4">Тесты Купера не пройдены</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Achievements Tab */}
          <TabsContent value="achievements">
            <Card>
              <CardHeader>
                <CardTitle>Полученные тотемы</CardTitle>
              </CardHeader>
              <CardContent>
                {totems.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {totems.map(totem => (
                      <div key={totem.id} className="p-4 border rounded-lg text-center">
                        <Award className="w-8 h-8 mx-auto mb-2 text-primary" />
                        <p className="font-medium">{totem.name}</p>
                        <p className="text-sm text-muted-foreground">{totem.discipline}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(totem.assigned_at), 'dd.MM.yyyy')}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">Тотемы пока не получены</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents">
            <Card>
              <CardHeader>
                <CardTitle>Паспортные данные</CardTitle>
              </CardHeader>
              <CardContent>
                {contractData ? (
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Серия и номер:</span>
                      <p className="font-medium">
                        {contractData.passport_series} {contractData.passport_number}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Дата выдачи:</span>
                      <p className="font-medium">
                        {contractData.passport_issued_date 
                          ? format(new Date(contractData.passport_issued_date), 'dd.MM.yyyy')
                          : 'Не указана'}
                      </p>
                    </div>
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Кем выдан:</span>
                      <p className="font-medium">{contractData.passport_issued_by || 'Не указано'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Код подразделения:</span>
                      <p className="font-medium">{contractData.passport_department_code || 'Не указан'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">ИНН:</span>
                      <p className="font-medium">{contractData.inn || 'Не указан'}</p>
                    </div>
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Адрес прописки:</span>
                      <p className="font-medium">{contractData.registration_address || 'Не указан'}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">Паспортные данные не заполнены</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Coins Tab */}
          <TabsContent value="coins">
            {userId && <ParticipantCoinsManager userId={userId} />}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
