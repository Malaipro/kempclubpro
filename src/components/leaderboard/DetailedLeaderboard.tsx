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
}

export const DetailedLeaderboard: React.FC = () => {
  const { user } = useAuth();
  const [leaderboard, setLeaderboard] = useState<DetailedLeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchLeaderboard();
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

          return {
            id: entry.id,
            user_id: entry.user_id,
            total_points: entry.total_points || 0,
            bjj_points: leaderboardData?.bjj_points || 0,
            kickboxing_points: leaderboardData?.kickboxing_points || 0,
            ofp_points: leaderboardData?.ofp_points || 0,
            theory_points: leaderboardData?.theory_points || 0,
            tactical_points: leaderboardData?.tactical_points || 0,
            challenges_points: leaderboardData?.challenges_points || 0,
            rank_position: entry.rank_position || 0,
            display_name: entry.first_name && entry.last_name 
              ? `${entry.first_name} ${entry.last_name}`
              : entry.display_name || 'Участник',
            last_updated: new Date().toISOString()
          };
        })
      );

      setLeaderboard(detailedData);

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

  const getCategoryBadges = (entry: DetailedLeaderboardEntry) => {
    const badges = [];
    
    if (entry.bjj_points > 0) {
      badges.push({ 
        label: `БЖЖ: ${entry.bjj_points}`, 
        icon: <Target className="w-3 h-3" />,
        color: 'bg-blue-100 text-blue-800' 
      });
    }
    
    if (entry.kickboxing_points > 0) {
      badges.push({ 
        label: `Кикбоксинг: ${entry.kickboxing_points}`, 
        icon: <Zap className="w-3 h-3" />,
        color: 'bg-red-100 text-red-800' 
      });
    }
    
    if (entry.ofp_points > 0) {
      badges.push({ 
        label: `ОФП: ${entry.ofp_points}`, 
        icon: <Dumbbell className="w-3 h-3" />,
        color: 'bg-green-100 text-green-800' 
      });
    }
    
    if (entry.theory_points > 0) {
      badges.push({ 
        label: `Теория: ${entry.theory_points}`, 
        icon: <Book className="w-3 h-3" />,
        color: 'bg-purple-100 text-purple-800' 
      });
    }
    
    if (entry.tactical_points > 0) {
      badges.push({ 
        label: `Тактика: ${entry.tactical_points}`, 
        icon: <Shield className="w-3 h-3" />,
        color: 'bg-orange-100 text-orange-800' 
      });
    }

    return badges;
  };

  return (
    <Card className="bg-white border-gray-300">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-gray-900">
            <Trophy className="w-5 h-5 text-kamp-accent" />
            Детальный рейтинг участников
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
                      <p className="text-sm font-medium text-gray-700 mb-2">Разбивка по категориям:</p>
                      <div className="flex flex-wrap gap-2">
                        {getCategoryBadges(entry).map((badge, badgeIndex) => (
                          <Badge 
                            key={badgeIndex} 
                            variant="secondary"
                            className={`${badge.color} flex items-center gap-1`}
                          >
                            {badge.icon}
                            {badge.label}
                          </Badge>
                        ))}
                        {getCategoryBadges(entry).length === 0 && (
                          <p className="text-sm text-gray-500">Нет активностей</p>
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