import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CalendarPlus, Clock, MapPin, Users, UserCheck } from "lucide-react";
import { format, parseISO, isSameDay } from "date-fns";
import { ru } from "date-fns/locale";
import { toast as sonnerToast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

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
  max_participants: number | null;
  participants_count?: number;
  is_registered?: boolean;
}

export function ClubScheduleViewer() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchSchedules = async () => {
    try {
      const { data, error } = await supabase
        .from("schedules")
        .select("*")
        .eq("is_active", true)
        .eq("schedule_type", "club")
        .gte("end_time", new Date().toISOString())
        .order("start_time", { ascending: true });

      if (error) throw error;

      // Fetch participants count and registration status for each schedule
      const schedulesWithParticipants = await Promise.all(
        (data || []).map(async (schedule) => {
          const { count } = await supabase
            .from("schedule_participants")
            .select("*", { count: "exact", head: true })
            .eq("schedule_id", schedule.id);

          let isRegistered = false;
          if (user) {
            const { data: regData } = await supabase
              .from("schedule_participants")
              .select("id")
              .eq("schedule_id", schedule.id)
              .eq("user_id", user.id)
              .single();
            isRegistered = !!regData;
          }

          return {
            ...schedule,
            participants_count: count || 0,
            is_registered: isRegistered,
          };
        })
      );

      setSchedules(schedulesWithParticipants);
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
    const calendarUrl = `https://wfjvjvbjjxcgkaolkgdq.supabase.co/functions/v1/calendar-feed?type=club`;
    navigator.clipboard.writeText(calendarUrl);
    sonnerToast.success("Ссылка на календарь скопирована!", {
      description: "Добавьте её в ваше календарное приложение",
    });
  };

  const handleRegister = async (scheduleId: string) => {
    if (!user) {
      sonnerToast.error("Необходимо войти в систему");
      return;
    }

    setRegistering(scheduleId);
    try {
      const { error } = await supabase
        .from("schedule_participants")
        .insert({
          schedule_id: scheduleId,
          user_id: user.id,
        });

      if (error) throw error;

      sonnerToast.success("Вы успешно записались на мероприятие!");
      await fetchSchedules();
    } catch (error: any) {
      console.error("Error registering:", error);
      if (error.code === "23505") {
        sonnerToast.error("Вы уже записаны на это мероприятие");
      } else {
        sonnerToast.error("Ошибка при записи на мероприятие");
      }
    } finally {
      setRegistering(null);
    }
  };

  const handleUnregister = async (scheduleId: string) => {
    if (!user) return;

    setRegistering(scheduleId);
    try {
      const { error } = await supabase
        .from("schedule_participants")
        .delete()
        .eq("schedule_id", scheduleId)
        .eq("user_id", user.id);

      if (error) throw error;

      sonnerToast.success("Вы отменили запись на мероприятие");
      await fetchSchedules();
    } catch (error) {
      console.error("Error unregistering:", error);
      sonnerToast.error("Ошибка при отмене записи");
    } finally {
      setRegistering(null);
    }
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
          <h2 className="text-2xl font-bold text-white">Расписание мужского клуба</h2>
          <p className="text-gray-400">Предстоящие мероприятия клуба</p>
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
              Нет предстоящих мероприятий
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {schedules.map((schedule) => (
            <Card
              key={schedule.id}
              className="border-gray-700 bg-gray-900 hover:bg-gray-800 transition-colors overflow-hidden"
              style={{
                borderLeft: `4px solid ${schedule.color || '#10b981'}`,
              }}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <h3 className="text-lg font-semibold text-white">{schedule.title}</h3>
                      <Badge 
                        className="shrink-0 border-0"
                        style={{ 
                          backgroundColor: schedule.color || '#10b981',
                          color: 'white'
                        }}
                      >
                        {schedule.activity_type}
                      </Badge>
                    </div>
                    {schedule.description && (
                      <p className="text-sm text-gray-400 mb-3">
                        {schedule.description}
                      </p>
                    )}
                    
                    <div className="flex flex-wrap gap-4 text-sm mb-4">
                      <div className="flex items-center gap-2 text-gray-400">
                        <Clock className="w-4 h-4" />
                        <span className="font-medium text-white">
                          {getDateLabel(schedule.start_time)}
                        </span>
                        <span>
                          {format(parseISO(schedule.start_time), "HH:mm", { locale: ru })} -{" "}
                          {format(parseISO(schedule.end_time), "HH:mm", { locale: ru })}
                        </span>
                      </div>
                      {schedule.location && (
                        <div className="flex items-center gap-2 text-gray-400">
                          <MapPin className="w-4 h-4" />
                          <span>{schedule.location}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-gray-700">
                      <div className="flex items-center gap-2 text-sm text-gray-400">
                        <Users className="w-4 h-4" />
                        <span>
                          Записано: {schedule.participants_count || 0}
                          {schedule.max_participants && ` / ${schedule.max_participants}`}
                        </span>
                      </div>
                      {user && (
                        <Button
                          onClick={() =>
                            schedule.is_registered
                              ? handleUnregister(schedule.id)
                              : handleRegister(schedule.id)
                          }
                          disabled={
                            registering === schedule.id ||
                            (!schedule.is_registered &&
                              schedule.max_participants !== null &&
                              (schedule.participants_count || 0) >= schedule.max_participants)
                          }
                          variant={schedule.is_registered ? "outline" : "default"}
                          size="sm"
                          className="gap-2"
                        >
                          {registering === schedule.id ? (
                            "Обработка..."
                          ) : schedule.is_registered ? (
                            <>
                              <UserCheck className="w-4 h-4" />
                              Отменить запись
                            </>
                          ) : (
                            <>
                              <Users className="w-4 h-4" />
                              Записаться
                            </>
                          )}
                        </Button>
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
