import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
      setSchedules(data || []);
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

  const getActivityTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      bjj: "bg-blue-500",
      kickboxing: "bg-red-500",
      ofp: "bg-green-500",
      theory: "bg-purple-500",
      tactical: "bg-orange-500",
    };
    return colors[type] || "bg-gray-500";
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
          <h2 className="text-2xl font-bold text-white">Расписание интенсива</h2>
          <p className="text-gray-400">Предстоящие занятия</p>
        </div>
        <Button onClick={handleSubscribeCalendar} variant="outline" size="sm" className="gap-2 border-gray-600 text-gray-300 hover:bg-gray-800">
          <CalendarPlus className="w-4 h-4" />
          Подписаться на календарь
        </Button>
      </div>

      {schedules.length === 0 ? (
        <Card className="border-gray-700 bg-gray-900">
          <CardContent className="p-8">
            <p className="text-center text-gray-400">
              Нет предстоящих занятий
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-gray-700 bg-gray-900">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left p-4 text-sm font-medium text-gray-300">Дата</th>
                    <th className="text-left p-4 text-sm font-medium text-gray-300">День недели</th>
                    <th className="text-left p-4 text-sm font-medium text-gray-300">Время</th>
                    <th className="text-left p-4 text-sm font-medium text-gray-300">Мероприятие</th>
                    <th className="text-left p-4 text-sm font-medium text-gray-300">Место</th>
                  </tr>
                </thead>
                <tbody>
                  {schedules.map((schedule) => (
                    <tr 
                      key={schedule.id}
                      className="border-b border-gray-800 hover:bg-gray-800 transition-colors"
                      style={{ 
                        backgroundColor: `${schedule.color || '#6366f1'}15`
                      }}
                    >
                      <td className="p-4 text-white font-medium">
                        {format(parseISO(schedule.start_time), "dd.MM.yyyy")}
                      </td>
                      <td className="p-4 text-gray-300">
                        {format(parseISO(schedule.start_time), "EEEE", { locale: ru })}
                      </td>
                      <td className="p-4 text-gray-300 font-mono text-sm">
                        {format(parseISO(schedule.start_time), "HH:mm", { locale: ru })} - {format(parseISO(schedule.end_time), "HH:mm", { locale: ru })}
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col gap-2">
                          <Badge 
                            className="w-fit border-0"
                            style={{ 
                              backgroundColor: schedule.color || '#6366f1',
                              color: 'white'
                            }}
                          >
                            {schedule.activity_type}
                          </Badge>
                          {schedule.title && (
                            <span className="text-sm text-white font-medium">{schedule.title}</span>
                          )}
                          {schedule.description && (
                            <span className="text-xs text-gray-400">{schedule.description}</span>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-gray-300">
                        {schedule.location || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
