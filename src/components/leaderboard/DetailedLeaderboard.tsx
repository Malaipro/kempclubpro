import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, Medal, Award, Target, Zap, Dumbbell, Book, Shield, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface DetailedLeaderboardEntry {
  id: string;
  user_id: string;
  total_points: number;
  bjj_points: number;
  kickboxing_points: number;
  ofp_points: number;
  theory_points: number;
  tactical_points: number;
  challenges_points: number;
  rank_position: number;
  display_name: string;
  last_updated: string;
  // Calculated fields for KAMP system
  bjj_zakals: number;
  bjj_scars: number;
  kick_zakals: number;
  kick_scars: number;
  ofp_zakals: number;
  ofp_scars: number;
  theory_grans: number;
  tactical_scars: number;
}

export const DetailedLeaderboard: React.FC = () => {
  const { user } = useAuth();
  const [leaderboard, setLeaderboard] = useState<DetailedLeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchLeaderboard();

    // Подписка на изменения в leaderboard
    const channel = supabase
      .channel('detailed-leaderboard-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'leaderboard'
        },
        () => {
          console.log('Leaderboard updated, refreshing');
          fetchLeaderboard();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Автоматическое обновление при появлении на странице
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchLeaderboard();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      // Получаем список админов для исключения из общего рейтинга
      const { data: adminUsers, error: adminError } = await supabase
        .from('user_roles')
        .select('user_id')
        .in('role', ['admin', 'super_admin']);

      if (adminError) {
        console.error('Error fetching admin users:', adminError);
      }

      const adminUserIds = adminUsers?.map(u => u.user_id) || [];

      // Используем public_profiles для публичного доступа
      let query = supabase
        .from('public_profiles')
        .select('*')
        .order('total_points', { ascending: false })
        .limit(10);

      // В общем рейтинге исключаем админов
      if (adminUserIds.length > 0) {
        query = query.not('user_id', 'in', `(${adminUserIds.join(',')})`);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching leaderboard:', error);
        toast.error('Ошибка загрузки рейтинга');
        return;
      }

      console.log('Leaderboard data:', data);

      // Получаем детальные баллы из leaderboard для каждого участника
      const detailedData = await Promise.all(
        (data || []).map(async (entry: any) => {
          const { data: leaderboardData } = await supabase
            .from('leaderboard')
            .select('bjj_points, kickboxing_points, ofp_points, theory_points, tactical_points, challenges_points')
            .eq('user_id', entry.user_id)
            .maybeSingle();

          const bbjPoints = leaderboardData?.bjj_points || 0;
          const kickPoints = leaderboardData?.kickboxing_points || 0;
          const ofpPoints = leaderboardData?.ofp_points || 0;
          const theoryPoints = leaderboardData?.theory_points || 0;
          const tacticalPoints = leaderboardData?.tactical_points || 0;

          return {
            id: entry.id,
            user_id: entry.user_id,
            total_points: entry.total_points || 0,
            bjj_points: bbjPoints,
            kickboxing_points: kickPoints,
            ofp_points: ofpPoints,
            theory_points: theoryPoints,
            tactical_points: tacticalPoints,
            challenges_points: leaderboardData?.challenges_points || 0,
            rank_position: entry.rank_position || 0,
            display_name: entry.first_name && entry.last_name 
              ? `${entry.first_name} ${entry.last_name}`
              : entry.display_name || 'Участник',
            last_updated: new Date().toISOString(),
            // Calculate KAMP system details
            bjj_zakals: bbjPoints,
            bjj_scars: Math.floor(bbjPoints / 10),
            kick_zakals: kickPoints,
            kick_scars: Math.floor(kickPoints / 10),
            ofp_zakals: ofpPoints,
            ofp_scars: Math.floor(ofpPoints / 10),
            theory_grans: theoryPoints,
            tactical_scars: tacticalPoints
          };
        })
      );

      setLeaderboard(detailedData);
      
      // Автоматически раскрываем детали для всех участников
      const allEntryIds = detailedData.map(entry => entry.id);
      setExpandedEntries(new Set(allEntryIds));

    } catch (error) {
      console.error('Error in fetchLeaderboard:', error);
      toast.error('Ошибка загрузки рейтинга');
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (position: number) => {
    if (position === 1) return <Trophy className="w-5 h-5 text-yellow-500" />;
    if (position === 2) return <Medal className="w-5 h-5 text-gray-400" />;
    if (position === 3) return <Award className="w-5 h-5 text-amber-600" />;
    return <span className="w-5 h-5 flex items-center justify-center text-sm font-bold">{position}</span>;
  };

  const toggleExpanded = (entryId: string) => {
    setExpandedEntries(prev => {
      const newSet = new Set(prev);
      if (newSet.has(entryId)) {
        newSet.delete(entryId);
      } else {
        newSet.add(entryId);
      }
      return newSet;
    });
  };

  const getCategoryDetails = (entry: DetailedLeaderboardEntry) => {
    const details = [];
    
    if (entry.bjj_points > 0) {
      details.push({ 
        label: 'БЖЖ',
        zakals: entry.bjj_zakals,
        scars: entry.bjj_scars,
        icon: <Target className="w-4 h-4" />,
        color: 'text-blue-400' 
      });
    }
    
    if (entry.kickboxing_points > 0) {
      details.push({ 
        label: 'Кикбоксинг',
        zakals: entry.kick_zakals,
        scars: entry.kick_scars,
        icon: <Zap className="w-4 h-4" />,
        color: 'text-red-400' 
      });
    }
    
    if (entry.ofp_points > 0) {
      details.push({ 
        label: 'ОФП',
        zakals: entry.ofp_zakals,
        scars: entry.ofp_scars,
        icon: <Dumbbell className="w-4 h-4" />,
        color: 'text-green-400' 
      });
    }
    
    if (entry.theory_points > 0) {
      details.push({ 
        label: 'Теория',
        zakals: entry.theory_grans,
        scars: 0, // Theory doesn't have scars
        icon: <Book className="w-4 h-4" />,
        color: 'text-purple-400',
        isTheory: true
      });
    }
    
    if (entry.tactical_points > 0) {
      details.push({ 
        label: 'Тактика',
        zakals: 0, // Tactical doesn't have zakals
        scars: entry.tactical_scars,
        icon: <Shield className="w-4 h-4" />,
        color: 'text-orange-400',
        isTactical: true
      });
    }

    return details;
  };

  return (
    <Card className="bg-white border-gray-300">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-gray-900">
            <Trophy className="w-5 h-5 text-kamp-accent" />
            Рейтинг участников
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchLeaderboard}
            disabled={loading}
            title="Обновить рейтинг"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin w-8 h-8 border-2 border-kamp-accent border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-sm text-gray-500">Загрузка рейтинга...</p>
          </div>
        ) : leaderboard.length === 0 ? (
          <div className="text-center py-8">
            <Trophy className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-semibold mb-2 text-gray-700">Нет утвержденных участников</h3>
            <p className="text-sm text-gray-500">
              Участники появятся здесь после их утверждения администратором
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {leaderboard.map((entry, index) => (
              <div
                key={entry.id}
                className={`border rounded-lg transition-colors ${
                  user && entry.user_id === user.id 
                    ? 'bg-kamp-accent/10 border-kamp-accent' 
                    : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div 
                  className="flex items-center justify-between p-4 cursor-pointer"
                  onClick={() => toggleExpanded(entry.id)}
                >
                  <div className="flex items-center gap-3">
                    {getRankIcon(entry.rank_position || index + 1)}
                    <div>
                      <p className="font-semibold text-gray-900">
                        {entry.display_name}
                        {user && entry.user_id === user.id && (
                          <span className="ml-2 text-sm text-kamp-accent">(Вы)</span>
                        )}
                      </p>
                      <p className="text-sm text-gray-500">
                        Место: {entry.rank_position || index + 1}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg text-kamp-accent">
                      {entry.total_points}
                    </p>
                    <p className="text-sm text-gray-500">баллов</p>
                  </div>
                </div>
                
                {expandedEntries.has(entry.id) && (
                  <div className="px-4 pb-4 border-t border-gray-200">
                    <div className="mt-3">
                      <p className="text-sm font-medium text-gray-700 mb-3">Детализация по дисциплинам КЭМП:</p>
                      <div className="space-y-3">
                        {getCategoryDetails(entry).map((detail, detailIndex) => (
                          <div 
                            key={detailIndex}
                            className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200"
                          >
                            <div className={`${detail.color} mt-1`}>
                              {detail.icon}
                            </div>
                            <div className="flex-1">
                              <p className="font-semibold text-gray-900 mb-1">{detail.label}</p>
                              <div className="flex flex-wrap gap-3 text-sm">
                                {!detail.isTactical && detail.zakals > 0 && (
                                  <span className="text-gray-600">
                                    {detail.isTheory ? 'Грани' : 'Закалы'}: <span className="font-semibold text-gray-900">{detail.zakals}</span>
                                  </span>
                                )}
                                {!detail.isTheory && detail.scars > 0 && (
                                  <span className="text-gray-600">
                                    Шрамы: <span className="font-semibold text-red-600">{detail.scars}</span>
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                        {getCategoryDetails(entry).length === 0 && (
                          <p className="text-sm text-gray-500 text-center py-2">Нет активностей</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};