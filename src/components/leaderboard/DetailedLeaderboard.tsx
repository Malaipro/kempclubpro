import React from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, Medal, Award, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface DetailedLeaderboardEntry {
  id: string;
  user_id: string;
  total_points: number;
  rank_position: number;
  display_name: string;
  last_updated: string;
}

const fetchLeaderboardData = async (): Promise<DetailedLeaderboardEntry[]> => {
  // Параллельная загрузка активных потоков и администраторов
  const [streamsResult, adminResult] = await Promise.all([
    supabase.from('streams').select('id').eq('is_active', true),
    supabase.from('user_roles').select('user_id').in('role', ['admin', 'super_admin'])
  ]);

  const activeStreamIds = streamsResult.data?.map(s => s.id) || [];
  const adminUserIds = adminResult.data?.map(u => u.user_id) || [];

  // Используем public_profiles с фильтрацией по активным потокам и статусу
  let query = supabase
    .from('public_profiles')
    .select('user_id, first_name, last_name, display_name, total_points, rank_position, current_stream_id, participant_status')
    .eq('participant_status', 'intensive_active')
    .order('rank_position', { ascending: true })
    .limit(10);

  // Фильтруем только участников из активных потоков
  if (activeStreamIds.length > 0) {
    query = query.in('current_stream_id', activeStreamIds);
  }

  // В общем рейтинге исключаем админов
  if (adminUserIds.length > 0) {
    query = query.not('user_id', 'in', `(${adminUserIds.join(',')})`);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching leaderboard:', error);
    throw error;
  }

  return (data || []).map((entry: any) => ({
    id: entry.user_id,
    user_id: entry.user_id,
    total_points: entry.total_points || 0,
    rank_position: entry.rank_position || 0,
    display_name: entry.first_name && entry.last_name 
      ? `${entry.first_name} ${entry.last_name}`
      : entry.display_name || 'Участник',
    last_updated: new Date().toISOString()
  }));
};

export const DetailedLeaderboard: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Используем React Query с кешированием
  const { data: leaderboard = [], isLoading: loading, refetch } = useQuery({
    queryKey: ['detailed-leaderboard'],
    queryFn: fetchLeaderboardData,
    staleTime: 30000, // Данные считаются свежими 30 секунд
    gcTime: 5 * 60 * 1000, // Кеш хранится 5 минут
    refetchOnWindowFocus: true, // Обновляем при фокусе на окне
    retry: 2,
  });

  const handleRefresh = async () => {
    try {
      await refetch();
    } catch {
      toast.error('Ошибка загрузки рейтинга');
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
            onClick={handleRefresh}
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
                <div className="space-y-3">
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
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
