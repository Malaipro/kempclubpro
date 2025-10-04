import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarPlus, Clock, MapPin, Users } from "lucide-react";
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
      const { data, error } = await supabase
        .from("schedules")
        .select("*")
        .eq("is_active", true)
        .eq("schedule_type", "intensive")
        .gte("end_time", new Date().toISOString())
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
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Расписание интенсива</h2>
          <p className="text-muted-foreground">Предстоящие занятия и мероприятия</p>
        </div>
        <Button onClick={handleSubscribeCalendar} variant="outline" size="sm">
          <CalendarPlus className="w-4 h-4 mr-2" />
          Подписаться
        </Button>
      </div>

      {schedules.length === 0 ? (
        <Card>
          <CardContent className="p-6">
            <p className="text-center text-muted-foreground">
              Нет предстоящих занятий
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {schedules.map((schedule) => {
            const borderColor = schedule.color || getActivityTypeColor(schedule.activity_type);
            return (
              <Card
                key={schedule.id}
                className="overflow-hidden"
                style={{
                  borderLeft: `4px solid ${schedule.color || '#6366f1'}`,
                }}
              >
                <CardHeader
                  style={{
                    backgroundColor: schedule.color ? `${schedule.color}10` : undefined,
                  }}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <CardTitle className="text-xl">{schedule.title}</CardTitle>
                      {schedule.description && (
                        <CardDescription className="mt-2">
                          {schedule.description}
                        </CardDescription>
                      )}
                    </div>
                    <div
                      className={`px-3 py-1 rounded-full text-xs font-medium text-white ${getActivityTypeColor(
                        schedule.activity_type
                      )}`}
                    >
                      {schedule.activity_type}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">
                        {getDateLabel(schedule.start_time)}
                      </span>
                      <span className="text-muted-foreground">
                        {format(parseISO(schedule.start_time), "HH:mm", { locale: ru })} -{" "}
                        {format(parseISO(schedule.end_time), "HH:mm", { locale: ru })}
                      </span>
                    </div>
                    {schedule.location && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="w-4 h-4" />
                        <span>{schedule.location}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
