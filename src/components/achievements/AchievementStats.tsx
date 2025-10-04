import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Trophy, Star, Target, Award } from 'lucide-react';
interface AchievementCounts {
  totalAchievements: number;
  specialBadges: number;
  completedDirections: number;
  totemsEarned: number;
}
export const AchievementStats: React.FC = () => {
  const {
    data: stats,
    isLoading
  } = useQuery({
    queryKey: ['achievement-stats'],
    queryFn: async (): Promise<AchievementCounts> => {
      // Get approved participants first
      const {
        data: approvedProfiles,
        error: profilesError
      } = await supabase.from('profiles').select('user_id').eq('approved', true);
      if (profilesError) throw profilesError;
      const approvedUserIds = approvedProfiles?.map(p => p.user_id) || [];

      // Get total achievements only for approved participants
      const {
        count: totalAchievements
      } = await supabase.from('user_achievements').select('*', {
        count: 'exact',
        head: true
      }).in('user_id', approvedUserIds);

      // Calculate real achievement data based on approved participants
      const {
        data: leaderboard
      } = await supabase.from('leaderboard').select('*').in('user_id', approvedUserIds);

      // Calculate special badges (шрамы) - каждые 10 закалов = 1 шрам
      const totalZakals = leaderboard?.reduce((sum, p) => sum + (p.bjj_points || 0) + (p.kickboxing_points || 0) + (p.ofp_points || 0), 0) || 0;
      const specialBadges = Math.floor(totalZakals / 10);

      // Calculate completed directions (тотемы) - участники с баллами в определенных категориях
      const completedDirections = leaderboard?.filter(p => p.bjj_points && p.bjj_points >= 10 || p.kickboxing_points && p.kickboxing_points >= 10 || p.ofp_points && p.ofp_points >= 10).length || 0;

      // Calculate totems earned (тактические достижения)
      const totemsEarned = leaderboard?.reduce((sum, p) => sum + (p.tactical_points || 0), 0) || 0;
      return {
        totalAchievements: totalAchievements || 0,
        specialBadges: specialBadges || 0,
        completedDirections: completedDirections || 0,
        totemsEarned: totemsEarned || 0
      };
    }
  });
  if (isLoading) {
    return <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => <Card key={i} className="kamp-card animate-pulse">
            <CardContent className="p-6">
              <div className="space-y-3">
                <div className="w-8 h-8 bg-muted rounded mx-auto"></div>
                <div className="h-6 bg-muted rounded w-12 mx-auto"></div>
                <div className="h-4 bg-muted rounded w-full"></div>
              </div>
            </CardContent>
          </Card>)}
      </div>;
  }
  const statItems = [{
    icon: Trophy,
    value: stats?.totalAchievements || 0,
    label: 'Всего достижений',
    color: 'text-kamp-accent'
  }, {
    icon: Star,
    value: stats?.specialBadges || 0,
    label: 'Специальных значков',
    color: 'text-yellow-400'
  }, {
    icon: Target,
    value: stats?.completedDirections || 0,
    label: 'Направлений завершено',
    color: 'text-green-400'
  }, {
    icon: Award,
    value: stats?.totemsEarned || 0,
    label: 'Тотемов получено',
    color: 'text-purple-400'
  }];
  return <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {statItems.map((item, index) => <Card key={index} className="kamp-card hover-lift">
          
        </Card>)}
    </div>;
};