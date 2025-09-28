import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Trophy, Star, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Participant {
  id: string;
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  total_points: number;
  rank_position: number;
}

export const RegisteredParticipants: React.FC = () => {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchParticipants = async () => {
      try {
        const { data, error } = await supabase
          .from('public_profiles')
          .select('*')
          .order('total_points', { ascending: false })
          .limit(12); // Показываем топ-12 участников

        if (error) throw error;
        setParticipants(data || []);
      } catch (error) {
        console.error('Error fetching approved participants:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchParticipants();
  }, []);

  const formatName = (participant: Participant) => {
    if (participant.first_name && participant.last_name) {
      return `${participant.first_name} ${participant.last_name}`;
    }
    return participant.display_name || 'Участник';
  };

  const getRankIcon = (position: number) => {
    if (position === 1) return <Trophy className="w-4 h-4 text-yellow-500" />;
    if (position === 2) return <Trophy className="w-4 h-4 text-gray-400" />;
    if (position === 3) return <Trophy className="w-4 h-4 text-amber-600" />;
    return <Star className="w-4 h-4 text-kamp-accent" />;
  };

  if (loading) {
    return (
      <section id="participants" className="kamp-section py-4 md:py-16">
        <div className="kamp-container">
          <div className="section-heading reveal-on-scroll">
            <span className="inline-block text-kamp-accent font-semibold mb-1 text-sm md:text-base">Участники</span>
            <h2 className="text-gradient text-xl md:text-3xl">Участники КЭМП</h2>
            <p className="text-gray-400 text-sm md:text-base">
              Активные участники клуба и их достижения в системе геймификации
            </p>
          </div>
          
          <Card className="bg-white border-gray-300 mt-8">
            <CardContent className="p-8">
              <div className="text-center text-gray-400 py-8">
                <div className="animate-pulse">Загрузка участников...</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    );
  }

  return (
    <section id="participants" className="kamp-section py-4 md:py-16">
      <div className="kamp-container">
        <div className="section-heading reveal-on-scroll">
          <span className="inline-block text-kamp-accent font-semibold mb-1 text-sm md:text-base">Участники</span>
          <h2 className="text-gradient text-xl md:text-3xl">Участники КЭМП</h2>
          <p className="text-gray-400 text-sm md:text-base">
            Активные участники клуба и их достижения в системе геймификации
          </p>
        </div>
        
        <Card className="bg-white border-gray-300 mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-900">
              <Users className="w-5 h-5 text-kamp-accent" />
              Утвержденные участники ({participants.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {participants.length === 0 ? (
              <div className="text-center text-gray-400 py-8">
                <Users className="w-16 h-16 mx-auto mb-4 text-kamp-accent/50" />
                <h3 className="text-lg font-semibold mb-2">Пока нет утвержденных участников</h3>
                <p className="text-sm">
                  Участники появятся после утверждения администратором
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {participants.map((participant, index) => (
                  <Card key={participant.id} className="bg-gray-50 border border-gray-200 hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          {getRankIcon(participant.rank_position || index + 1)}
                          <span className="text-lg font-semibold text-gray-900">
                            #{participant.rank_position || index + 1}
                          </span>
                        </div>
                        <Badge 
                          variant="secondary" 
                          className="bg-kamp-accent text-white flex items-center gap-1"
                        >
                          <TrendingUp className="w-3 h-3" />
                          {participant.total_points} очков
                        </Badge>
                      </div>
                      
                      <div className="text-center">
                        <h3 className="font-semibold text-gray-900 mb-1">
                          {formatName(participant)}
                        </h3>
                        <p className="text-sm text-gray-500">
                          Участник КЭМП
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
};