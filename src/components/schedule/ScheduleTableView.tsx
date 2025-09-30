import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface ScheduleItem {
  id: string;
  ascetic_nutrition: string;
  nutrition: string;
  date: string;
  dayOfWeek: string;
  time: string;
  activity: string;
  instructor: string;
}

export const ScheduleTableView: React.FC = () => {
  const [scheduleItems, setScheduleItems] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchSchedules();
  }, []);

  const fetchSchedules = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('schedules')
        .select('*')
        .eq('is_active', true)
        .order('start_time', { ascending: true });

      if (error) throw error;

      // Fetch trainers to map instructor_id to names
      const { data: trainersData } = await supabase
        .from('trainers')
        .select('id, name')
        .eq('is_active', true);

      const trainersMap = new Map((trainersData || []).map(t => [t.id, t.name]));

      const formattedItems: ScheduleItem[] = (data || []).map(schedule => {
        const [ascetic_nutrition = '', nutrition = ''] = (schedule.description || '').split(' | ');
        const startDate = new Date(schedule.start_time);
        const endDate = new Date(schedule.end_time);
        
        return {
          id: schedule.id,
          ascetic_nutrition: ascetic_nutrition || '-',
          nutrition: nutrition || '-',
          date: format(startDate, 'dd.MM.yyyy'),
          dayOfWeek: getDayOfWeek(startDate),
          time: `${format(startDate, 'HH:mm:ss')}-${format(endDate, 'HH:mm:ss')}`,
          activity: schedule.title,
          instructor: schedule.instructor_id ? (trainersMap.get(schedule.instructor_id) || '-') : '-',
        };
      });

      setScheduleItems(formattedItems);
    } catch (error) {
      console.error('Error fetching schedules:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось загрузить расписание',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getDayOfWeek = (date: Date) => {
    const days = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
    return days[date.getDay()];
  };

  const getActivityBadgeColor = (activity: string) => {
    if (activity.includes('BJJ')) return 'bg-blue-100 text-blue-800';
    if (activity.includes('ОФП')) return 'bg-purple-100 text-purple-800';
    if (activity.includes('лекция')) return 'bg-orange-100 text-orange-800';
    if (activity.includes('Кикбоксинг')) return 'bg-red-100 text-red-800';
    if (activity.includes('нутрициологии')) return 'bg-green-100 text-green-800';
    return 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-kamp-accent" />
          <h2 className="text-xl font-semibold text-white">Расписание потока</h2>
        </div>
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-6">
            <div className="text-center text-gray-400">Загрузка расписания...</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Calendar className="w-5 h-5 text-kamp-accent" />
        <h2 className="text-xl font-semibold text-white">Расписание потока</h2>
      </div>

      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Расписание мероприятий</CardTitle>
        </CardHeader>
        <CardContent>
          {scheduleItems.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              <Calendar className="w-16 h-16 mx-auto mb-4 text-destructive/50" />
              <p>Расписание пока не добавлено</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-700">
                    <TableHead className="text-gray-300">Смысл аскезы/ Парадигма КЭМП</TableHead>
                    <TableHead className="text-gray-300">Смысл аскезы/ Нутрициология</TableHead>
                    <TableHead className="text-gray-300">Дата</TableHead>
                    <TableHead className="text-gray-300">День недели</TableHead>
                    <TableHead className="text-gray-300">Время</TableHead>
                    <TableHead className="text-gray-300">Мероприятие</TableHead>
                    <TableHead className="text-gray-300">Лектор</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scheduleItems.map((item) => (
                    <TableRow key={item.id} className="border-gray-700">
                      <TableCell className="text-gray-300">{item.ascetic_nutrition}</TableCell>
                      <TableCell className="text-gray-300">{item.nutrition}</TableCell>
                      <TableCell className="text-gray-300">{item.date}</TableCell>
                      <TableCell className="text-gray-300">{item.dayOfWeek}</TableCell>
                      <TableCell className="text-gray-300">{item.time}</TableCell>
                      <TableCell>
                        <Badge className={getActivityBadgeColor(item.activity)}>
                          {item.activity}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-gray-300">{item.instructor}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
