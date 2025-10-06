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
                    <th className="text-left p-4 text-sm font-medium text-gray-300">Участники</th>
                    {user && <th className="text-left p-4 text-sm font-medium text-gray-300">Запись</th>}
                  </tr>
                </thead>
                <tbody>
                  {schedules.map((schedule) => (
                    <tr 
                      key={schedule.id}
                      className="border-b border-gray-800 hover:bg-gray-800 transition-colors"
                      style={{ 
                        backgroundColor: `${schedule.color || '#10b981'}15`
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
                              backgroundColor: schedule.color || '#10b981',
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
                      <td className="p-4 text-gray-300">
                        {schedule.participants_count || 0}
                        {schedule.max_participants && ` / ${schedule.max_participants}`}
                      </td>
                      {user && (
                        <td className="p-4">
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
                              "..."
                            ) : schedule.is_registered ? (
                              <>
                                <UserCheck className="w-4 h-4" />
                                Отменить
                              </>
                            ) : (
                              <>
                                <Users className="w-4 h-4" />
                                Записаться
                              </>
                            )}
                          </Button>
                        </td>
                      )}
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
