import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, Medal, Award, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface DetailedLeaderboardEntry {
  id: string;
  user_id: string;
  total_points: number;
  rank_position: number;
  display_name: string;
  last_updated: string;
}

export const DetailedLeaderboard: React.FC = () => {
  const { user } = useAuth();
  const [leaderboard, setLeaderboard] = useState<DetailedLeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

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

      const detailedData = (data || []).map((entry: any) => ({
        id: entry.id,
        user_id: entry.user_id,
        total_points: entry.total_points || 0,
        rank_position: entry.rank_position || 0,
        display_name: entry.first_name && entry.last_name 
          ? `${entry.first_name} ${entry.last_name}`
          : entry.display_name || 'Участник',
        last_updated: new Date().toISOString()
      }));

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
                className={`border rounded-lg p-4 transition-colors ${
                  user && entry.user_id === user.id 
                    ? 'bg-kamp-accent/10 border-kamp-accent' 
                    : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between">
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
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};