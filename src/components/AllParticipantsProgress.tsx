import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, Users, Target, Medal } from 'lucide-react';
interface ProgressStats {
  totalPoints: number;
  totalZakals: number;
  totalGrans: number;
  totalShramy: number;
  participantCount: number;
  zakalsByType: {
    bjj: number;
    kick: number;
    ofp: number;
  };
  shramsByType: {
    bjj: number;
    kick: number;
    ofp: number;
    tactics: number;
  };
}
export const AllParticipantsProgress: React.FC = () => {
  const {
    data: progressStats,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['all-participants-progress'],
    queryFn: async (): Promise<ProgressStats> => {
      // Get approved participants from public_profiles (available to everyone)
      const {
        data: approvedProfiles,
        error: profilesError
      } = await supabase.from('public_profiles').select('user_id');
      if (profilesError) throw profilesError;
      const approvedUserIds = approvedProfiles?.map(p => p.user_id) || [];
      if (approvedUserIds.length === 0) {
        return {
          totalPoints: 0,
          totalZakals: 0,
          totalGrans: 0,
          totalShramy: 0,
          participantCount: 0,
          zakalsByType: {
            bjj: 0,
            kick: 0,
            ofp: 0
          },
          shramsByType: {
            bjj: 0,
            kick: 0,
            ofp: 0,
            tactics: 0
          }
        };
      }

      // Get leaderboard data only for approved participants
      const {
        data: leaderboard,
        error: leaderboardError
      } = await supabase.from('leaderboard').select('*').in('user_id', approvedUserIds);
      if (leaderboardError) throw leaderboardError;
      const participantCount = leaderboard?.length || 0;
      const totalPoints = leaderboard?.reduce((sum, p) => sum + (p.total_points || 0), 0) || 0;

      // Calculate stats from existing data
      const totalZakals = leaderboard?.reduce((sum, p) => sum + (p.bjj_points || 0) + (p.kickboxing_points || 0) + (p.ofp_points || 0), 0) || 0;
      const totalGrans = leaderboard?.reduce((sum, p) => sum + (p.theory_points || 0), 0) || 0;
      const totalShramy = leaderboard?.reduce((sum, p) => sum + (p.tactical_points || 0), 0) || 0;
      const zakalsByType = {
        bjj: leaderboard?.reduce((sum, p) => sum + (p.bjj_points || 0), 0) || 0,
        kick: leaderboard?.reduce((sum, p) => sum + (p.kickboxing_points || 0), 0) || 0,
        ofp: leaderboard?.reduce((sum, p) => sum + (p.ofp_points || 0), 0) || 0
      };
      const shramsByType = {
        bjj: Math.floor(zakalsByType.bjj / 10 || 0),
        kick: Math.floor(zakalsByType.kick / 10 || 0),
        ofp: Math.floor(zakalsByType.ofp / 10 || 0),
        tactics: leaderboard?.reduce((sum, p) => sum + (p.tactical_points || 0), 0) || 0
      };
      return {
        totalPoints,
        totalZakals,
        totalGrans,
        totalShramy,
        participantCount,
        zakalsByType,
        shramsByType
      };
    },
    refetchInterval: 30000,
    // Обновляем данные каждые 30 секунд
    staleTime: 10000 // Данные считаются устаревшими через 10 секунд
  });
  if (isLoading) {
    return <section className="kamp-section">
        <div className="kamp-container">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-kamp-accent mx-auto"></div>
            <p className="text-gray-400 mt-4">Загружаем прогресс участников...</p>
          </div>
        </div>
      </section>;
  }
  if (error || !progressStats) {
    return <section className="kamp-section">
        <div className="kamp-container">
          <div className="text-center text-red-400">
            Ошибка загрузки данных
          </div>
        </div>
      </section>;
  }
  const stats = progressStats;
  
  return (
    <section id="progress" className="kamp-section bg-black">
      <div className="kamp-container">
        <div className="section-heading reveal-on-scroll text-center mb-12">
          <span className="inline-block text-kamp-primary font-semibold mb-2 text-sm">
            Прогресс клуба
          </span>
          <h2 className="text-white text-3xl md:text-5xl mb-4">
            Общая статистика участников
          </h2>
          <p className="text-gray-300 text-sm md:text-base max-w-3xl mx-auto">
            Коллективные достижения всех участников КЭМП
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-gray-900 border-gray-800 reveal-on-scroll hover-lift">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">
                Участников
              </CardTitle>
              <Users className="h-4 w-4 text-kamp-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{stats.participantCount}</div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-800 reveal-on-scroll hover-lift">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">
                Всего баллов
              </CardTitle>
              <Trophy className="h-4 w-4 text-kamp-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{stats.totalPoints}</div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-800 reveal-on-scroll hover-lift">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">
                Закалов (Тренировки)
              </CardTitle>
              <Target className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{stats.totalZakals}</div>
              <div className="text-xs text-gray-400 mt-2 space-y-1">
                <div>BJJ: {stats.zakalsByType.bjj}</div>
                <div>Кикбоксинг: {stats.zakalsByType.kick}</div>
                <div>ОФП: {stats.zakalsByType.ofp}</div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-800 reveal-on-scroll hover-lift">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">
                Шрамов (Тактика)
              </CardTitle>
              <Medal className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{stats.totalShramy}</div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};