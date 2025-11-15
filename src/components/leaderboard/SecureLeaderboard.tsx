import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, Medal, Award } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface LeaderboardEntry {
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

export const SecureLeaderboard: React.FC = () => {
  const { user } = useAuth();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPersonalOnly, setShowPersonalOnly] = useState(false);

  useEffect(() => {
    fetchLeaderboard();
    
    // Обновляем данные каждые 30 секунд
    const interval = setInterval(fetchLeaderboard, 30000);
    return () => clearInterval(interval);
  }, [user, showPersonalOnly]);

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      // Получаем активные потоки
      const { data: activeStreams } = await supabase
        .from('streams')
        .select('id')
        .eq('is_active', true);

      const activeStreamIds = activeStreams?.map(s => s.id) || [];

      // Получаем список админов для исключения из общего рейтинга
      const { data: adminUsers, error: adminError } = await supabase
        .from('user_roles')
        .select('user_id')
        .in('role', ['admin', 'super_admin']);

      if (adminError) {
        console.error('Error fetching admin users:', adminError);
      }

      const adminUserIds = adminUsers?.map(u => u.user_id) || [];

      let query = supabase
        .from('leaderboard')
        .select(`
          id,
          user_id,
          total_points,
          bjj_points,
          kickboxing_points,
          ofp_points,
          theory_points,
          tactical_points,
          challenges_points,
          rank_position,
          last_updated,
          profiles!inner(display_name, approved, current_stream_id)
        `)
        .eq('profiles.approved', true)
        .order('rank_position', { ascending: true })
        .limit(showPersonalOnly ? 1 : 10);

      // Фильтруем только участников из активных потоков
      if (activeStreamIds.length > 0 && !showPersonalOnly) {
        query = query.in('profiles.current_stream_id', activeStreamIds);
      }

      if (showPersonalOnly && user) {
        query = query.eq('user_id', user.id);
      } else {
        // В общем рейтинге исключаем админов
        if (adminUserIds.length > 0) {
          query = query.not('user_id', 'in', `(${adminUserIds.join(',')})`);
        }
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching leaderboard:', error);
        toast.error('Ошибка загрузки рейтинга');
        return;
      }

      const formattedData = data?.map((entry: any) => ({
        id: entry.id,
        user_id: entry.user_id,
        total_points: entry.total_points,
        bjj_points: entry.bjj_points || 0,
        kickboxing_points: entry.kickboxing_points || 0,
        ofp_points: entry.ofp_points || 0,
        theory_points: entry.theory_points || 0,
        tactical_points: entry.tactical_points || 0,
        challenges_points: entry.challenges_points || 0,
        rank_position: entry.rank_position,
        display_name: entry.profiles?.display_name || 'Участник',
        last_updated: entry.last_updated
      })) || [];

      setLeaderboard(formattedData);
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


  return (
    <Card className="bg-white border-gray-300">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-gray-900">
            <Trophy className="w-5 h-5 text-kamp-accent" />
            Рейтинг участников
          </CardTitle>
          {user && (
            <div className="flex gap-2">
              <Button
                variant={!showPersonalOnly ? "default" : "outline"}
                size="sm"
                onClick={() => setShowPersonalOnly(false)}
              >
                Общий
              </Button>
              <Button
                variant={showPersonalOnly ? "default" : "outline"}
                size="sm"
                onClick={() => setShowPersonalOnly(true)}
              >
                Мой
              </Button>
            </div>
          )}
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
            <Trophy className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-semibold mb-2">Пока нет данных</h3>
            <p className="text-sm text-gray-500">
              {showPersonalOnly 
                ? 'У вас пока нет баллов в рейтинге' 
                : 'Рейтинг будет доступен после первых активностей участников'
              }
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {leaderboard.map((entry, index) => (
              <div
                key={entry.id}
                className={`flex items-center justify-between p-4 rounded-lg border transition-colors ${
                  user && entry.user_id === user.id 
                    ? 'bg-kamp-accent/10 border-kamp-accent' 
                    : 'bg-gray-50 border-gray-200'
                }`}
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
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};