import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
        const {
          data,
          error
        } = await supabase.from('public_profiles').select('*').order('total_points', {
          ascending: false
        }).limit(12); // Показываем топ-12 участников

        if (error) throw error;
        setParticipants(data || []);
      } catch (error) {
        console.error('Error fetching approved participants:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchParticipants();
    
    // Обновляем данные каждые 30 секунд
    const interval = setInterval(fetchParticipants, 30000);
    return () => clearInterval(interval);
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
    return <section id="participants" className="kamp-section py-4 md:py-16">
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
      </section>;
  }
  return <section id="participants" className="kamp-section py-4 md:py-16">
      <div className="kamp-container">
        <div className="section-heading reveal-on-scroll">
          <span className="inline-block text-kamp-accent font-semibold mb-1 text-sm md:text-base">Участники</span>
          <h2 className="text-gradient text-xl md:text-3xl">Участники КЭМП</h2>
          <p className="text-gray-400 text-sm md:text-base">
            Активные участники клуба и их достижения в системе геймификации
          </p>
        </div>
        
        <Card className="bg-white border-gray-300 mt-8">
          <CardContent className="p-6">
            {participants.length === 0 ? (
              <div>
                <div className="flex items-center gap-2 mb-6">
                  <Users className="w-5 h-5 text-kamp-accent" />
                  <h3 className="text-lg font-semibold text-gray-900">
                    Топ участники (демо данные)
                  </h3>
                </div>
                
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Позиция</TableHead>
                      <TableHead>Участник</TableHead>
                      <TableHead className="text-right">Очки</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[
                      { id: '1', name: 'Иван Петров', points: 150, rank: 1 },
                      { id: '2', name: 'Александр Сидоров', points: 120, rank: 2 },
                      { id: '3', name: 'Дмитрий Козлов', points: 95, rank: 3 },
                      { id: '4', name: 'Михаил Волков', points: 80, rank: 4 },
                      { id: '5', name: 'Николай Морозов', points: 65, rank: 5 }
                    ].map((participant) => (
                      <TableRow key={participant.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getRankIcon(participant.rank)}
                            <span className="font-semibold">
                              #{participant.rank}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-semibold text-gray-900">
                              {participant.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              Участник КЭМП
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant="secondary" className="bg-kamp-accent text-white">
                            <TrendingUp className="w-3 h-3 mr-1" />
                            {participant.points} очков
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-2 mb-6">
                  <Users className="w-5 h-5 text-kamp-accent" />
                  <h3 className="text-lg font-semibold text-gray-900">
                    Утвержденные участники ({participants.length})
                  </h3>
                </div>
                
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Позиция</TableHead>
                      <TableHead>Участник</TableHead>
                      <TableHead className="text-right">Очки</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {participants.map((participant, index) => (
                      <TableRow key={participant.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getRankIcon(participant.rank_position || index + 1)}
                            <span className="font-semibold">
                              #{participant.rank_position || index + 1}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-semibold text-gray-900">
                              {formatName(participant)}
                            </div>
                            <div className="text-sm text-gray-500">
                              Участник КЭМП
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant="secondary" className="bg-kamp-accent text-white">
                            <TrendingUp className="w-3 h-3 mr-1" />
                            {participant.total_points} очков
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </section>;
};