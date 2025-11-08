import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CalendarPlus, Clock, MapPin, Users, UserCheck, Calendar, Copy, ExternalLink } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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
  instructor_id?: string | null;
  ascetic_nutrition?: string;
  nutrition?: string;
  instructor_name?: string;
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

      // Fetch trainers to map instructor names
      const { data: trainersData } = await supabase
        .from("trainers")
        .select("id, name")
        .eq("is_active", true);

      const trainersMap = new Map((trainersData || []).map(t => [t.id, t.name]));

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

          const [ascetic_nutrition = '', nutrition = ''] = (schedule.description || '').split(' | ');

          return {
            ...schedule,
            participants_count: count || 0,
            is_registered: isRegistered,
            ascetic_nutrition: ascetic_nutrition || '-',
            nutrition: nutrition || '-',
            instructor_name: schedule.instructor_id ? (trainersMap.get(schedule.instructor_id) || '-') : '-'
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


  const calendarUrl = "https://wfjvjvbjjxcgkaolkgdq.supabase.co/functions/v1/calendar-feed?type=club";

  const handleCopyCalendarUrl = () => {
    navigator.clipboard.writeText(calendarUrl);
    sonnerToast.success("Ссылка скопирована в буфер обмена");
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
          <h2 className="text-2xl font-bold">Расписание мужского клуба</h2>
          <p className="text-muted-foreground">Предстоящие мероприятия клуба</p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Calendar className="w-4 h-4" />
              Подписаться на календарь
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Подписка на календарь мужского клуба
              </DialogTitle>
              <DialogDescription>
                Добавьте календарь событий клуба в Google Calendar, Apple Calendar или другое приложение
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6">
              <div className="space-y-3">
                <h4 className="font-semibold text-sm">Ссылка на календарь:</h4>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={calendarUrl}
                    readOnly
                    className="flex-1 px-3 py-2 text-sm border rounded-md bg-muted"
                  />
                  <Button onClick={handleCopyCalendarUrl} size="sm" variant="outline">
                    <Copy className="w-4 h-4 mr-2" />
                    Копировать
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm flex items-center gap-2">
                    <ExternalLink className="w-4 h-4" />
                    Google Calendar
                  </h4>
                  <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                    <li>Откройте <a href="https://calendar.google.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Google Calendar</a></li>
                    <li>Нажмите на "+" рядом с "Другие календари"</li>
                    <li>Выберите "Добавить по URL"</li>
                    <li>Вставьте скопированную ссылку и нажмите "Добавить календарь"</li>
                  </ol>
                </div>

                <div className="space-y-2">
                  <h4 className="font-semibold text-sm flex items-center gap-2">
                    <ExternalLink className="w-4 h-4" />
                    Apple Calendar (iOS/macOS)
                  </h4>
                  <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                    <li>Откройте приложение "Календарь"</li>
                    <li>Файл → Новая подписка на календарь (macOS) или Настройки → Календари → Добавить подписку (iOS)</li>
                    <li>Вставьте скопированную ссылку</li>
                    <li>Нажмите "Подписаться"</li>
                  </ol>
                </div>

                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">Outlook / Другие приложения</h4>
                  <p className="text-sm text-muted-foreground">
                    Найдите опцию "Добавить календарь по URL" или "Подписаться на календарь" и используйте ссылку выше
                  </p>
                </div>
              </div>

              <div className="bg-muted p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  <strong>Примечание:</strong> Календарь будет автоматически обновляться при добавлении новых событий администраторами. 
                  Обновление может занять до 1 часа в зависимости от настроек вашего приложения.
                </p>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {schedules.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="p-8">
            <p className="text-center text-muted-foreground">
              Нет предстоящих мероприятий
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
                    <TableHead className="min-w-[100px]">Участники</TableHead>
                    {user && <TableHead className="w-[150px]">Запись</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {schedules.map((schedule) => (
                    <TableRow 
                      key={schedule.id}
                      style={{ 
                        backgroundColor: `${schedule.color || '#10b981'}15`
                      }}
                    >
                      <TableCell>
                        <Badge 
                          style={{ 
                            color: schedule.color || '#10b981',
                            borderColor: schedule.color || '#10b981',
                            backgroundColor: 'transparent'
                          }}
                          className="border font-semibold"
                        >
                          {schedule.ascetic_nutrition}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          style={{ 
                            color: schedule.color || '#10b981',
                            borderColor: schedule.color || '#10b981',
                            backgroundColor: 'transparent'
                          }}
                          className="border font-semibold"
                        >
                          {schedule.nutrition}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          style={{ 
                            color: schedule.color || '#10b981',
                            borderColor: schedule.color || '#10b981',
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
                            color: schedule.color || '#10b981',
                            borderColor: schedule.color || '#10b981',
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
                            color: schedule.color || '#10b981',
                            borderColor: schedule.color || '#10b981',
                            backgroundColor: 'transparent'
                          }}
                          className="border font-semibold"
                        >
                          {format(parseISO(schedule.start_time), "HH:mm:ss")}-{format(parseISO(schedule.end_time), "HH:mm:ss")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          style={{ 
                            color: schedule.color || '#10b981',
                            borderColor: schedule.color || '#10b981',
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
                            color: schedule.color || '#10b981',
                            borderColor: schedule.color || '#10b981',
                            backgroundColor: 'transparent'
                          }}
                          className="border font-semibold"
                        >
                          {schedule.instructor_name}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {schedule.participants_count || 0}
                        {schedule.max_participants && ` / ${schedule.max_participants}`}
                      </TableCell>
                      {user && (
                        <TableCell>
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
                        </TableCell>
                      )}
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
