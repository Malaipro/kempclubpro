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
          <h2 className="text-2xl font-bold">Расписание интенсива</h2>
          <p className="text-muted-foreground">Предстоящие занятия</p>
        </div>
        <Button onClick={handleSubscribeCalendar} variant="outline" size="sm" className="gap-2">
          <CalendarPlus className="w-4 h-4" />
          Подписаться на календарь
        </Button>
      </div>

      {schedules.length === 0 ? (
        <Card className="border-border bg-card">
          <CardContent className="p-8">
            <p className="text-center text-muted-foreground">
              Нет предстоящих занятий
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {schedules.map((schedule) => (
            <Card
              key={schedule.id}
              className="border-border bg-card hover:bg-accent/50 transition-colors overflow-hidden"
              style={{
                borderLeft: `4px solid ${schedule.color || '#6366f1'}`,
              }}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-semibold mb-1">{schedule.title}</h3>
                        {schedule.description && (
                          <p className="text-sm text-muted-foreground">
                            {schedule.description}
                          </p>
                        )}
                      </div>
                      <Badge 
                        className="shrink-0"
                        style={{ 
                          backgroundColor: schedule.color || '#6366f1',
                          color: 'white'
                        }}
                      >
                        {schedule.activity_type}
                      </Badge>
                    </div>
                    
                    <div className="flex flex-wrap gap-4 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="w-4 h-4" />
                        <span className="font-medium text-foreground">
                          {getDateLabel(schedule.start_time)}
                        </span>
                        <span>
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
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
