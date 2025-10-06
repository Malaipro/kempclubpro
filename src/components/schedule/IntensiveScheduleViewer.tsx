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
                    <TableHead className="min-w-[100px]">Дата</TableHead>
                    <TableHead className="min-w-[100px]">День недели</TableHead>
                    <TableHead className="min-w-[120px]">Время</TableHead>
                    <TableHead className="min-w-[150px]">Мероприятие</TableHead>
                    <TableHead className="min-w-[120px]">Место</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {schedules.map((schedule) => (
                    <TableRow 
                      key={schedule.id}
                      style={{ 
                        backgroundColor: `${schedule.color || '#6366f1'}15`
                      }}
                    >
                      <TableCell>
                        <Badge 
                          style={{ 
                            color: schedule.color || '#6366f1',
                            borderColor: schedule.color || '#6366f1',
                            backgroundColor: 'transparent'
                          }}
                          className="border font-semibold"
                        >
                          {format(parseISO(schedule.start_time), "dd.MM.yyyy")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          style={{ 
                            color: schedule.color || '#6366f1',
                            borderColor: schedule.color || '#6366f1',
                            backgroundColor: 'transparent'
                          }}
                          className="border font-semibold"
                        >
                          {format(parseISO(schedule.start_time), "EEEE", { locale: ru })}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          style={{ 
                            color: schedule.color || '#6366f1',
                            borderColor: schedule.color || '#6366f1',
                            backgroundColor: 'transparent'
                          }}
                          className="border font-semibold font-mono text-sm"
                        >
                          {format(parseISO(schedule.start_time), "HH:mm")} - {format(parseISO(schedule.end_time), "HH:mm")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          style={{ 
                            color: schedule.color || '#6366f1',
                            borderColor: schedule.color || '#6366f1',
                            backgroundColor: 'transparent'
                          }}
                          className="border font-semibold"
                        >
                          {schedule.activity_type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          style={{ 
                            color: schedule.color || '#6366f1',
                            borderColor: schedule.color || '#6366f1',
                            backgroundColor: 'transparent'
                          }}
                          className="border font-semibold"
                        >
                          {schedule.location || '-'}
                        </Badge>
                      </TableCell>
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
