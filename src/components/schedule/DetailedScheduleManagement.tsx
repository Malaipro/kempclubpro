import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Calendar, Plus, Edit, Trash2 } from 'lucide-react';

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

export const DetailedScheduleManagement: React.FC = () => {
  const [scheduleItems] = useState<ScheduleItem[]>([
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
    {
      id: '5',
      ascetic_nutrition: 'вводная неделя',
      nutrition: 'вводная неделя',
      date: '-',
      dayOfWeek: 'Понедельник',
      time: '07:30:00-07:30:00',
      activity: 'вводная лекция по нутрициологии',
      instructor: 'Михаил Гришин'
    }
  ]);

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
        <Button className="bg-destructive hover:bg-destructive/90 text-white">
          <Plus className="w-4 h-4 mr-2" />
          Добавить мероприятие
        </Button>
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