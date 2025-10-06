import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar, Plus, Edit, Trash2, CalendarIcon, CalendarPlus, Users as UsersIcon, Eye } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { toast as sonnerToast } from 'sonner';

interface ScheduleItem {
  id: string;
  date: string;
  dayOfWeek: string;
  time: string;
  activity: string;
  instructor: string;
  instructor_id?: string | null;
  color?: string;
  location?: string;
  participants_count?: number;
}

interface Trainer {
  id: string;
  name: string;
}

interface Participant {
  id: string;
  user_id: string;
  registered_at: string;
  profiles: {
    display_name: string | null;
    first_name: string | null;
    last_name: string | null;
  } | null;
}

export const ClubScheduleManagement: React.FC = () => {
  const [scheduleItems, setScheduleItems] = useState<ScheduleItem[]>([]);
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewingParticipants, setViewingParticipants] = useState<string | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [formData, setFormData] = useState({
    date: undefined as Date | undefined,
    start_time: '19:00',
    end_time: '21:00',
    activity: '',
    instructor_id: '',
    location: '',
    color: '#10b981',
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchTrainers();
    fetchSchedules();
  }, []);

  const fetchSchedules = async () => {
    try {
      const { data, error } = await supabase
        .from('schedules')
        .select('*')
        .eq('is_active', true)
        .eq('schedule_type', 'club')
        .order('start_time', { ascending: true });

      if (error) throw error;

      const { data: trainersData } = await supabase
        .from('trainers')
        .select('id, name')
        .eq('is_active', true);

      const trainersMap = new Map((trainersData || []).map(t => [t.id, t.name]));

      // Fetch participants count for each schedule
      const schedulesWithCounts = await Promise.all(
        (data || []).map(async (schedule) => {
          const { count } = await supabase
            .from("schedule_participants")
            .select("*", { count: "exact", head: true })
            .eq("schedule_id", schedule.id);
          
          return { ...schedule, participants_count: count || 0 };
        })
      );

      const formattedItems: ScheduleItem[] = schedulesWithCounts.map(schedule => {
        const startDate = new Date(schedule.start_time);
        const endDate = new Date(schedule.end_time);
        
        return {
          id: schedule.id,
          date: format(startDate, 'dd.MM.yyyy'),
          dayOfWeek: getDayOfWeek(startDate),
          time: `${format(startDate, 'HH:mm')}-${format(endDate, 'HH:mm')}`,
          activity: schedule.title,
          instructor: schedule.instructor_id ? (trainersMap.get(schedule.instructor_id) || '-') : '-',
          instructor_id: schedule.instructor_id,
          location: schedule.location || '-',
          color: schedule.color || '#10b981',
          participants_count: schedule.participants_count
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
    }
  };

  const fetchTrainers = async () => {
    try {
      const { data, error } = await supabase
        .from('trainers')
        .select('id, name')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setTrainers(data || []);
    } catch (error) {
      console.error('Error fetching trainers:', error);
    }
  };

  const getDayOfWeek = (date: Date) => {
    const days = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
    return days[date.getDay()];
  };

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.date || !formData.activity) {
      toast({
        title: 'Ошибка',
        description: 'Заполните обязательные поля',
        variant: 'destructive',
      });
      return;
    }

    const toISO = (date: Date, time: string) => {
      const [h, m] = time.split(':').map(Number);
      const d = new Date(date);
      d.setHours(h || 0, m || 0, 0, 0);
      return d.toISOString();
    };

    try {
      if (editingId) {
        const { error } = await supabase
          .from('schedules')
          .update({
            title: formData.activity,
            description: null,
            start_time: toISO(formData.date, formData.start_time),
            end_time: toISO(formData.date, formData.end_time),
            activity_type: formData.activity,
            instructor_id: formData.instructor_id || null,
            location: formData.location || null,
            color: formData.color,
            schedule_type: 'club',
          })
          .eq('id', editingId);

        if (error) throw error;
        toast({ title: 'Успех', description: 'Мероприятие обновлено' });
      } else {
        const { error } = await supabase.from('schedules').insert({
          title: formData.activity,
          description: null,
          start_time: toISO(formData.date, formData.start_time),
          end_time: toISO(formData.date, formData.end_time),
          location: formData.location || null,
          activity_type: formData.activity,
          max_participants: null,
          is_active: true,
          instructor_id: formData.instructor_id || null,
          color: formData.color,
          schedule_type: 'club',
        });

        if (error) throw error;
        toast({ title: 'Успех', description: 'Мероприятие добавлено' });
      }

      await fetchSchedules();
      setDialogOpen(false);
      setEditingId(null);
      setFormData({
        date: undefined,
        start_time: '19:00',
        end_time: '21:00',
        activity: '',
        instructor_id: '',
        location: '',
        color: '#10b981',
      });
    } catch (err) {
      console.error('Error saving schedule:', err);
      toast({
        title: 'Ошибка',
        description: 'Не удалось сохранить мероприятие',
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (item: ScheduleItem) => {
    const [startTime, endTime] = item.time.split('-');
    const [day, month, year] = item.date.split('.');
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    
    setEditingId(item.id);
    setFormData({
      date: date,
      start_time: startTime,
      end_time: endTime,
      activity: item.activity,
      instructor_id: item.instructor_id || '',
      location: item.location === '-' ? '' : item.location || '',
      color: item.color || '#10b981',
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Вы уверены, что хотите удалить это мероприятие?')) return;

    try {
      const { error } = await supabase
        .from('schedules')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({ title: 'Успех', description: 'Мероприятие удалено' });
      await fetchSchedules();
    } catch (err) {
      console.error('Error deleting schedule:', err);
      toast({
        title: 'Ошибка',
        description: 'Не удалось удалить мероприятие',
        variant: 'destructive',
      });
    }
  };

  const handleSubscribeCalendar = () => {
    const calendarUrl = `https://wfjvjvbjjxcgkaolkgdq.supabase.co/functions/v1/calendar-feed?type=club`;
    navigator.clipboard.writeText(calendarUrl);
    sonnerToast.success("Ссылка на календарь скопирована!", {
      description: "Добавьте её в ваше календарное приложение",
    });
  };

  const fetchParticipants = async (scheduleId: string) => {
    try {
      const { data: participantsData, error: participantsError } = await supabase
        .from("schedule_participants")
        .select("id, user_id, registered_at")
        .eq("schedule_id", scheduleId)
        .order("registered_at", { ascending: false });

      if (participantsError) throw participantsError;

      // Fetch profiles for each participant
      const participantsWithProfiles = await Promise.all(
        (participantsData || []).map(async (participant) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("display_name, first_name, last_name")
            .eq("user_id", participant.user_id)
            .single();

          return {
            ...participant,
            profiles: profile || null,
          };
        })
      );

      setParticipants(participantsWithProfiles);
    } catch (error) {
      console.error("Error fetching participants:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить список участников",
        variant: "destructive",
      });
    }
  };

  const handleViewParticipants = async (scheduleId: string) => {
    setViewingParticipants(scheduleId);
    await fetchParticipants(scheduleId);
  };

  const getActivityBadgeColor = (activity: string) => {
    if (activity.includes('BJJ')) return 'bg-blue-100 text-blue-800';
    if (activity.includes('ОФП')) return 'bg-purple-100 text-purple-800';
    if (activity.includes('Кикбоксинг')) return 'bg-red-100 text-red-800';
    if (activity.includes('Встреча')) return 'bg-green-100 text-green-800';
    if (activity.includes('Баня')) return 'bg-orange-100 text-orange-800';
    return 'bg-gray-100 text-gray-800';
  };

  const getParticipantName = (participant: Participant) => {
    if (participant.profiles?.display_name) {
      return participant.profiles.display_name;
    }
    if (participant.profiles?.first_name && participant.profiles?.last_name) {
      return `${participant.profiles.first_name} ${participant.profiles.last_name}`;
    }
    if (participant.profiles?.first_name) {
      return participant.profiles.first_name;
    }
    return "Неизвестный участник";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <UsersIcon className="w-6 h-6 text-green-600" />
            Расписание мужского клуба
          </h1>
          <p className="text-muted-foreground">Управление расписанием клубных мероприятий</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleSubscribeCalendar} variant="outline" size="sm">
            <CalendarPlus className="w-4 h-4 mr-2" />
            Подписка на календарь
          </Button>
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) {
              setEditingId(null);
              setFormData({
                date: undefined,
                start_time: '19:00',
                end_time: '21:00',
                activity: '',
                instructor_id: '',
                location: '',
                color: '#10b981',
              });
            }
          }}>
            <DialogTrigger asChild>
              <Button className="bg-green-600 hover:bg-green-700 text-white">
                <Plus className="w-4 h-4 mr-2" />
                Добавить мероприятие
              </Button>
            </DialogTrigger>
            
            <DialogContent className="max-w-lg bg-gray-900 border-gray-700 max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-white">
                  {editingId ? 'Редактировать мероприятие' : 'Добавить мероприятие'}
                </DialogTitle>
              </DialogHeader>
              
              <form onSubmit={handleAddEvent} className="space-y-4">
                <div>
                  <Label className="text-white">Дата мероприятия *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal bg-white text-black hover:bg-gray-50",
                          !formData.date && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.date ? format(formData.date, "dd.MM.yyyy") : "Выберите дату"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-white border border-gray-300 shadow-lg z-[9999]" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={formData.date}
                        onSelect={(date) => setFormData(prev => ({ ...prev, date }))}
                        initialFocus
                        className="bg-white pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-white">Время начала</Label>
                    <Input
                      type="time"
                      value={formData.start_time}
                      onChange={(e) => setFormData(prev => ({ ...prev, start_time: e.target.value }))}
                      className="bg-white text-black"
                    />
                  </div>
                  <div>
                    <Label className="text-white">Время окончания</Label>
                    <Input
                      type="time"
                      value={formData.end_time}
                      onChange={(e) => setFormData(prev => ({ ...prev, end_time: e.target.value }))}
                      className="bg-white text-black"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-white">Мероприятие *</Label>
                  <Select value={formData.activity} onValueChange={(value) => setFormData(prev => ({ ...prev, activity: value }))}>
                    <SelectTrigger className="bg-white text-black">
                      <SelectValue placeholder="Выберите тип мероприятия" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-gray-300 shadow-lg z-50">
                      <SelectItem value="BJJ">BJJ</SelectItem>
                      <SelectItem value="Кикбоксинг">Кикбоксинг</SelectItem>
                      <SelectItem value="ОФП">ОФП</SelectItem>
                      <SelectItem value="Встреча клуба">Встреча клуба</SelectItem>
                      <SelectItem value="Баня">Баня</SelectItem>
                      <SelectItem value="Совместный ужин">Совместный ужин</SelectItem>
                      <SelectItem value="Мастер-класс">Мастер-класс</SelectItem>
                      <SelectItem value="Выезд на природу">Выезд на природу</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-white">Место проведения</Label>
                  <Input
                    value={formData.location}
                    onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                    placeholder="Укажите место"
                    className="bg-white text-black"
                  />
                </div>

                <div>
                  <Label className="text-white">Организатор/Тренер</Label>
                  <Select value={formData.instructor_id} onValueChange={(value) => setFormData(prev => ({ ...prev, instructor_id: value }))}>
                    <SelectTrigger className="bg-white text-black">
                      <SelectValue placeholder="Выберите организатора" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-gray-300 shadow-lg z-50">
                      {trainers.map((trainer) => (
                        <SelectItem key={trainer.id} value={trainer.id}>
                          {trainer.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-white">Цвет мероприятия</Label>
                  <Select value={formData.color} onValueChange={(value) => setFormData(prev => ({ ...prev, color: value }))}>
                    <SelectTrigger className="bg-white text-black">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded" style={{ backgroundColor: formData.color }}></div>
                        <SelectValue placeholder="Выберите цвет" />
                      </div>
                    </SelectTrigger>
                    <SelectContent className="bg-white border-gray-300 shadow-lg z-50">
                      <SelectItem value="#6366f1">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded bg-[#6366f1]"></div>
                          <span>Индиго</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="#ef4444">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded bg-[#ef4444]"></div>
                          <span>Красный</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="#3b82f6">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded bg-[#3b82f6]"></div>
                          <span>Синий</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="#10b981">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded bg-[#10b981]"></div>
                          <span>Зелёный</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="#f59e0b">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded bg-[#f59e0b]"></div>
                          <span>Оранжевый</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="#8b5cf6">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded bg-[#8b5cf6]"></div>
                          <span>Фиолетовый</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="#ec4899">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded bg-[#ec4899]"></div>
                          <span>Розовый</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="#14b8a6">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded bg-[#14b8a6]"></div>
                          <span>Бирюзовый</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setDialogOpen(false);
                      setEditingId(null);
                    }}
                  >
                    Отмена
                  </Button>
                  <Button type="submit" className="bg-green-600 hover:bg-green-700">
                    {editingId ? 'Сохранить' : 'Добавить'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[100px]">Дата</TableHead>
                  <TableHead className="min-w-[100px]">День недели</TableHead>
                  <TableHead className="min-w-[100px]">Время</TableHead>
                  <TableHead className="min-w-[150px]">Мероприятие</TableHead>
                  <TableHead className="min-w-[120px]">Место</TableHead>
                  <TableHead className="min-w-[120px]">Организатор</TableHead>
                  <TableHead className="min-w-[100px]">Участники</TableHead>
                  <TableHead className="w-[100px]">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {scheduleItems.map((item) => (
                  <TableRow 
                    key={item.id}
                    style={{ 
                      backgroundColor: `${item.color || '#10b981'}15`
                    }}
                  >
                    <TableCell>{item.date}</TableCell>
                    <TableCell>{item.dayOfWeek}</TableCell>
                    <TableCell className="font-mono text-sm">{item.time}</TableCell>
                    <TableCell>
                      <Badge 
                        style={{ 
                          color: item.color || '#10b981',
                          borderColor: item.color || '#10b981',
                          backgroundColor: 'transparent'
                        }}
                        className="border font-semibold"
                      >
                        {item.activity}
                      </Badge>
                    </TableCell>
                    <TableCell>{item.location}</TableCell>
                    <TableCell>{item.instructor}</TableCell>
                    <TableCell>
                      <Sheet open={viewingParticipants === item.id} onOpenChange={(open) => !open && setViewingParticipants(null)}>
                        <SheetTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewParticipants(item.id)}
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            {item.participants_count || 0}
                          </Button>
                        </SheetTrigger>
                        <SheetContent className="w-full sm:max-w-md">
                          <SheetHeader>
                            <SheetTitle>Список участников</SheetTitle>
                          </SheetHeader>
                          <div className="mt-6 space-y-4">
                            {participants.length === 0 ? (
                              <p className="text-center text-muted-foreground py-8">
                                Нет записавшихся участников
                              </p>
                            ) : (
                              <div className="space-y-2">
                                {participants.map((participant, index) => (
                                  <Card key={participant.id}>
                                    <CardContent className="p-4">
                                      <div className="flex items-center justify-between">
                                        <div>
                                          <p className="font-medium">
                                            {index + 1}. {getParticipantName(participant)}
                                          </p>
                                          <p className="text-xs text-muted-foreground">
                                            Записался: {format(new Date(participant.registered_at), 'dd.MM.yyyy HH:mm')}
                                          </p>
                                        </div>
                                      </div>
                                    </CardContent>
                                  </Card>
                                ))}
                              </div>
                            )}
                          </div>
                        </SheetContent>
                      </Sheet>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(item)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(item.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
