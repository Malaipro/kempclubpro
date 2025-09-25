import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Edit, Trash2, Activity } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ActivityData {
  id: string;
  name: string;
  description: string | null;
  category: string;
  points: number;
  difficulty_level: number;
  duration_minutes: number | null;
  is_active: boolean;
  created_at: string;
}

export const ActivityFormAdmin: React.FC = () => {
  const [activities, setActivities] = useState<ActivityData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<ActivityData | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    points: '',
    difficulty_level: '1',
    duration_minutes: '',
  });
  const { toast } = useToast();

  const categories = [
    'ОФП (Общая физическая подготовка)',
    'Кикбоксинг',
    'БЖЖ (Бразильское джиу-джитсу)',
    'Тактическая подготовка',
    'Теория'
  ];

  const fetchActivities = async () => {
    try {
      const { data, error } = await supabase
        .from('activities')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setActivities(data || []);
    } catch (error) {
      console.error('Error fetching activities:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось загрузить список активностей',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const activityData = {
      name: formData.name,
      description: formData.description || null,
      category: formData.category,
      points: parseInt(formData.points),
      difficulty_level: parseInt(formData.difficulty_level),
      duration_minutes: formData.duration_minutes ? parseInt(formData.duration_minutes) : null,
    };

    try {
      if (editingActivity) {
        const { error } = await supabase
          .from('activities')
          .update(activityData)
          .eq('id', editingActivity.id);
        
        if (error) throw error;
        toast({ title: 'Активность обновлена', description: 'Изменения сохранены успешно' });
      } else {
        const { error } = await supabase
          .from('activities')
          .insert([activityData]);
        
        if (error) throw error;
        toast({ title: 'Активность создана', description: 'Новая активность добавлена успешно' });
      }

      setIsDialogOpen(false);
      setEditingActivity(null);
      setFormData({
        name: '',
        description: '',
        category: '',
        points: '',
        difficulty_level: '1',
        duration_minutes: '',
      });
      fetchActivities();
    } catch (error) {
      console.error('Error saving activity:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось сохранить активность',
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (activity: ActivityData) => {
    setEditingActivity(activity);
    setFormData({
      name: activity.name,
      description: activity.description || '',
      category: activity.category,
      points: activity.points.toString(),
      difficulty_level: activity.difficulty_level.toString(),
      duration_minutes: activity.duration_minutes?.toString() || '',
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (activityId: string) => {
    if (!confirm('Вы уверены, что хотите удалить эту активность?')) return;

    try {
      const { error } = await supabase
        .from('activities')
        .delete()
        .eq('id', activityId);

      if (error) throw error;
      toast({ title: 'Активность удалена', description: 'Активность успешно удалена' });
      fetchActivities();
    } catch (error) {
      console.error('Error deleting activity:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось удалить активность',
        variant: 'destructive',
      });
    }
  };

  const toggleActiveStatus = async (activity: ActivityData) => {
    try {
      const { error } = await supabase
        .from('activities')
        .update({ is_active: !activity.is_active })
        .eq('id', activity.id);

      if (error) throw error;
      toast({ 
        title: 'Статус изменен', 
        description: `Активность ${!activity.is_active ? 'активирована' : 'деактивирована'}` 
      });
      fetchActivities();
    } catch (error) {
      console.error('Error toggling activity status:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось изменить статус активности',
        variant: 'destructive',
      });
    }
  };

  const getDifficultyLabel = (level: number) => {
    switch (level) {
      case 1: return 'Легко';
      case 2: return 'Средне';
      case 3: return 'Сложно';
      case 4: return 'Очень сложно';
      case 5: return 'Экстрим';
      default: return level.toString();
    }
  };

  return (
    <Card className="bg-white border-gray-300">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 justify-between">
          <div className="flex items-center gap-2 text-gray-900">
            <Plus className="w-5 h-5 text-kamp-accent" />
            Управление активностями
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Создать активность
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingActivity ? 'Редактировать активность' : 'Создать новую активность'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Название активности</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="category">Категория</Label>
                  <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите категорию" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category} value={category}>{category}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="points">Очки</Label>
                    <Input
                      id="points"
                      type="number"
                      value={formData.points}
                      onChange={(e) => setFormData({ ...formData, points: e.target.value })}
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="difficulty_level">Сложность</Label>
                    <Select value={formData.difficulty_level} onValueChange={(value) => setFormData({ ...formData, difficulty_level: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 - Легко</SelectItem>
                        <SelectItem value="2">2 - Средне</SelectItem>
                        <SelectItem value="3">3 - Сложно</SelectItem>
                        <SelectItem value="4">4 - Очень сложно</SelectItem>
                        <SelectItem value="5">5 - Экстрим</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="duration_minutes">Длительность (минуты)</Label>
                  <Input
                    id="duration_minutes"
                    type="number"
                    value={formData.duration_minutes}
                    onChange={(e) => setFormData({ ...formData, duration_minutes: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="description">Описание</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                  />
                </div>

                <div className="flex gap-2 justify-end">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Отмена
                  </Button>
                  <Button type="submit">
                    {editingActivity ? 'Сохранить' : 'Создать'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-pulse">Загрузка активностей...</div>
          </div>
        ) : (
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Название</TableHead>
                  <TableHead>Категория</TableHead>
                  <TableHead>Очки</TableHead>
                  <TableHead>Сложность</TableHead>
                  <TableHead>Длительность</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activities.map((activity) => (
                  <TableRow key={activity.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{activity.name}</div>
                        {activity.description && (
                          <div className="text-sm text-gray-600 line-clamp-1">{activity.description}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{activity.category}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge>{activity.points}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {getDifficultyLabel(activity.difficulty_level)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {activity.duration_minutes ? `${activity.duration_minutes} мин` : '—'}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleActiveStatus(activity)}
                        className={activity.is_active ? 'text-green-600' : 'text-gray-500'}
                      >
                        {activity.is_active ? 'Активна' : 'Неактивна'}
                      </Button>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(activity)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(activity.id)}
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
        )}

        {activities.length === 0 && !loading && (
          <div className="text-center py-8 text-gray-500">
            Нет созданных активностей
          </div>
        )}
      </CardContent>
    </Card>
  );
};