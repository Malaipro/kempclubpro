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

  // Подписка на изменения в leaderboard
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('user-leaderboard-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'leaderboard',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Leaderboard updated:', payload);
          fetchAchievements();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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

  const disciplines = [
    { 
      label: 'БЖЖ', 
      zakals: leaderboardData.bjj_points,
      scars: Math.floor(leaderboardData.bjj_points / 10),
      icon: <Target className="w-5 h-5" />,
      color: 'bg-blue-500/10 border-blue-500/30',
      textColor: 'text-blue-400'
    },
    { 
      label: 'Кикбоксинг', 
      zakals: leaderboardData.kickboxing_points,
      scars: Math.floor(leaderboardData.kickboxing_points / 10),
      icon: <Zap className="w-5 h-5" />,
      color: 'bg-red-500/10 border-red-500/30',
      textColor: 'text-red-400'
    },
    { 
      label: 'ОФП', 
      zakals: leaderboardData.ofp_points,
      scars: Math.floor(leaderboardData.ofp_points / 10),
      icon: <Dumbbell className="w-5 h-5" />,
      color: 'bg-green-500/10 border-green-500/30',
      textColor: 'text-green-400'
    },
    { 
      label: 'Теория', 
      zakals: leaderboardData.theory_points,
      scars: 0, // Theory uses 'grans', not scars
      icon: <Book className="w-5 h-5" />,
      color: 'bg-purple-500/10 border-purple-500/30',
      textColor: 'text-purple-400',
      isTheory: true
    },
    { 
      label: 'Тактика', 
      zakals: 0, // Tactical doesn't have zakals
      scars: leaderboardData.tactical_points,
      icon: <Shield className="w-5 h-5" />,
      color: 'bg-orange-500/10 border-orange-500/30',
      textColor: 'text-orange-400',
      isTactical: true
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

          {/* Детализация по дисциплинам КЭМП */}
          <div>
            <h4 className="font-semibold mb-3 text-sm flex items-center gap-2">
              <Award className="w-4 h-4 text-kamp-accent" />
              Детализация по дисциплинам КЭМП:
            </h4>
            <div className="space-y-3">
              {disciplines.filter(d => d.zakals > 0 || d.scars > 0).map((discipline, index) => (
                <div 
                  key={index}
                  className={`p-4 rounded-lg border ${discipline.color}`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`${discipline.textColor} mt-1`}>
                      {discipline.icon}
                    </div>
                    <div className="flex-1">
                      <h5 className="font-semibold text-gray-900 mb-2">{discipline.label}</h5>
                      <div className="flex flex-wrap gap-4 text-sm">
                        {!discipline.isTactical && discipline.zakals > 0 && (
                          <div className="flex items-center gap-2">
                            <Target className="w-4 h-4 text-gray-500" />
                            <span className="text-gray-600">
                              {discipline.isTheory ? 'Грани' : 'Закалы'}: <span className="font-bold text-gray-900">{discipline.zakals}</span>
                            </span>
                          </div>
                        )}
                        {!discipline.isTheory && discipline.scars > 0 && (
                          <div className="flex items-center gap-2">
                            <Award className="w-4 h-4 text-red-500" />
                            <span className="text-gray-600">
                              Шрамы: <span className="font-bold text-red-600">{discipline.scars}</span>
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {disciplines.filter(d => d.zakals > 0 || d.scars > 0).length === 0 && (
                <div className="text-center py-6 text-gray-400">
                  <Trophy className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Активности пока не зафиксированы</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};