import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CalendarPlus, Clock, MapPin } from "lucide-react";
import { format, parseISO, isSameDay } from "date-fns";
import { ru } from "date-fns/locale";
import { toast as sonnerToast } from "sonner";

interface Schedule {
  id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  location: string | null;
  activity_type: string;
  color: string | null;
  schedule_type: 'intensive' | 'club';
  instructor_id?: string | null;
  ascetic_nutrition?: string;
  nutrition?: string;
  instructor_name?: string;
}

export function IntensiveScheduleViewer() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSchedules = async () => {
    try {
      // Get start of today in ISO format
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const { data, error } = await supabase
        .from("schedules")
        .select("*")
        .eq("is_active", true)
        .eq("schedule_type", "intensive")
        .gte("start_time", today.toISOString())
        .order("start_time", { ascending: true });

      if (error) throw error;

      // Fetch trainers to map instructor names
      const { data: trainersData } = await supabase
        .from("trainers")
        .select("id, name")
        .eq("is_active", true);

      const trainersMap = new Map((trainersData || []).map(t => [t.id, t.name]));

      // Parse description and add instructor names
      const enrichedSchedules = (data || []).map(schedule => {
        const [ascetic_nutrition = '', nutrition = ''] = (schedule.description || '').split(' | ');
        return {
          ...schedule,
          ascetic_nutrition: ascetic_nutrition || '-',
          nutrition: nutrition || '-',
          instructor_name: schedule.instructor_id ? (trainersMap.get(schedule.instructor_id) || '-') : '-'
        };
      });

      setSchedules(enrichedSchedules);
    } catch (error) {
      console.error("Error fetching schedules:", error);
      sonnerToast.error("Ошибка загрузки расписания");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedules();
  }, []);

  const getDateLabel = (dateString: string) => {
    const date = parseISO(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (isSameDay(date, today)) return "Сегодня";
    if (isSameDay(date, tomorrow)) return "Завтра";
    return format(date, "d MMMM, EEEE", { locale: ru });
  };

  const getActivityBadgeColor = (activity: string) => {
    if (activity.includes('BJJ')) return 'bg-blue-100 text-blue-800';
    if (activity.includes('ОФП')) return 'bg-purple-100 text-purple-800';
    if (activity.includes('лекция')) return 'bg-orange-100 text-orange-800';
    if (activity.includes('Кикбоксинг')) return 'bg-red-100 text-red-800';
    if (activity.includes('нутрициологи')) return 'bg-green-100 text-green-800';
    if (activity.includes('Тактическая')) return 'bg-orange-100 text-orange-800';
    return 'bg-gray-100 text-gray-800';
  };

  const handleSubscribeCalendar = () => {
    const calendarUrl = `https://wfjvjvbjjxcgkaolkgdq.supabase.co/functions/v1/calendar-feed?type=intensive`;
    navigator.clipboard.writeText(calendarUrl);
    sonnerToast.success("Ссылка на календарь скопирована!", {
      description: "Добавьте её в ваше календарное приложение",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold">Расписание интенсива</h2>
          <p className="text-muted-foreground">Предстоящие занятия</p>
        </div>
        <Button onClick={handleSubscribeCalendar} variant="outline" size="sm" className="gap-2">
          <CalendarPlus className="w-4 h-4" />
          Подписаться на календарь
        </Button>
      </div>

      {schedules.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="p-8">
            <p className="text-center text-muted-foreground">
              Нет предстоящих занятий
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-card border-border">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Смысл аскезы/Парадигма КЭМП</TableHead>
                    <TableHead>Смысл аскезы/Нутрициология</TableHead>
                    <TableHead className="min-w-[100px]">Дата</TableHead>
                    <TableHead className="min-w-[100px]">День недели</TableHead>
                    <TableHead className="min-w-[120px]">Время</TableHead>
                    <TableHead className="min-w-[150px]">Мероприятие</TableHead>
                    <TableHead>Лектор</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {schedules.map((schedule) => (
                    <TableRow 
                      key={schedule.id}
                      style={{ 
                        backgroundColor: `${schedule.color || '#6366f1'}15`,
                        borderLeftColor: schedule.color || '#6366f1',
                        borderLeftWidth: '4px'
                      }}
                    >
                      <TableCell>{schedule.ascetic_nutrition}</TableCell>
                      <TableCell>{schedule.nutrition}</TableCell>
                      <TableCell>{format(parseISO(schedule.start_time), "dd.MM.yyyy")}</TableCell>
                      <TableCell>{format(parseISO(schedule.start_time), "EEEE", { locale: ru })}</TableCell>
                      <TableCell>{format(parseISO(schedule.start_time), "HH:mm:ss")}-{format(parseISO(schedule.end_time), "HH:mm:ss")}</TableCell>
                      <TableCell>
                        <Badge className={getActivityBadgeColor(schedule.activity_type)}>
                          {schedule.activity_type}
                        </Badge>
                      </TableCell>
                      <TableCell>{schedule.instructor_name}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
