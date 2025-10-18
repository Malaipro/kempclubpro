import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users, Trophy, Star, TrendingUp, Target, Zap, Dumbbell, Book, Shield, ChevronDown, ChevronUp, Award, CheckCircle, XCircle } from 'lucide-react';
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
  totems?: Array<{
    name: string;
    discipline: string;
  }>;
  crash_tests?: Array<{
    test_type: string;
    passed: boolean;
  }>;
}
export const RegisteredParticipants: React.FC = () => {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  useEffect(() => {
    const fetchParticipants = async () => {
      try {
        // Получаем участников вместе с их детализированными баллами из leaderboard
        const { data: publicProfiles, error: profilesError } = await supabase
          .from('public_profiles')
          .select('*')
          .order('total_points', { ascending: false })
          .limit(12);

        if (profilesError) throw profilesError;

        // Получаем детализацию баллов для каждого участника
        const userIds = publicProfiles?.map(p => p.user_id) || [];
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

        // Объединяем данные
        const enrichedParticipants = publicProfiles?.map(profile => {
          const leaderboardEntry = leaderboardData?.find(l => l.user_id === profile.user_id);
          const userTotems = totemsData?.filter(t => t.user_id === profile.user_id).map(t => t.totems) || [];
          const userCrashTests = crashTestsData?.filter(c => c.user_id === profile.user_id) || [];
          
          return {
            ...profile,
            bjj_points: leaderboardEntry?.bjj_points || 0,
            kickboxing_points: leaderboardEntry?.kickboxing_points || 0,
            ofp_points: leaderboardEntry?.ofp_points || 0,
            theory_points: leaderboardEntry?.theory_points || 0,
            tactical_points: leaderboardEntry?.tactical_points || 0,
            kamp_pyramid_points: leaderboardEntry?.kamp_pyramid_points || 0,
            nutrition_points: leaderboardEntry?.nutrition_points || 0,
            totems: userTotems,
            crash_tests: userCrashTests,
          };
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

  const getCategoryBadges = (participant: Participant) => {
    const badges = [];
    
    if (participant.bjj_points && participant.bjj_points > 0) {
      badges.push({ 
        label: `БЖЖ: ${participant.bjj_points}`, 
        icon: <Target className="w-3 h-3" />,
        color: 'bg-blue-100 text-blue-800' 
      });
    }
    
    if (participant.kickboxing_points && participant.kickboxing_points > 0) {
      badges.push({ 
        label: `Кикбоксинг: ${participant.kickboxing_points}`, 
        icon: <Zap className="w-3 h-3" />,
        color: 'bg-red-100 text-red-800' 
      });
    }
    
    if (participant.ofp_points && participant.ofp_points > 0) {
      badges.push({ 
        label: `ОФП: ${participant.ofp_points}`, 
        icon: <Dumbbell className="w-3 h-3" />,
        color: 'bg-green-100 text-green-800' 
      });
    }
    
    if (participant.theory_points && participant.theory_points > 0) {
      badges.push({ 
        label: `Теория: ${participant.theory_points}`, 
        icon: <Book className="w-3 h-3" />,
        color: 'bg-purple-100 text-purple-800' 
      });
    }
    
    if (participant.tactical_points && participant.tactical_points > 0) {
      badges.push({ 
        label: `Тактика: ${participant.tactical_points}`, 
        icon: <Shield className="w-3 h-3" />,
        color: 'bg-orange-100 text-orange-800' 
      });
    }
    
    if (participant.kamp_pyramid_points && participant.kamp_pyramid_points > 0) {
      badges.push({ 
        label: `Пирамида КЭМП: ${participant.kamp_pyramid_points}`, 
        icon: <Target className="w-3 h-3" />,
        color: 'bg-yellow-100 text-yellow-800' 
      });
    }
    
    if (participant.nutrition_points && participant.nutrition_points > 0) {
      badges.push({ 
        label: `Нутрициология: ${participant.nutrition_points}`, 
        icon: <Book className="w-3 h-3" />,
        color: 'bg-teal-100 text-teal-800' 
      });
    }

    return badges;
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