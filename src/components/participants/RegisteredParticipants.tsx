import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users, Trophy, Star, TrendingUp, Target, Zap, Dumbbell, Book, Shield, ChevronDown, ChevronUp, Award, CheckCircle, XCircle, Activity } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Participant {
  id: string;
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  total_points: number;
  rank_position: number;
  breakdown?: Array<{ category: string; points: number }>;

  totems?: Array<{
    name: string;
    discipline: string;
  }>;
  crash_tests?: Array<{
    test_type: string;
    passed: boolean;
  }>;
  cooper_test_before?: {
    total_minutes: number | null;
    total_seconds: number | null;
    fitness_level: string | null;
    test_date: string;
  } | null;
  cooper_test_after?: {
    total_minutes: number | null;
    total_seconds: number | null;
    fitness_level: string | null;
    test_date: string;
  } | null;
}
export const RegisteredParticipants: React.FC = () => {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  useEffect(() => {
    const fetchParticipants = async () => {
      try {
        // Получаем активные потоки
        const { data: activeStreams } = await supabase
          .from('streams')
          .select('id')
          .eq('is_active', true);

        const activeStreamIds = activeStreams?.map(s => s.id) || [];

        // Получаем участников только с активным статусом из активных потоков
        let query = supabase
          .from('public_profiles')
          .select('id, user_id, first_name, last_name, display_name, total_points, rank_position, current_stream_id, participant_status')
          .eq('participant_status', 'intensive_active')
          .order('rank_position', { ascending: true })
          .limit(12);

        // Фильтруем только участников из активных потоков
        if (activeStreamIds.length > 0) {
          query = query.in('current_stream_id', activeStreamIds);
        }

        const { data: publicProfiles, error: profilesError } = await query;

        if (profilesError) throw profilesError;

        // Получаем реальную детализацию баллов (по формуле рейтинга)
        const userIds = publicProfiles?.map(p => p.user_id) || [];
        const { data: breakdownData, error: breakdownError } = await (supabase as any)
          .rpc('get_public_rating_breakdown', { p_user_ids: userIds });

        if (breakdownError) console.error('Error fetching rating breakdown:', breakdownError);


        // Получаем тотемы для каждого участника
        const { data: totemsData, error: totemsError } = await supabase
          .from('user_totems')
          .select(`
            user_id,
            totems (
              name,
              discipline
            )
          `)
          .in('user_id', userIds);

        if (totemsError) console.error('Error fetching totems:', totemsError);

        // Получаем краш-тесты для каждого участника
        const { data: crashTestsData, error: crashTestsError } = await supabase
          .from('crash_tests')
          .select('user_id, test_type, passed')
          .eq('verified', true)
          .in('user_id', userIds);

        if (crashTestsError) console.error('Error fetching crash tests:', crashTestsError);

        // Получаем результаты теста Купера для каждого участника (начало и конец)
        const { data: cooperTestsData, error: cooperTestsError } = await supabase
          .from('cooper_test_results')
          .select('user_id, total_minutes, total_seconds, fitness_level, test_date, test_phase')
          .eq('verified', true)
          .in('user_id', userIds)
          .order('test_date', { ascending: false });

        if (cooperTestsError) console.error('Error fetching Cooper tests:', cooperTestsError);

        // Объединяем данные
        const enrichedParticipants = publicProfiles?.map(profile => {
          const userTotems = totemsData?.filter(t => t.user_id === profile.user_id).map(t => t.totems) || [];
          const userCrashTests = crashTestsData?.filter(c => c.user_id === profile.user_id) || [];
          const userBreakdown = ((breakdownData as any[]) || [])
            .filter((b: any) => b.user_id === profile.user_id)
            .map((b: any) => ({ category: b.category as string, points: Number(b.points) || 0 }));
          
          // Получаем тесты "начало" и "конец"
          const userCooperTests = cooperTestsData?.filter(c => c.user_id === profile.user_id) || [];
          const cooperTestBefore = userCooperTests.find(c => c.test_phase === 'during_stream') || null;
          const cooperTestAfter = userCooperTests.find(c => c.test_phase === 'after_stream') || null;
          
          return {
            ...profile,
            breakdown: userBreakdown,
            totems: userTotems,
            crash_tests: userCrashTests,
            cooper_test_before: cooperTestBefore,
            cooper_test_after: cooperTestAfter,
          };
        }) || [];

        }) || [];

        setParticipants(enrichedParticipants);
      } catch (error) {
        console.error('Error fetching approved participants:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchParticipants();
    
    // Обновляем данные каждые 30 секунд
    const interval = setInterval(fetchParticipants, 30000);
    return () => clearInterval(interval);
  }, []);
  const formatName = (participant: Participant) => {
    if (participant.first_name && participant.last_name) {
      return `${participant.first_name} ${participant.last_name}`;
    }
    return participant.display_name || 'Участник';
  };
  const getRankIcon = (position: number) => {
    if (position === 1) return <Trophy className="w-4 h-4 text-yellow-500" />;
    if (position === 2) return <Trophy className="w-4 h-4 text-gray-400" />;
    if (position === 3) return <Trophy className="w-4 h-4 text-amber-600" />;
    return <Star className="w-4 h-4 text-kamp-accent" />;
  };

  const toggleExpanded = (participantId: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(participantId)) {
        newSet.delete(participantId);
      } else {
        newSet.add(participantId);
      }
      return newSet;
    });
  };

  const CATEGORY_META: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
    attendance: { label: 'Посещение', icon: <Dumbbell className="w-3 h-3" />, color: 'bg-green-100 text-green-800' },
    tactics: { label: 'Тактика', icon: <Shield className="w-3 h-3" />, color: 'bg-orange-100 text-orange-800' },
    homework: { label: 'Домашние задания', icon: <Book className="w-3 h-3" />, color: 'bg-purple-100 text-purple-800' },
    journal: { label: 'Ежедневник', icon: <Book className="w-3 h-3" />, color: 'bg-indigo-100 text-indigo-800' },
    crash_bjj: { label: 'Краш-тест БЖЖ', icon: <Target className="w-3 h-3" />, color: 'bg-blue-100 text-blue-800' },
    crash_kick: { label: 'Краш-тест Кикбоксинг', icon: <Zap className="w-3 h-3" />, color: 'bg-red-100 text-red-800' },
    hero_race: { label: 'Гонка Героев', icon: <Award className="w-3 h-3" />, color: 'bg-amber-100 text-amber-800' },
    ascetics: { label: 'Аскезы', icon: <CheckCircle className="w-3 h-3" />, color: 'bg-teal-100 text-teal-800' },
    pyramid: { label: 'Пирамида КЭМП', icon: <Target className="w-3 h-3" />, color: 'bg-yellow-100 text-yellow-800' },
  };

  const CATEGORY_ORDER = ['attendance', 'homework', 'journal', 'crash_bjj', 'crash_kick', 'hero_race', 'tactics', 'ascetics', 'pyramid'];

  const formatPoints = (value: number) => (Number.isInteger(value) ? `${value}` : value.toFixed(1));

  const getCategoryBadges = (participant: Participant) => {
    const items = participant.breakdown || [];
    return [...items]
      .filter(item => item.points > 0)
      .sort((a, b) => CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category))
      .map(item => {
        const meta = CATEGORY_META[item.category] || {
          label: item.category,
          icon: <Star className="w-3 h-3" />,
          color: 'bg-gray-100 text-gray-800',
        };
        return {
          label: `${meta.label}: ${formatPoints(item.points)}`,
          icon: meta.icon,
          color: meta.color,
        };
      });
  };


  const formatCooperTime = (minutes: number | null, seconds: number | null) => {
    if (minutes === null && seconds === null) return 'Нет данных';
    const mins = minutes || 0;
    const secs = seconds || 0;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getFitnessLevelLabel = (level: string | null) => {
    if (!level) return 'Нет данных';
    switch (level.toLowerCase()) {
      case 'excellent': return 'Отлично';
      case 'good': return 'Хорошо';
      case 'satisfactory': return 'Удовлетворительно';
      case 'poor': return 'Плохо';
      default: return level;
    }
  };

  const getFitnessLevelColor = (level: string | null) => {
    if (!level) return 'text-gray-400';
    switch (level.toLowerCase()) {
      case 'excellent': return 'text-green-600';
      case 'good': return 'text-blue-600';
      case 'satisfactory': return 'text-yellow-600';
      case 'poor': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };
  if (loading) {
    return <section id="participants" className="kamp-section py-4 md:py-16">
        <div className="kamp-container">
          <div className="section-heading reveal-on-scroll">
            <span className="inline-block text-kamp-accent font-semibold mb-1 text-sm md:text-base">Участники</span>
            <h2 className="text-gradient text-xl md:text-3xl">Участники КЭМП</h2>
            <p className="text-gray-400 text-sm md:text-base">
              Активные участники клуба и их достижения в системе геймификации
            </p>
          </div>
          
          <Card className="bg-white border-gray-300 mt-8">
            <CardContent className="p-8">
              <div className="text-center text-gray-400 py-8">
                <div className="animate-pulse">Загрузка участников...</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>;
  }
  return <section id="participants" className="kamp-section py-4 md:py-16">
      <div className="kamp-container">
        <div className="section-heading reveal-on-scroll">
          <span className="inline-block text-kamp-accent font-semibold mb-1 text-sm md:text-base">Участники</span>
          <h2 className="text-gradient text-xl md:text-3xl">Участники КЭМП</h2>
          <p className="text-gray-400 text-sm md:text-base">
            Активные участники клуба и их достижения в системе геймификации
          </p>
        </div>
        
        <Card className="bg-white border-gray-300 mt-8">
          <CardContent className="p-6">
            {participants.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-semibold mb-2 text-gray-700">Нет утвержденных участников</h3>
                <p className="text-sm text-gray-500">
                  Участники появятся здесь после их утверждения администратором
                </p>
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-2 mb-6">
                  <Users className="w-5 h-5 text-kamp-accent" />
                  <h3 className="text-lg font-semibold text-gray-900">
                    Участники ({participants.length})
                  </h3>
                </div>
                
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Позиция</TableHead>
                      <TableHead>Участник</TableHead>
                      <TableHead className="text-right">Очки</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {participants.map((participant, index) => {
                      const isExpanded = expandedRows.has(participant.id);
                      const categoryBadges = getCategoryBadges(participant);
                      
                      return (
                        <React.Fragment key={participant.id}>
                          <TableRow 
                            className="cursor-pointer hover:bg-gray-50"
                            onClick={() => toggleExpanded(participant.id)}
                          >
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getRankIcon(participant.rank_position || index + 1)}
                              <span className="font-semibold">
                                #{participant.rank_position || index + 1}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-semibold text-gray-900">
                                {formatName(participant)}
                              </div>
                              <div className="text-sm text-gray-500">
                                Участник КЭМП
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge variant="secondary" className="bg-kamp-accent text-white">
                              <TrendingUp className="w-3 h-3 mr-1" />
                              {participant.total_points} очков
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {expandedRows.has(participant.id) ? (
                              <ChevronUp className="w-4 h-4 text-gray-400" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-gray-400" />
                            )}
                          </TableCell>
                        </TableRow>
                        {expandedRows.has(participant.id) && (
                          <TableRow>
                            <TableCell colSpan={4} className="bg-gray-50 border-t-0">
                              <div className="py-3 px-2 space-y-4">
                                {/* Детализация баллов */}
                                <div>
                                  <p className="text-sm font-medium text-gray-700 mb-2">Детализация баллов:</p>
                                  <div className="flex flex-wrap gap-2">
                                    {categoryBadges.map((badge, badgeIndex) => (
                                      <Badge 
                                        key={badgeIndex} 
                                        variant="secondary"
                                        className={`${badge.color} flex items-center gap-1`}
                                      >
                                        {badge.icon}
                                        {badge.label}
                                      </Badge>
                                    ))}
                                    {categoryBadges.length === 0 && (
                                      <p className="text-sm text-gray-500">Нет активностей</p>
                                    )}
                                  </div>
                                 </div>

                                 {/* Результаты теста Купера */}
                                 {(participant.cooper_test_before || participant.cooper_test_after) && (
                                   <div>
                                     <p className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                                       <Activity className="w-4 h-4 text-blue-600" />
                                       Тест Купера:
                                     </p>
                                     <div className="space-y-2">
                                       {participant.cooper_test_before && (
                                         <div className="flex flex-wrap gap-2 items-center">
                                           <span className="text-xs text-gray-600 font-medium">Начало:</span>
                                           <Badge 
                                             variant="secondary"
                                             className="bg-blue-100 text-blue-800 flex items-center gap-1"
                                           >
                                             <Activity className="w-3 h-3" />
                                             {formatCooperTime(participant.cooper_test_before.total_minutes, participant.cooper_test_before.total_seconds)}
                                           </Badge>
                                           {participant.cooper_test_before.fitness_level && (
                                             <Badge 
                                               variant="secondary"
                                               className={`flex items-center gap-1 ${
                                                 participant.cooper_test_before.fitness_level.toLowerCase() === 'excellent' ? 'bg-green-100 text-green-800' :
                                                 participant.cooper_test_before.fitness_level.toLowerCase() === 'good' ? 'bg-blue-100 text-blue-800' :
                                                 participant.cooper_test_before.fitness_level.toLowerCase() === 'satisfactory' ? 'bg-yellow-100 text-yellow-800' :
                                                 'bg-red-100 text-red-800'
                                               }`}
                                             >
                                               <Target className="w-3 h-3" />
                                               {getFitnessLevelLabel(participant.cooper_test_before.fitness_level)}
                                             </Badge>
                                           )}
                                         </div>
                                       )}
                                       {participant.cooper_test_after && (
                                         <div className="flex flex-wrap gap-2 items-center">
                                           <span className="text-xs text-gray-600 font-medium">Конец:</span>
                                           <Badge 
                                             variant="secondary"
                                             className="bg-purple-100 text-purple-800 flex items-center gap-1"
                                           >
                                             <Activity className="w-3 h-3" />
                                             {formatCooperTime(participant.cooper_test_after.total_minutes, participant.cooper_test_after.total_seconds)}
                                           </Badge>
                                           {participant.cooper_test_after.fitness_level && (
                                             <Badge 
                                               variant="secondary"
                                               className={`flex items-center gap-1 ${
                                                 participant.cooper_test_after.fitness_level.toLowerCase() === 'excellent' ? 'bg-green-100 text-green-800' :
                                                 participant.cooper_test_after.fitness_level.toLowerCase() === 'good' ? 'bg-blue-100 text-blue-800' :
                                                 participant.cooper_test_after.fitness_level.toLowerCase() === 'satisfactory' ? 'bg-yellow-100 text-yellow-800' :
                                                 'bg-red-100 text-red-800'
                                               }`}
                                             >
                                               <Target className="w-3 h-3" />
                                               {getFitnessLevelLabel(participant.cooper_test_after.fitness_level)}
                                             </Badge>
                                           )}
                                         </div>
                                       )}
                                     </div>
                                   </div>
                                 )}

                                 {/* Тотемы */}
                                {participant.totems && participant.totems.length > 0 && (
                                  <div>
                                    <p className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                                      <Award className="w-4 h-4 text-yellow-600" />
                                      Полученные тотемы:
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                      {participant.totems.map((totem, idx) => (
                                        <Badge 
                                          key={idx} 
                                          variant="secondary"
                                          className="bg-yellow-100 text-yellow-800 flex items-center gap-1"
                                        >
                                          <Award className="w-3 h-3" />
                                          {totem.name} ({totem.discipline})
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Краш-тесты */}
                                {participant.crash_tests && participant.crash_tests.length > 0 && (
                                  <div>
                                    <p className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                                      <Shield className="w-4 h-4 text-green-600" />
                                      Пройденные краш-тесты:
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                      {participant.crash_tests.map((test, idx) => (
                                        <Badge 
                                          key={idx} 
                                          variant="secondary"
                                          className={`${test.passed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'} flex items-center gap-1`}
                                        >
                                          {test.passed ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                                          {test.test_type.toUpperCase()} {test.passed ? '✓' : '✗'}
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </section>;
};