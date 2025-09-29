import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Trophy, Target, Zap, Dumbbell, Book, Shield, Award } from 'lucide-react';
import { toast } from 'sonner';

interface LeaderboardData {
  total_points: number;
  bjj_points: number;
  kickboxing_points: number;
  ofp_points: number;
  theory_points: number;
  tactical_points: number;
  rank_position: number;
}

export const ParticipantAchievements: React.FC = () => {
  const { user } = useAuth();
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchAchievements();
    }
  }, [user]);

  const fetchAchievements = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('leaderboard')
        .select('total_points, bjj_points, kickboxing_points, ofp_points, theory_points, tactical_points, rank_position')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching achievements:', error);
        toast.error('Ошибка загрузки достижений');
        return;
      }

      setLeaderboardData(data);
    } catch (error) {
      console.error('Error in fetchAchievements:', error);
      toast.error('Ошибка загрузки достижений');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-kamp-accent" />
            Мои достижения
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <div className="animate-spin w-6 h-6 border-2 border-kamp-accent border-t-transparent rounded-full mx-auto"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!leaderboardData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-kamp-accent" />
            Мои достижения
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-muted-foreground">
            <Award className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>Начните тренироваться, чтобы накопить баллы</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const categories = [
    { 
      label: 'БЖЖ', 
      points: leaderboardData.bjj_points, 
      icon: <Target className="w-4 h-4" />,
      color: 'bg-blue-100 text-blue-800' 
    },
    { 
      label: 'Кикбоксинг', 
      points: leaderboardData.kickboxing_points, 
      icon: <Zap className="w-4 h-4" />,
      color: 'bg-red-100 text-red-800' 
    },
    { 
      label: 'ОФП', 
      points: leaderboardData.ofp_points, 
      icon: <Dumbbell className="w-4 h-4" />,
      color: 'bg-green-100 text-green-800' 
    },
    { 
      label: 'Теория', 
      points: leaderboardData.theory_points, 
      icon: <Book className="w-4 h-4" />,
      color: 'bg-purple-100 text-purple-800' 
    },
    { 
      label: 'Тактика', 
      points: leaderboardData.tactical_points, 
      icon: <Shield className="w-4 h-4" />,
      color: 'bg-orange-100 text-orange-800' 
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-kamp-accent" />
          Мои достижения
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Общие баллы и место */}
          <div className="bg-gradient-to-r from-kamp-accent/10 to-kamp-accent/5 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Место в рейтинге</p>
                <p className="text-3xl font-bold text-kamp-accent">
                  {leaderboardData.rank_position || '-'}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Всего баллов</p>
                <p className="text-3xl font-bold">
                  {leaderboardData.total_points}
                </p>
              </div>
            </div>
          </div>

          {/* Разбивка по категориям */}
          <div>
            <h4 className="font-semibold mb-3 text-sm text-muted-foreground">Баллы по категориям:</h4>
            <div className="grid grid-cols-2 gap-2">
              {categories.map((category, index) => (
                <div 
                  key={index}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded ${category.color}`}>
                      {category.icon}
                    </div>
                    <span className="text-sm font-medium">{category.label}</span>
                  </div>
                  <span className="font-bold text-lg">{category.points}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};