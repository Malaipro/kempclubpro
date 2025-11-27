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
  bjj_points?: number;
  kickboxing_points?: number;
  ofp_points?: number;
  theory_points?: number;
  tactical_points?: number;
  kamp_pyramid_points?: number;
  nutrition_points?: number;
  club_joined_at?: string;
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

export const ClubResidentsList: React.FC = () => {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchParticipants = async () => {
      try {
        // Получаем резидентов клуба из публичной таблицы
        const { data: clubResidents, error: profilesError } = await supabase
          .from('public_profiles')
          .select('id, user_id, first_name, last_name, display_name, total_points, rank_position')
          .eq('participant_status', 'club_resident')
          .order('total_points', { ascending: false })
          .limit(50);

        if (profilesError) throw profilesError;

        // Получаем детализацию баллов для каждого участника
        const userIds = clubResidents?.map(p => p.user_id) || [];
        const { data: leaderboardData, error: leaderboardError } = await supabase
          .from('leaderboard')
          .select('user_id, bjj_points, kickboxing_points, ofp_points, theory_points, tactical_points, kamp_pyramid_points, nutrition_points')
          .in('user_id', userIds);

        if (leaderboardError) throw leaderboardError;

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
        const enrichedParticipants = clubResidents?.map(profile => {
          const leaderboardEntry = leaderboardData?.find(l => l.user_id === profile.user_id);
          const userTotems = totemsData?.filter(t => t.user_id === profile.user_id).map(t => t.totems) || [];
          const userCrashTests = crashTestsData?.filter(c => c.user_id === profile.user_id) || [];
          
          // Получаем тесты "начало" и "конец"
          const userCooperTests = cooperTestsData?.filter(c => c.user_id === profile.user_id) || [];
          const cooperTestBefore = userCooperTests.find(c => c.test_phase === 'during_stream') || null;
          const cooperTestAfter = userCooperTests.find(c => c.test_phase === 'after_stream') || null;
          
          return {
            ...profile,
            club_joined_at: null, // public_profiles doesn't have this field
            bjj_points: leaderboardEntry?.bjj_points || 0,
            kickboxing_points: leaderboardEntry?.kickboxing_points || 0,
            ofp_points: leaderboardEntry?.ofp_points || 0,
            theory_points: leaderboardEntry?.theory_points || 0,
            tactical_points: leaderboardEntry?.tactical_points || 0,
            kamp_pyramid_points: leaderboardEntry?.kamp_pyramid_points || 0,
            nutrition_points: leaderboardEntry?.nutrition_points || 0,
            totems: userTotems,
            crash_tests: userCrashTests,
            cooper_test_before: cooperTestBefore,
            cooper_test_after: cooperTestAfter,
          };
        }) || [];

        setParticipants(enrichedParticipants);
      } catch (error) {
        console.error('Error fetching club residents:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchParticipants();
  }, []);

  const toggleRow = (userId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(userId)) {
      newExpanded.delete(userId);
    } else {
      newExpanded.add(userId);
    }
    setExpandedRows(newExpanded);
  };

  const formatName = (participant: Participant): string => {
    if (participant.display_name) {
      return participant.display_name;
    }
    
    const parts = [];
    if (participant.first_name) parts.push(participant.first_name);
    if (participant.last_name) parts.push(participant.last_name);
    return parts.length > 0 ? parts.join(' ') : 'Участник';
  };

  const getPointsBadgeColor = (points: number) => {
    if (points >= 8) return 'bg-kamp-accent text-white';
    if (points >= 5) return 'bg-yellow-500 text-white';
    if (points >= 3) return 'bg-blue-500 text-white';
    return 'bg-gray-400 text-white';
  };

  const getCrashTestIcon = (testType: string, passed: boolean) => {
    if (!passed) return <XCircle className="w-4 h-4 text-red-500" />;
    
    switch (testType.toLowerCase()) {
      case 'bjj':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'kickboxing':
        return <CheckCircle className="w-4 h-4 text-blue-500" />;
      case 'ofp':
        return <CheckCircle className="w-4 h-4 text-yellow-500" />;
      default:
        return <CheckCircle className="w-4 h-4 text-gray-500" />;
    }
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

  const formatCooperTime = (minutes: number | null, seconds: number | null) => {
    if (minutes === null && seconds === null) return 'Нет данных';
    const mins = minutes || 0;
    const secs = seconds || 0;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Не указано';
    return new Date(dateString).toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="kamp-container py-12">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-kamp-accent"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="kamp-container py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-bold text-kamp-accent mb-4">
          Резиденты клуба КЭМП
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Выпускники интенсивов, продолжающие тренироваться в клубе
        </p>
      </div>

      {participants.length === 0 ? (
        <Card className="kamp-card">
          <CardContent className="py-12">
            <div className="text-center text-gray-400">
              <Users className="w-16 h-16 mx-auto mb-4 text-kamp-accent/50" />
              <h3 className="text-lg font-semibold mb-2">Пока нет резидентов</h3>
              <p className="text-sm">
                Резиденты клуба появятся после завершения первого интенсива
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="kamp-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-kamp-accent">
              <Users className="w-5 h-5" />
              Резиденты ({participants.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">Позиция</TableHead>
                    <TableHead>Участник</TableHead>
                    <TableHead className="text-center">Очки</TableHead>
                    <TableHead className="text-center hidden md:table-cell">В клубе с</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {participants.map((participant) => (
                    <React.Fragment key={participant.user_id}>
                      <TableRow 
                        className="hover:bg-kamp-accent/5 cursor-pointer transition-colors"
                        onClick={() => toggleRow(participant.user_id)}
                      >
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {participant.rank_position <= 3 ? (
                              <Trophy className={`w-5 h-5 ${
                                participant.rank_position === 1 ? 'text-yellow-500' :
                                participant.rank_position === 2 ? 'text-gray-400' :
                                'text-amber-700'
                              }`} />
                            ) : (
                              <Star className="w-5 h-5 text-gray-300" />
                            )}
                            <span className="text-kamp-accent font-bold">
                              #{participant.rank_position || '—'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-semibold text-foreground">
                              {formatName(participant)}
                            </div>
                            <Badge variant="outline" className="text-xs border-kamp-accent/30 text-kamp-accent">
                              Резидент КЭМП
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge className={getPointsBadgeColor(participant.total_points)}>
                            {participant.total_points} очков
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center hidden md:table-cell">
                          <span className="text-sm text-muted-foreground">
                            {formatDate(participant.club_joined_at)}
                          </span>
                        </TableCell>
                        <TableCell>
                          {expandedRows.has(participant.user_id) ? (
                            <ChevronUp className="w-5 h-5 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-muted-foreground" />
                          )}
                        </TableCell>
                      </TableRow>

                      {expandedRows.has(participant.user_id) && (
                        <TableRow>
                          <TableCell colSpan={5} className="bg-muted/50">
                            <div className="p-6 space-y-6">
                              {/* Детализация баллов */}
                              <div>
                                <h4 className="font-semibold mb-4 flex items-center gap-2 text-kamp-accent">
                                  <TrendingUp className="w-4 h-4" />
                                  Детализация баллов
                                </h4>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                  <div className="flex items-center gap-3 p-3 bg-background rounded-lg border">
                                    <Shield className="w-5 h-5 text-purple-500" />
                                    <div>
                                      <div className="text-xs text-muted-foreground">БЖЖ</div>
                                      <div className="font-bold text-foreground">{participant.bjj_points || 0}</div>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-3 p-3 bg-background rounded-lg border">
                                    <Target className="w-5 h-5 text-red-500" />
                                    <div>
                                      <div className="text-xs text-muted-foreground">Кикбоксинг</div>
                                      <div className="font-bold text-foreground">{participant.kickboxing_points || 0}</div>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-3 p-3 bg-background rounded-lg border">
                                    <Dumbbell className="w-5 h-5 text-blue-500" />
                                    <div>
                                      <div className="text-xs text-muted-foreground">ОФП</div>
                                      <div className="font-bold text-foreground">{participant.ofp_points || 0}</div>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-3 p-3 bg-background rounded-lg border">
                                    <Book className="w-5 h-5 text-green-500" />
                                    <div>
                                      <div className="text-xs text-muted-foreground">Теория</div>
                                      <div className="font-bold text-foreground">{participant.theory_points || 0}</div>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-3 p-3 bg-background rounded-lg border">
                                    <Zap className="w-5 h-5 text-yellow-500" />
                                    <div>
                                      <div className="text-xs text-muted-foreground">Тактика</div>
                                      <div className="font-bold text-foreground">{participant.tactical_points || 0}</div>
                                    </div>
                                  </div>
                                   <div className="flex items-center gap-3 p-3 bg-background rounded-lg border">
                                     <TrendingUp className="w-5 h-5 text-orange-500" />
                                     <div>
                                       <div className="text-xs text-muted-foreground">Пирамида КЭМП</div>
                                       <div className="font-bold text-foreground">{participant.kamp_pyramid_points || 0}</div>
                                     </div>
                                   </div>
                                   {(participant.cooper_test_before || participant.cooper_test_after) && (
                                     <>
                                       {participant.cooper_test_before && (
                                         <div className="flex items-center gap-3 p-3 bg-background rounded-lg border">
                                           <Activity className="w-5 h-5 text-blue-500" />
                                           <div>
                                             <div className="text-xs text-muted-foreground">Тест Купера (начало)</div>
                                             <div className="font-bold text-foreground">
                                               {formatCooperTime(participant.cooper_test_before.total_minutes, participant.cooper_test_before.total_seconds)}
                                               {participant.cooper_test_before.fitness_level && (
                                                 <span className={`ml-2 text-xs ${getFitnessLevelColor(participant.cooper_test_before.fitness_level)}`}>
                                                   ({getFitnessLevelLabel(participant.cooper_test_before.fitness_level)})
                                                 </span>
                                               )}
                                             </div>
                                           </div>
                                         </div>
                                       )}
                                       {participant.cooper_test_after && (
                                         <div className="flex items-center gap-3 p-3 bg-background rounded-lg border">
                                           <Target className="w-5 h-5 text-green-500" />
                                           <div>
                                             <div className="text-xs text-muted-foreground">Тест Купера (конец)</div>
                                             <div className="font-bold text-foreground">
                                               {formatCooperTime(participant.cooper_test_after.total_minutes, participant.cooper_test_after.total_seconds)}
                                               {participant.cooper_test_after.fitness_level && (
                                                 <span className={`ml-2 text-xs ${getFitnessLevelColor(participant.cooper_test_after.fitness_level)}`}>
                                                   ({getFitnessLevelLabel(participant.cooper_test_after.fitness_level)})
                                                 </span>
                                               )}
                                             </div>
                                           </div>
                                         </div>
                                       )}
                                     </>
                                   )}
                                 </div>
                               </div>

                              {/* Тотемы */}
                              {participant.totems && participant.totems.length > 0 && (
                                <div>
                                  <h4 className="font-semibold mb-4 flex items-center gap-2 text-kamp-accent">
                                    <Award className="w-4 h-4" />
                                    Заслуженные тотемы
                                  </h4>
                                  <div className="flex flex-wrap gap-2">
                                    {participant.totems.map((totem, idx) => (
                                      <Badge 
                                        key={idx} 
                                        variant="secondary"
                                        className="px-3 py-1"
                                      >
                                        {totem.name} ({totem.discipline})
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Краш-тесты */}
                              {participant.crash_tests && participant.crash_tests.length > 0 && (
                                <div>
                                  <h4 className="font-semibold mb-4 flex items-center gap-2 text-kamp-accent">
                                    <Target className="w-4 h-4" />
                                    Краш-тесты
                                  </h4>
                                  <div className="flex flex-wrap gap-3">
                                    {participant.crash_tests.map((test, idx) => (
                                      <div 
                                        key={idx}
                                        className="flex items-center gap-2 px-3 py-2 bg-background rounded-lg border"
                                      >
                                        {getCrashTestIcon(test.test_type, test.passed)}
                                        <span className="text-sm font-medium">
                                          {test.test_type.toUpperCase()}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
