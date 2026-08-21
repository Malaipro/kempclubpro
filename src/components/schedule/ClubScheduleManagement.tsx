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
import { Calendar, Plus, Edit, Trash2, CalendarIcon, CalendarPlus, Users as UsersIcon, Eye, Search, UserPlus, X } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { toast as sonnerToast } from 'sonner';
import { mskToUtcISO, formatMskDate, formatMskTime, formatMskTimeSec, mskDayOfWeek } from '@/lib/mskTime';

const MASTERMIND_ACTIVITY = 'Мастермайнд';

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
  theme?: string;
  description?: string;
  participants_count?: number;
  mastermind_group_id?: string | null;
}

interface Trainer {
  id: string;
  name: string;
}

interface MastermindGroup {
  id: string;
  name: string;
}

interface ProfileOption {
  user_id: string;
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
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

const emptyForm = {
  date: undefined as Date | undefined,
  start_time: '19:00',
  end_time: '21:00',
  activity: '',
  instructor_id: '',
  location: '',
  theme: '',
  description: '',
  stream_id: '',
  color: '#10b981',
  mastermind_group_id: '',
};

export const ClubScheduleManagement: React.FC = () => {
  const [scheduleItems, setScheduleItems] = useState<ScheduleItem[]>([]);
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [mastermindGroups, setMastermindGroups] = useState<MastermindGroup[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewingParticipants, setViewingParticipants] = useState<string | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [viewingDetails, setViewingDetails] = useState<ScheduleItem | null>(null);
  const [profileSearch, setProfileSearch] = useState('');
  const [profileResults, setProfileResults] = useState<ProfileOption[]>([]);
  const [searchingProfiles, setSearchingProfiles] = useState(false);
  const [addingUserId, setAddingUserId] = useState<string | null>(null);
  const [formData, setFormData] = useState(emptyForm);
  const { toast } = useToast();

  useEffect(() => {
    fetchTrainers();
    fetchSchedules();
    fetchMastermindGroups();
  }, []);

  const fetchMastermindGroups = async () => {
    try {
      const { data, error } = await supabase
        .from('mastermind_groups')
        .select('id, name')
        .order('name');
      if (error) throw error;
      setMastermindGroups(data || []);
    } catch (error) {
      console.error('Error fetching mastermind groups:', error);
    }
  };

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
        
        // Parse theme and description from description field (format: "theme|||description")
        const [theme = '', fullDescription = ''] = (schedule.description || '').split('|||');
        
        return {
          id: schedule.id,
          date: formatMskDate(schedule.start_time),
          dayOfWeek: mskDayOfWeek(schedule.start_time),
          time: `${formatMskTime(schedule.start_time)}-${formatMskTime(schedule.end_time)}`,
          activity: schedule.title,
          instructor: schedule.instructor_id ? (trainersMap.get(schedule.instructor_id) || '-') : '-',
          instructor_id: schedule.instructor_id,
          location: schedule.location || '-',
          theme: theme,
          description: fullDescription,
          color: schedule.color || '#10b981',
          participants_count: schedule.participants_count,
          mastermind_group_id: (schedule as any).mastermind_group_id ?? null,
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

    const toISO = (date: Date, time: string) => mskToUtcISO(date, time);

    try {
      // Combine theme and description with separator
      const combinedDescription = formData.theme && formData.description 
        ? `${formData.theme}|||${formData.description}`
        : formData.theme || formData.description || null;

      const mastermindGroupId =
        formData.activity === MASTERMIND_ACTIVITY && formData.mastermind_group_id
          ? formData.mastermind_group_id
          : null;

      if (editingId) {
        const { error } = await supabase
          .from('schedules')
          .update({
            title: formData.activity,
            description: combinedDescription,
            start_time: toISO(formData.date, formData.start_time),
            end_time: toISO(formData.date, formData.end_time),
            activity_type: formData.activity,
            instructor_id: null,
            location: formData.location || null,
            stream_id: null,
            color: formData.color,
            schedule_type: 'club',
            mastermind_group_id: mastermindGroupId,
          })
          .eq('id', editingId);

        if (error) throw error;
        toast({ title: 'Успех', description: 'Мероприятие обновлено' });
      } else {
        const { error } = await supabase.from('schedules').insert({
          title: formData.activity,
          description: combinedDescription,
          start_time: toISO(formData.date, formData.start_time),
          end_time: toISO(formData.date, formData.end_time),
          location: formData.location || null,
          activity_type: formData.activity,
          max_participants: null,
          is_active: true,
          instructor_id: null,
          color: formData.color,
          schedule_type: 'club',
          mastermind_group_id: mastermindGroupId,
        });

        if (error) throw error;
        toast({ title: 'Успех', description: 'Мероприятие добавлено' });
      }

      await fetchSchedules();
      setDialogOpen(false);
      setEditingId(null);
      setFormData(emptyForm);
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
      instructor_id: '',
      location: item.location === '-' ? '' : item.location || '',
      theme: item.theme || '',
      description: item.description || '',
      stream_id: '',
      color: item.color || '#10b981',
      mastermind_group_id: item.mastermind_group_id || '',
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
    setProfileSearch('');
    setProfileResults([]);
    await fetchParticipants(scheduleId);
  };

  const handleSearchProfiles = async () => {
    const term = profileSearch.trim();
    if (term.length < 2) {
      toast({ title: 'Введите минимум 2 символа', variant: 'destructive' });
      return;
    }
    setSearchingProfiles(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, display_name, first_name, last_name')
        .or(
          `display_name.ilike.%${term}%,first_name.ilike.%${term}%,last_name.ilike.%${term}%`
        )
        .limit(20);

      if (error) throw error;
      setProfileResults((data || []) as ProfileOption[]);
    } catch (error) {
      console.error('Error searching profiles:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось выполнить поиск',
        variant: 'destructive',
      });
    } finally {
      setSearchingProfiles(false);
    }
  };

  const getProfileName = (p: ProfileOption) =>
    p.display_name ||
    [p.first_name, p.last_name].filter(Boolean).join(' ') ||
    'Без имени';

  const handleAddParticipant = async (scheduleId: string, userId: string) => {
    if (participants.some(p => p.user_id === userId)) {
      toast({ title: 'Участник уже записан', variant: 'destructive' });
      return;
    }
    setAddingUserId(userId);
    try {
      const { error } = await supabase
        .from('schedule_participants')
        .insert({ schedule_id: scheduleId, user_id: userId });

      if (error) throw error;

      // Зеркальное добавление в мастермайнд-группу, если событие к ней привязано
      const scheduleItem = scheduleItems.find(s => s.id === scheduleId);
      if (scheduleItem?.mastermind_group_id) {
        const { error: mmError } = await supabase
          .from('mastermind_members')
          .upsert(
            {
              user_id: userId,
              group_id: scheduleItem.mastermind_group_id,
              is_active: true,
            },
            { onConflict: 'user_id,group_id' }
          );
        if (mmError) {
          console.error('Error upserting mastermind member:', mmError);
          toast({
            title: 'Внимание',
            description: 'Участник записан, но не добавлен в мастермайнд-группу',
            variant: 'destructive',
          });
        }
      }

      toast({ title: 'Успех', description: 'Участник добавлен' });
      await fetchParticipants(scheduleId);
      await fetchSchedules();
    } catch (error) {
      console.error('Error adding participant:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось добавить участника',
        variant: 'destructive',
      });
    } finally {
      setAddingUserId(null);
    }
  };

  const handleRemoveParticipant = async (scheduleId: string, participantId: string) => {
    if (!confirm('Удалить участника из мероприятия?')) return;
    try {
      const { error } = await supabase
        .from('schedule_participants')
        .delete()
        .eq('id', participantId);

      if (error) throw error;
      toast({ title: 'Успех', description: 'Участник удалён из мероприятия' });
      await fetchParticipants(scheduleId);
      await fetchSchedules();
    } catch (error) {
      console.error('Error removing participant:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось удалить участника',
        variant: 'destructive',
      });
    }
  };

  const getActivityBadgeColor = (activity: string) => {
    if (activity.includes('BJJ')) return 'bg-blue-100 text-blue-800';
    if (activity.includes('ОФП')) return 'bg-purple-100 text-purple-800';
    if (activity.includes('Кикбоксинг')) return 'bg-red-100 text-red-800';
    if (activity.includes('Встреча')) return 'bg-green-100 text-green-800';
    if (activity.includes('Баня')) return 'bg-orange-100 text-orange-800';
    if (activity.includes('Мастермайнд')) return 'bg-indigo-100 text-indigo-800';
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
              setFormData(emptyForm);
            }
          }}>
            <DialogTrigger asChild>
              <Button className="bg-green-600 hover:bg-green-700 text-white">
                <Plus className="w-4 h-4 mr-2" />
                Добавить мероприятие
              </Button>
            </DialogTrigger>
            
            <DialogContent className="max-w-2xl bg-gray-900 border-gray-700 max-h-[90vh] overflow-y-auto">
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
                      <SelectItem value="Мастермайнд">Мастермайнд</SelectItem>
                      <SelectItem value="Выезд на природу">Выезд на природу</SelectItem>
                      <SelectItem value="Семейное мероприятие">Семейное мероприятие</SelectItem>
                      <SelectItem value="Выездное мероприятие">Выездное мероприятие</SelectItem>
                      <SelectItem value="Лекции">Лекции</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.activity === MASTERMIND_ACTIVITY && (
                  <div>
                    <Label className="text-white">Группа мастермайнда</Label>
                    <Select
                      value={formData.mastermind_group_id}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, mastermind_group_id: value }))}
                    >
                      <SelectTrigger className="bg-white text-black">
                        <SelectValue placeholder="Выберите группу" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-gray-300 shadow-lg z-50">
                        {mastermindGroups.map(group => (
                          <SelectItem key={group.id} value={group.id}>{group.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-400 mt-1">
                      При записи участника на это мероприятие он автоматически добавится в выбранную группу.
                    </p>
                  </div>
                )}

                <div>
                  <Label className="text-white">Тема мероприятия</Label>
                  <Input
                    value={formData.theme}
                    onChange={(e) => setFormData(prev => ({ ...prev, theme: e.target.value }))}
                    placeholder="Краткая тема мероприятия"
                    className="bg-white text-black"
                  />
                </div>

                <div>
                  <Label className="text-white">Описание мероприятия</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Подробное описание мероприятия..."
                    className="bg-white text-black min-h-[100px]"
                  />
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
                  <TableHead className="min-w-[200px]">Тема</TableHead>
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
                        className="border font-semibold cursor-pointer hover:opacity-80"
                        onClick={() => setViewingDetails(item)}
                      >
                        {item.activity}
                      </Badge>
                    </TableCell>
                    <TableCell>{item.location}</TableCell>
                    <TableCell 
                      className="text-sm cursor-pointer hover:text-primary"
                      onClick={() => setViewingDetails(item)}
                    >
                      {item.theme || '-'}
                    </TableCell>
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
                        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
                          <SheetHeader>
                            <SheetTitle>Список участников</SheetTitle>
                          </SheetHeader>

                          <div className="mt-6 space-y-3">
                            <Label className="text-sm font-medium flex items-center gap-2">
                              <UserPlus className="w-4 h-4" />
                              Добавить участника
                            </Label>
                            <div className="flex gap-2">
                              <Input
                                value={profileSearch}
                                onChange={(e) => setProfileSearch(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleSearchProfiles();
                                  }
                                }}
                                placeholder="Имя или фамилия"
                              />
                              <Button
                                type="button"
                                variant="outline"
                                onClick={handleSearchProfiles}
                                disabled={searchingProfiles}
                              >
                                <Search className="w-4 h-4" />
                              </Button>
                            </div>
                            {profileResults.length > 0 && (
                              <div className="space-y-1 max-h-56 overflow-y-auto border rounded-md p-2">
                                {profileResults.map(profile => {
                                  const already = participants.some(p => p.user_id === profile.user_id);
                                  return (
                                    <div
                                      key={profile.user_id}
                                      className="flex items-center justify-between gap-2 text-sm py-1"
                                    >
                                      <span className="truncate">{getProfileName(profile)}</span>
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="ghost"
                                        disabled={already || addingUserId === profile.user_id}
                                        onClick={() => handleAddParticipant(item.id, profile.user_id)}
                                      >
                                        {already ? 'Записан' : <Plus className="w-4 h-4" />}
                                      </Button>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>

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
                                      <div className="flex items-center justify-between gap-2">
                                        <div>
                                          <p className="font-medium">
                                            {index + 1}. {getParticipantName(participant)}
                                          </p>
                                          <p className="text-xs text-muted-foreground">
                                            Записался: {format(new Date(participant.registered_at), 'dd.MM.yyyy HH:mm')}
                                          </p>
                                        </div>
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          className="text-destructive hover:text-destructive"
                                          onClick={() => handleRemoveParticipant(item.id, participant.id)}
                                        >
                                          <X className="w-4 h-4" />
                                        </Button>
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

      {/* Details Dialog */}
      <Dialog open={!!viewingDetails} onOpenChange={(open) => !open && setViewingDetails(null)}>
        <DialogContent className="max-w-2xl bg-gray-900 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white text-2xl">Детали мероприятия</DialogTitle>
          </DialogHeader>
          {viewingDetails && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-400 mb-1">Мероприятие</h3>
                <Badge 
                  style={{ 
                    color: viewingDetails.color || '#10b981',
                    borderColor: viewingDetails.color || '#10b981',
                    backgroundColor: 'transparent'
                  }}
                  className="border font-semibold text-lg px-4 py-2"
                >
                  {viewingDetails.activity}
                </Badge>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-400 mb-1">Дата</h3>
                  <p className="text-white">{viewingDetails.date}, {viewingDetails.dayOfWeek}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-400 mb-1">Время</h3>
                  <p className="text-white font-mono">{viewingDetails.time}</p>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-400 mb-1">Место проведения</h3>
                <p className="text-white">{viewingDetails.location}</p>
              </div>

              {viewingDetails.theme && (
                <div>
                  <h3 className="text-sm font-medium text-gray-400 mb-1">Тема</h3>
                  <p className="text-white font-medium">{viewingDetails.theme}</p>
                </div>
              )}

              {viewingDetails.description && (
                <div>
                  <h3 className="text-sm font-medium text-gray-400 mb-1">Описание</h3>
                  <p className="text-white whitespace-pre-wrap">{viewingDetails.description}</p>
                </div>
              )}

              <div>
                <h3 className="text-sm font-medium text-gray-400 mb-1">Участники</h3>
                <p className="text-white">{viewingDetails.participants_count || 0} человек записано</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
