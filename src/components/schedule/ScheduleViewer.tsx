import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format, isToday, isTomorrow, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';

interface Schedule {
  id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  location: string | null;
  activity_type: string;
  max_participants: number | null;
  is_active: boolean;
  instructor_id: string | null;
  color: string | null;
}

export const ScheduleViewer: React.FC = () => {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchSchedules = async () => {
    try {
      const { data, error } = await supabase
        .from('schedules')
        .select('*')
        .eq('is_active', true)
        .order('start_time', { ascending: true });

      if (error) throw error;
      setSchedules(data || []);
    } catch (error) {
      console.error('Error fetching schedules:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось загрузить расписание',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchSchedules();
      setLoading(false);
    };

    loadData();
  }, []);

  const getDateLabel = (dateString: string) => {
    const date = parseISO(dateString);
    if (isToday(date)) return 'Сегодня';
    if (isTomorrow(date)) return 'Завтра';
    return format(date, 'dd MMMM', { locale: ru });
  };

  const getActivityTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'kickboxing':
      case 'кикбоксинг':
        return 'bg-red-600';
      case 'bjj':
      case 'бжж':
        return 'bg-blue-600';
      case 'ofp':
      case 'офп':
        return 'bg-green-600';
      case 'tactical':
      case 'тактика':
        return 'bg-purple-600';
      default:
        return 'bg-gray-600';
    }
  };

  if (loading) {
    return (
      <div className="bg-gray-900 p-6 rounded-lg">
        <div className="text-center py-8">
          <div className="animate-pulse text-gray-400">Загрузка расписания...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 p-6 rounded-lg">
      <div className="flex items-center gap-2 mb-6">
        <Calendar className="w-5 h-5 text-destructive" />
        <h2 className="text-xl font-semibold text-destructive">Расписание</h2>
      </div>

      {schedules.length === 0 ? (
        <div className="text-center text-gray-400 py-8">
          <Calendar className="w-16 h-16 mx-auto mb-4 text-destructive/50" />
          <h3 className="text-lg font-semibold mb-2 text-white">Нет предстоящих занятий</h3>
          <p className="text-sm">
            Расписание занятий появится здесь
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {schedules.map((schedule) => (
            <Card key={schedule.id} className="bg-gray-800 border-gray-700">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge 
                        className="text-white"
                        style={{ backgroundColor: schedule.color || getActivityTypeColor(schedule.activity_type) }}
                      >
                        {schedule.activity_type}
                      </Badge>
                      <span className="text-sm text-gray-400">
                        {getDateLabel(schedule.start_time)}
                      </span>
                    </div>
                    
                    <h3 className="text-lg font-semibold text-white mb-2">
                      {schedule.title}
                    </h3>
                    
                    {schedule.description && (
                      <p className="text-gray-300 text-sm mb-3">
                        {schedule.description}
                      </p>
                    )}
                    
                    <div className="flex flex-wrap gap-4 text-sm text-gray-400">
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {format(parseISO(schedule.start_time), 'HH:mm')} - {format(parseISO(schedule.end_time), 'HH:mm')}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};