import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar, Plus, Edit, Trash2, CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ScheduleItem {
  id: string;
  ascetic_nutrition: string;
  nutrition: string;
  date: string;
  dayOfWeek: string;
  time: string;
  activity: string;
  instructor: string;
}

interface Trainer {
  id: string;
  name: string;
}

export const DetailedScheduleManagement: React.FC = () => {
  const [scheduleItems, setScheduleItems] = useState<ScheduleItem[]>([
    {
      id: '1',
      ascetic_nutrition: 'вводная неделя',
      nutrition: 'Вводная по нутрициологии',
      date: '08.09.2025',
      dayOfWeek: 'Понедельник',
      time: '08:00:00-07:30:00',
      activity: 'BJJ',
      instructor: '-'
    },
    {
      id: '2',
      ascetic_nutrition: '-',
      nutrition: '-',
      date: '10.09.2025',
      dayOfWeek: 'Среда',
      time: '06:00:00-07:30:00',
      activity: 'ОФП',
      instructor: 'Андреев Дмитрий'
    },
    {
      id: '3',
      ascetic_nutrition: 'Вводная неделя',
      nutrition: 'Вводная неделя',
      date: '10.09.2025',
      dayOfWeek: 'Среда',
      time: '07:30:00-07:30:00',
      activity: 'Вводная лекция Пирамида КЭМП',
      instructor: 'Андреев Дмитрий'
    },
    {
      id: '4',
      ascetic_nutrition: 'вводная неделя',
      nutrition: 'вводная неделя',
      date: '12.09.2025',
      dayOfWeek: 'Пятница',
      time: '06:00:00-07:30:00',
      activity: 'Тренировка Кикбоксинг',
      instructor: 'Андреев Дмитрий'
    },
  ]);

  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    ascetic_nutrition: '',
    nutrition: '',
    date: undefined as Date | undefined,
    start_time: '08:00',
    end_time: '09:30',
    activity: '',
    instructor_id: '',
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchTrainers();
  }, []);

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

    const selectedTrainer = trainers.find(t => t.id === formData.instructor_id);
    const newEvent: ScheduleItem = {
      id: Date.now().toString(),
      ascetic_nutrition: formData.ascetic_nutrition,
      nutrition: formData.nutrition,
      date: format(formData.date, 'dd.MM.yyyy'),
      dayOfWeek: getDayOfWeek(formData.date),
      time: `${formData.start_time}:00-${formData.end_time}:00`,
      activity: formData.activity,
      instructor: selectedTrainer ? selectedTrainer.name : '-'
    };

    // Обновим локальную таблицу для визуальной обратной связи
    setScheduleItems(prev => [...prev, newEvent]);

    // Сохранение в базу данных (таблица schedules)
    try {
      const { error } = await supabase.from('schedules').insert({
        title: formData.activity,
        description: [formData.ascetic_nutrition, formData.nutrition].filter(Boolean).join(' | ') || null,
        start_time: toISO(formData.date, formData.start_time),
        end_time: toISO(formData.date, formData.end_time),
        location: null,
        activity_type: formData.activity,
        max_participants: null,
        is_active: true,
        instructor_id: formData.instructor_id || null,
      });

      if (error) throw error;

      toast({
        title: 'Успех',
        description: 'Мероприятие добавлено и опубликовано в расписании',
      });
    } catch (err) {
      console.error('Error inserting schedule:', err);
      toast({
        title: 'Ошибка',
        description: 'Не удалось сохранить мероприятие. Проверьте права и попробуйте снова.',
        variant: 'destructive',
      });
    }

    // Сброс формы
    setDialogOpen(false);
    setFormData({
      ascetic_nutrition: '',
      nutrition: '',
      date: undefined,
      start_time: '08:00',
      end_time: '09:30',
      activity: '',
      instructor_id: '',
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Calendar className="w-6 h-6 text-destructive" />
            Управление расписанием потока
          </h1>
          <p className="text-muted-foreground">Детальное расписание мероприятий с полным редактированием</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-destructive hover:bg-destructive/90 text-white">
              <Plus className="w-4 h-4 mr-2" />
              Добавить мероприятие
            </Button>
          </DialogTrigger>
          
          <DialogContent className="max-w-lg bg-gray-900 border-gray-700 max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-white">Добавить мероприятие</DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleAddEvent} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-white">Смысл аскезы/Парадигма КЭМП</Label>
                  <Input
                    value={formData.ascetic_nutrition}
                    onChange={(e) => setFormData(prev => ({ ...prev, ascetic_nutrition: e.target.value }))}
                    placeholder="вводная неделя"
                    className="bg-white text-black"
                  />
                </div>
                <div>
                  <Label className="text-white">Смысл аскезы/Нутрициология</Label>
                  <Input
                    value={formData.nutrition}
                    onChange={(e) => setFormData(prev => ({ ...prev, nutrition: e.target.value }))}
                    placeholder="Вводная по нутрициологии"
                    className="bg-white text-black"
                  />
                </div>
              </div>

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
                    <SelectItem value="BJJ" className="hover:bg-gray-100">BJJ</SelectItem>
                    <SelectItem value="ОФП" className="hover:bg-gray-100">ОФП</SelectItem>
                    <SelectItem value="Кикбоксинг" className="hover:bg-gray-100">Кикбоксинг</SelectItem>
                    <SelectItem value="Тактическая подготовка" className="hover:bg-gray-100">Тактическая подготовка</SelectItem>
                    <SelectItem value="Лекция Пирамида КЭМП" className="hover:bg-gray-100">Лекция Пирамида КЭМП</SelectItem>
                    <SelectItem value="Теория" className="hover:bg-gray-100">Теория</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-white">Лектор/Тренер</Label>
                <Select value={formData.instructor_id} onValueChange={(value) => setFormData(prev => ({ ...prev, instructor_id: value }))}>
                  <SelectTrigger className="bg-white text-black">
                    <SelectValue placeholder="Выберите тренера" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-gray-300 shadow-lg z-50">
                    {trainers.map((trainer) => (
                      <SelectItem key={trainer.id} value={trainer.id} className="hover:bg-gray-100">
                        {trainer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2">
                <Button 
                  type="submit" 
                  className="bg-destructive hover:bg-destructive/90 text-white"
                >
                  Добавить мероприятие
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setDialogOpen(false)}
                  className="border-gray-600 text-gray-300 hover:bg-gray-800"
                >
                  Отмена
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Расписание потока</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Смысл аскезы/ Парадигма КЭМП</TableHead>
                  <TableHead>Смысл аскезы/ Нутрициология</TableHead>
                  <TableHead>Дата</TableHead>
                  <TableHead>День недели</TableHead>
                  <TableHead>Время</TableHead>
                  <TableHead>Мероприятие</TableHead>
                  <TableHead>Лектор</TableHead>
                  <TableHead>Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {scheduleItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.ascetic_nutrition}</TableCell>
                    <TableCell>{item.nutrition}</TableCell>
                    <TableCell>{item.date}</TableCell>
                    <TableCell>{item.dayOfWeek}</TableCell>
                    <TableCell>{item.time}</TableCell>
                    <TableCell>
                      <Badge className={getActivityBadgeColor(item.activity)}>
                        {item.activity}
                      </Badge>
                    </TableCell>
                    <TableCell>{item.instructor}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm">
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-destructive">
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