import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar, Plus, Edit, Trash2, CalendarIcon, CalendarPlus } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { toast as sonnerToast } from 'sonner';
interface ScheduleItem {
  id: string;
  ascetic_nutrition: string;
  nutrition: string;
  date: string;
  dayOfWeek: string;
  time: string;
  activity: string;
  instructor: string;
  instructor_id?: string | null;
  color?: string;
}
interface Trainer {
  id: string;
  name: string;
}

interface Stream {
  id: string;
  name: string;
}

export const IntensiveScheduleManagement: React.FC = () => {
  const [scheduleItems, setScheduleItems] = useState<ScheduleItem[]>([]);
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [streams, setStreams] = useState<Stream[]>([]);
  const [currentStreamId, setCurrentStreamId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    ascetic_nutrition: '',
    nutrition: '',
    event_description: '',
    date: undefined as Date | undefined,
    start_time: '08:00',
    end_time: '09:30',
    activity: '',
    instructor_id: '',
    stream_id: '',
    color: '#6366f1'
  });
  const {
    toast
  } = useToast();
  useEffect(() => {
    fetchStreams();
    fetchTrainers();
  }, []);

  useEffect(() => {
    if (currentStreamId) {
      fetchSchedules();
    }
  }, [currentStreamId]);
  const fetchStreams = async () => {
    try {
      const { data, error } = await supabase
        .from('streams')
        .select('id, name')
        .eq('is_active', true)
        .eq('stream_type', 'intensive')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setStreams(data || []);
      
      // Set first active stream as current
      if (data && data.length > 0 && !currentStreamId) {
        setCurrentStreamId(data[0].id);
      }
    } catch (error) {
      console.error('Error fetching streams:', error);
    }
  };

  const fetchSchedules = async () => {
    if (!currentStreamId) return;
    
    try {
      const {
        data,
        error
      } = await supabase
        .from('schedules')
        .select('*')
        .eq('is_active', true)
        .eq('schedule_type', 'intensive')
        .eq('stream_id', currentStreamId)
        .order('start_time', {
          ascending: true
        });
      if (error) throw error;
      const {
        data: trainersData
      } = await supabase.from('trainers').select('id, name').eq('is_active', true);
      const trainersMap = new Map((trainersData || []).map(t => [t.id, t.name]));
      const formattedItems: ScheduleItem[] = (data || []).map(schedule => {
        const [ascetic_nutrition = '', nutrition = '', event_description = ''] = (schedule.description || '').split(' | ');
        const startDate = new Date(schedule.start_time);
        const endDate = new Date(schedule.end_time);
        return {
          id: schedule.id,
          ascetic_nutrition: ascetic_nutrition || '-',
          nutrition: nutrition || '-',
          date: format(startDate, 'dd.MM.yyyy'),
          dayOfWeek: getDayOfWeek(startDate),
          time: `${format(startDate, 'HH:mm:ss')}-${format(endDate, 'HH:mm:ss')}`,
          activity: schedule.title,
          instructor: schedule.instructor_id ? trainersMap.get(schedule.instructor_id) || '-' : '-',
          instructor_id: schedule.instructor_id,
          color: schedule.color || '#6366f1'
        };
      });
      setScheduleItems(formattedItems);
    } catch (error) {
      console.error('Error fetching schedules:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось загрузить расписание',
        variant: 'destructive'
      });
    }
  };
  const fetchTrainers = async () => {
    try {
      const {
        data,
        error
      } = await supabase.from('trainers').select('id, name').eq('is_active', true).order('name');
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
        variant: 'destructive'
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
        const {
          error
        } = await supabase.from('schedules').update({
          title: formData.activity,
          description: [formData.ascetic_nutrition, formData.nutrition, formData.event_description].filter(Boolean).join(' | ') || null,
          start_time: toISO(formData.date, formData.start_time),
          end_time: toISO(formData.date, formData.end_time),
          activity_type: formData.activity,
          instructor_id: formData.instructor_id || null,
          stream_id: formData.stream_id || currentStreamId || null,
          color: formData.color,
          schedule_type: 'intensive'
        }).eq('id', editingId);
        if (error) throw error;
        toast({
          title: 'Успех',
          description: 'Мероприятие обновлено'
        });
      } else {
        const {
          error
        } = await supabase.from('schedules').insert({
          title: formData.activity,
          description: [formData.ascetic_nutrition, formData.nutrition, formData.event_description].filter(Boolean).join(' | ') || null,
          start_time: toISO(formData.date, formData.start_time),
          end_time: toISO(formData.date, formData.end_time),
          location: null,
          activity_type: formData.activity,
          max_participants: null,
          is_active: true,
          instructor_id: formData.instructor_id || null,
          stream_id: formData.stream_id || currentStreamId || null,
          color: formData.color,
          schedule_type: 'intensive'
        });
        if (error) throw error;
        toast({
          title: 'Успех',
          description: 'Мероприятие добавлено'
        });
      }
      await fetchSchedules();
      setDialogOpen(false);
      setEditingId(null);
      setFormData({
        ascetic_nutrition: '',
        nutrition: '',
        event_description: '',
        date: undefined,
        start_time: '08:00',
        end_time: '09:30',
        activity: '',
        instructor_id: '',
        stream_id: currentStreamId || '',
        color: '#6366f1'
      });
    } catch (err) {
      console.error('Error saving schedule:', err);
      toast({
        title: 'Ошибка',
        description: 'Не удалось сохранить мероприятие',
        variant: 'destructive'
      });
    }
  };
  const handleEdit = (item: ScheduleItem) => {
    const [startTime, endTime] = item.time.split('-');
    const [day, month, year] = item.date.split('.');
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    setEditingId(item.id);
    setFormData({
      ascetic_nutrition: item.ascetic_nutrition === '-' ? '' : item.ascetic_nutrition,
      nutrition: item.nutrition === '-' ? '' : item.nutrition,
      event_description: '',
      date: date,
      start_time: startTime.slice(0, 5),
      end_time: endTime.slice(0, 5),
      activity: item.activity,
      instructor_id: item.instructor_id || '',
      stream_id: currentStreamId || '',
      color: item.color || '#6366f1'
    });
    setDialogOpen(true);
  };
  const handleDelete = async (id: string) => {
    if (!confirm('Вы уверены, что хотите удалить это мероприятие?')) return;
    try {
      const {
        error
      } = await supabase.from('schedules').delete().eq('id', id);
      if (error) throw error;
      toast({
        title: 'Успех',
        description: 'Мероприятие удалено'
      });
      await fetchSchedules();
    } catch (err) {
      console.error('Error deleting schedule:', err);
      toast({
        title: 'Ошибка',
        description: 'Не удалось удалить мероприятие',
        variant: 'destructive'
      });
    }
  };
  const handleSubscribeCalendar = () => {
    const calendarUrl = `https://wfjvjvbjjxcgkaolkgdq.supabase.co/functions/v1/calendar-feed?type=intensive`;
    navigator.clipboard.writeText(calendarUrl);
    sonnerToast.success("Ссылка на календарь скопирована!", {
      description: "Добавьте её в ваше календарное приложение"
    });
  };
  const getActivityBadgeColor = (activity: string) => {
    if (activity.includes('BJJ')) return 'bg-blue-100 text-blue-800';
    if (activity.includes('ОФП')) return 'bg-purple-100 text-purple-800';
    if (activity.includes('лекция')) return 'bg-orange-100 text-orange-800';
    if (activity.includes('Кикбоксинг')) return 'bg-red-100 text-red-800';
    if (activity.includes('нутрициологии')) return 'bg-green-100 text-green-800';
    return 'bg-gray-100 text-gray-800';
  };
  return <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Calendar className="w-6 h-6 text-destructive" />
            Расписание интенсива
          </h1>
          <p className="text-muted-foreground">Управление расписанием интенсивного потока</p>
        </div>
        <div className="flex gap-2">
          <Select value={currentStreamId || ''} onValueChange={setCurrentStreamId}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Выберите поток" />
            </SelectTrigger>
            <SelectContent>
              {streams.map(stream => (
                <SelectItem key={stream.id} value={stream.id}>
                  {stream.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleSubscribeCalendar} variant="outline" size="sm">
            <CalendarPlus className="w-4 h-4 mr-2" />
            Подписка на календарь
          </Button>
          <Dialog open={dialogOpen} onOpenChange={open => {
          setDialogOpen(open);
          if (!open) {
            setEditingId(null);
            setFormData({
              ascetic_nutrition: '',
              nutrition: '',
              event_description: '',
              date: undefined,
              start_time: '08:00',
              end_time: '09:30',
              activity: '',
              instructor_id: '',
              stream_id: currentStreamId || '',
              color: '#6366f1'
            });
          }
        }}>
            <DialogTrigger asChild>
              <Button className="bg-destructive hover:bg-destructive/90 text-white">
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
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-white">Парадигма КЭМП</Label>
                    <Select value={formData.ascetic_nutrition} onValueChange={value => setFormData(prev => ({
                      ...prev,
                      ascetic_nutrition: value
                    }))}>
                      <SelectTrigger className="bg-white text-black">
                        <SelectValue placeholder="Выберите тему" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-gray-300 shadow-lg z-[9999]">
                        <SelectItem value="Вводная неделя">Вводная неделя</SelectItem>
                        <SelectItem value="Что я имею/ Окружение">Что я имею/ Окружение</SelectItem>
                        <SelectItem value="Что я делаю/Поведение">Что я делаю/Поведение</SelectItem>
                        <SelectItem value="Как я выбираю/Способности">Как я выбираю/Способности</SelectItem>
                        <SelectItem value="Во что я верю/Убеждения">Во что я верю/Убеждения</SelectItem>
                        <SelectItem value="Кто я такой/Идентичность">Кто я такой/Идентичность</SelectItem>
                        <SelectItem value="Зачем я живу/Миссия">Зачем я живу/Миссия</SelectItem>
                        <SelectItem value="Финальное испытание">Финальное испытание</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-white">Нутрициология</Label>
                    <Select value={formData.nutrition} onValueChange={value => setFormData(prev => ({
                      ...prev,
                      nutrition: value
                    }))}>
                      <SelectTrigger className="bg-white text-black">
                        <SelectValue placeholder="Выберите тему" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-gray-300 shadow-lg z-[9999]">
                        <SelectItem value="Основные функции пищи">Основные функции пищи</SelectItem>
                        <SelectItem value="Белки. Источники Белка">Белки. Источники Белка</SelectItem>
                        <SelectItem value="Жиры. Источники Жиров">Жиры. Источники Жиров</SelectItem>
                        <SelectItem value="Углеводы. Источники Углеводов">Углеводы. Источники Углеводов</SelectItem>
                        <SelectItem value="Клетчатка. Источники Клетчатки">Клетчатка. Источники Клетчатки</SelectItem>
                        <SelectItem value="Структура рациона. Правила и Последствия">Структура рациона. Правила и Последствия</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label className="text-white">Дата мероприятия *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start text-left font-normal bg-white text-black hover:bg-gray-50", !formData.date && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.date ? format(formData.date, "dd.MM.yyyy") : "Выберите дату"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-white border border-gray-300 shadow-lg z-[9999]" align="start">
                      <CalendarComponent mode="single" selected={formData.date} onSelect={date => setFormData(prev => ({
                      ...prev,
                      date
                    }))} initialFocus className="bg-white pointer-events-auto" />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-white">Время начала</Label>
                    <Input type="time" value={formData.start_time} onChange={e => setFormData(prev => ({
                    ...prev,
                    start_time: e.target.value
                  }))} className="bg-white text-black" />
                  </div>
                  <div>
                    <Label className="text-white">Время окончания</Label>
                    <Input type="time" value={formData.end_time} onChange={e => setFormData(prev => ({
                    ...prev,
                    end_time: e.target.value
                  }))} className="bg-white text-black" />
                  </div>
                </div>

                <div>
                  <Label className="text-white">Мероприятие *</Label>
                  <Select value={formData.activity} onValueChange={value => setFormData(prev => ({
                  ...prev,
                  activity: value
                }))}>
                    <SelectTrigger className="bg-white text-black">
                      <SelectValue placeholder="Выберите тип мероприятия" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-gray-300 shadow-lg z-50">
                      <SelectItem value="BJJ">BJJ</SelectItem>
                      <SelectItem value="ОФП">ОФП</SelectItem>
                      <SelectItem value="Кикбоксинг">Кикбоксинг</SelectItem>
                      <SelectItem value="Тактическая подготовка">Тактическая подготовка</SelectItem>
                      <SelectItem value="Лекция Пирамида КЭМП">Лекция Пирамида КЭМП</SelectItem>
                      <SelectItem value="Пирамида практика">Пирамида практика</SelectItem>
                      <SelectItem value="Теория">Теория</SelectItem>
                      <SelectItem value="Нутрициология">Нутрициология</SelectItem>
                      <SelectItem value="Мастер-класс по джиу-джитсу">Мастер-класс по джиу-джитсу</SelectItem>
                      <SelectItem value="Мастер-класс по единоборствам">Мастер-класс по единоборствам</SelectItem>
                      <SelectItem value="Лекции приглашенных спикеров">Лекции приглашенных спикеров</SelectItem>
                      <SelectItem value="Лекции участников">Лекции участников</SelectItem>
                      <SelectItem value="Семейный день">Семейный день</SelectItem>
                      <SelectItem value="Краш тест по BJJ">Краш тест по BJJ</SelectItem>
                      <SelectItem value="Краш тест по кикбоксингу">Краш тест по кикбоксингу</SelectItem>
                      <SelectItem value="Гонка Героев">Гонка Героев</SelectItem>
                      <SelectItem value="Баня">Баня</SelectItem>
                    </SelectContent>
                  </Select>
                 </div>

                <div>
                  <Label className="text-white">Описание мероприятия</Label>
                  <Textarea 
                    value={formData.event_description}
                    onChange={e => setFormData(prev => ({
                      ...prev,
                      event_description: e.target.value
                    }))}
                    placeholder="Добавьте описание мероприятия..."
                    className="bg-white text-black min-h-[80px]"
                  />
                </div>

                <div>
                  <Label className="text-white">Лектор/Тренер</Label>
                  <Select value={formData.instructor_id} onValueChange={value => setFormData(prev => ({
                  ...prev,
                  instructor_id: value
                }))}>
                    <SelectTrigger className="bg-white text-black">
                      <SelectValue placeholder="Выберите тренера" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-gray-300 shadow-lg z-50">
                      {trainers.map(trainer => <SelectItem key={trainer.id} value={trainer.id}>
                          {trainer.name}
                        </SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-white">Цвет мероприятия</Label>
                  <Select value={formData.color} onValueChange={value => setFormData(prev => ({
                  ...prev,
                  color: value
                }))}>
                    <SelectTrigger className="bg-white text-black">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded" style={{
                        backgroundColor: formData.color
                      }}></div>
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
                  <Button type="button" variant="outline" onClick={() => {
                  setDialogOpen(false);
                  setEditingId(null);
                }}>
                    Отмена
                  </Button>
                  <Button type="submit" className="bg-destructive hover:bg-destructive/90">
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
                  <TableHead className="min-w-[150px] bg-primary/20 font-bold text-primary">Парадигма КЭМП</TableHead>
                  <TableHead className="min-w-[150px] bg-primary/20 font-bold text-primary">Нутрициология</TableHead>
                  <TableHead className="min-w-[100px]">Дата</TableHead>
                  <TableHead className="min-w-[100px]">День недели</TableHead>
                  <TableHead className="min-w-[120px]">Время</TableHead>
                  <TableHead className="min-w-[150px]">Мероприятие</TableHead>
                  <TableHead className="min-w-[120px]">Лектор/Тренер</TableHead>
                  <TableHead className="w-[100px]">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {scheduleItems.map(item => <TableRow key={item.id} style={{
                backgroundColor: `${item.color || '#6366f1'}15`
              }}>
                    <TableCell>
                      <Badge style={{
                    color: item.color || '#6366f1',
                    borderColor: item.color || '#6366f1',
                    backgroundColor: 'transparent'
                  }} className="border font-semibold">
                        {item.ascetic_nutrition}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge style={{
                    color: item.color || '#6366f1',
                    borderColor: item.color || '#6366f1',
                    backgroundColor: 'transparent'
                  }} className="border font-semibold">
                        {item.nutrition}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge style={{
                    color: item.color || '#6366f1',
                    borderColor: item.color || '#6366f1',
                    backgroundColor: 'transparent'
                  }} className="border font-semibold">
                        {item.date}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge style={{
                    color: item.color || '#6366f1',
                    borderColor: item.color || '#6366f1',
                    backgroundColor: 'transparent'
                  }} className="border font-semibold">
                        {item.dayOfWeek}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge style={{
                    color: item.color || '#6366f1',
                    borderColor: item.color || '#6366f1',
                    backgroundColor: 'transparent'
                  }} className="border font-semibold">
                        {item.time}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge style={{
                    color: item.color || '#6366f1',
                    borderColor: item.color || '#6366f1',
                    backgroundColor: 'transparent'
                  }} className="border font-semibold">
                        {item.activity}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge style={{
                    color: item.color || '#6366f1',
                    borderColor: item.color || '#6366f1',
                    backgroundColor: 'transparent'
                  }} className="border font-semibold">
                        {item.instructor}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(item)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(item.id)} className="text-destructive hover:text-destructive">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>)}</TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>;
};