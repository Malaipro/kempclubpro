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
  const { data: stats, isLoading } = useQuery({
    queryKey: ['achievement-stats'],
    queryFn: async (): Promise<AchievementCounts> => {
      // Get total achievements from existing table
      const { count: totalAchievements } = await supabase
        .from('user_achievements')
        .select('*', { count: 'exact', head: true });

      // Use placeholder data for non-existent tables
      const specialBadges = 0;
      const completedDirections = 0;
      const totemsEarned = 0;

      return {
        totalAchievements: totalAchievements || 0,
        specialBadges: specialBadges || 0,
        completedDirections: completedDirections || 0,
        totemsEarned: totemsEarned || 0,
      };
    },
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="kamp-card animate-pulse">
            <CardContent className="p-6">
              <div className="space-y-3">
                <div className="w-8 h-8 bg-muted rounded mx-auto"></div>
                <div className="h-6 bg-muted rounded w-12 mx-auto"></div>
                <div className="h-4 bg-muted rounded w-full"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const statItems = [
    {
      icon: Trophy,
      value: stats?.totalAchievements || 0,
      label: 'Всего достижений',
      color: 'text-kamp-accent'
    },
    {
      icon: Star,
      value: stats?.specialBadges || 0,
      label: 'Специальных значков',
      color: 'text-yellow-400'
    },
    {
      icon: Target,
      value: stats?.completedDirections || 0,
      label: 'Направлений завершено',
      color: 'text-green-400'
    },
    {
      icon: Award,
      value: stats?.totemsEarned || 0,
      label: 'Тотемов получено',
      color: 'text-purple-400'
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {statItems.map((item, index) => (
        <Card key={index} className="kamp-card hover-lift">
          <CardContent className="p-6 text-center space-y-3">
            <item.icon className={`w-8 h-8 mx-auto ${item.color}`} />
            <div className={`text-2xl font-bold ${item.color}`}>
              {item.value}
            </div>
            <div className="text-sm text-gray-400">
              {item.label}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};