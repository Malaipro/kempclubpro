import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Settings, Plus, Edit, Trash2, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useRole } from '@/hooks/useRole';
import { z } from 'zod';

interface AsceticType {
  id: string;
  name: string;
  description: string | null;
  default_points: number;
  default_duration_minutes: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface AsceticTypeForm {
  name: string;
  description: string;
  default_points: number;
  default_duration_minutes: number;
  is_active: boolean;
}

const asceticTypeSchema = z.object({
  name: z.string().min(1, 'Название обязательно').max(100, 'Название слишком длинное'),
  description: z.string().max(500, 'Описание слишком длинное').optional(),
  default_points: z.number().min(1, 'Минимум 1 очко').max(100, 'Максимум 100 очков'),
  default_duration_minutes: z.number().min(0, 'Длительность не может быть отрицательной').max(1440, 'Максимум 24 часа').optional(),
  is_active: z.boolean()
});

export const AsceticTypesManagement: React.FC = () => {
  const [asceticTypes, setAsceticTypes] = useState<AsceticType[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<AsceticType | null>(null);
  const [formData, setFormData] = useState<AsceticTypeForm>({
    name: '',
    description: '',
    default_points: 1,
    default_duration_minutes: 0,
    is_active: true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();
  const { isSuperAdmin, loading: roleLoading } = useRole();

  const fetchAsceticTypes = async () => {
    if (!isSuperAdmin) {
      setLoading(false);
      return;
    }
    
    try {
      const { data, error } = await supabase
        .from('ascetic_types')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setAsceticTypes(data || []);
    } catch (error) {
      console.error('Error fetching ascetic types:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось загрузить типы аскез',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!roleLoading) {
      fetchAsceticTypes();
    }
  }, [isSuperAdmin, roleLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    
    try {
      const validatedData = asceticTypeSchema.parse({
        name: formData.name,
        description: formData.description || undefined,
        default_points: formData.default_points,
        default_duration_minutes: formData.default_duration_minutes || undefined,
        is_active: formData.is_active
      });

      const typeData = {
        name: validatedData.name,
        description: validatedData.description || null,
        default_points: validatedData.default_points,
        default_duration_minutes: validatedData.default_duration_minutes || null,
        is_active: validatedData.is_active,
      };

      if (editingType) {
        const { error } = await supabase
          .from('ascetic_types')
          .update(typeData)
          .eq('id', editingType.id);

        if (error) throw error;

        toast({
          title: 'Успешно',
          description: 'Тип аскезы обновлен',
        });
      } else {
        const { error } = await supabase
          .from('ascetic_types')
          .insert(typeData);

        if (error) throw error;

        toast({
          title: 'Успешно',
          description: 'Тип аскезы создан',
        });
      }

      setDialogOpen(false);
      setEditingType(null);
      resetForm();
      fetchAsceticTypes();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        error.issues.forEach((issue) => {
          if (issue.path[0]) {
            fieldErrors[issue.path[0] as string] = issue.message;
          }
        });
        setErrors(fieldErrors);
        return;
      }
      
      console.error('Error saving ascetic type:', error);
      toast({
        title: 'Ошибка',
        description: editingType ? 'Не удалось обновить тип аскезы' : 'Не удалось создать тип аскезы',
        variant: 'destructive',
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      default_points: 1,
      default_duration_minutes: 0,
      is_active: true,
    });
    setErrors({});
  };

  const handleEdit = (type: AsceticType) => {
    setEditingType(type);
    setFormData({
      name: type.name,
      description: type.description || '',
      default_points: type.default_points,
      default_duration_minutes: type.default_duration_minutes || 0,
      is_active: type.is_active,
    });
    setErrors({});
    setDialogOpen(true);
  };

  const handleDelete = async (typeId: string) => {
    if (!confirm('Вы уверены, что хотите удалить этот тип аскезы?')) return;

    try {
      const { error } = await supabase
        .from('ascetic_types')
        .delete()
        .eq('id', typeId);

      if (error) throw error;

      toast({
        title: 'Успешно',
        description: 'Тип аскезы удален',
      });

      fetchAsceticTypes();
    } catch (error) {
      console.error('Error deleting ascetic type:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось удалить тип аскезы',
        variant: 'destructive',
      });
    }
  };

  const handleToggleActive = async (typeId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('ascetic_types')
        .update({ is_active: isActive })
        .eq('id', typeId);

      if (error) throw error;

      toast({
        title: 'Успешно',
        description: `Тип аскезы ${isActive ? 'активирован' : 'деактивирован'}`,
      });

      fetchAsceticTypes();
    } catch (error) {
      console.error('Error toggling ascetic type:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось изменить статус типа аскезы',
        variant: 'destructive',
      });
    }
  };

  if (roleLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-pulse text-gray-400">Загрузка...</div>
      </div>
    );
  }

  if (!isSuperAdmin) {
    return (
      <div className="bg-gray-900 p-6 rounded-lg">
        <div className="text-center py-8">
          <AlertCircle className="w-16 h-16 mx-auto mb-4 text-yellow-500" />
          <h3 className="text-lg font-semibold text-white mb-2">Доступ ограничен</h3>
          <p className="text-gray-400 mb-4">
            Управление типами аскез доступно только супер-администраторам
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-semibold">Управление типами аскез</h2>
        </div>
        
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              setEditingType(null);
              resetForm();
            }}>
              <Plus className="w-4 h-4 mr-2" />
              Создать тип аскезы
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>
                {editingType ? 'Редактировать тип аскезы' : 'Создать новый тип аскезы'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Название *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className={errors.name ? 'border-red-500' : ''}
                  placeholder="Например: Холодный душ"
                />
                {errors.name && <p className="text-red-400 text-sm">{errors.name}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Описание</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className={errors.description ? 'border-red-500' : ''}
                  placeholder="Описание типа аскезы"
                  rows={3}
                />
                {errors.description && <p className="text-red-400 text-sm">{errors.description}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="default_points">Очки по умолчанию *</Label>
                  <Input
                    id="default_points"
                    type="number"
                    value={formData.default_points}
                    onChange={(e) => setFormData({...formData, default_points: parseInt(e.target.value) || 1})}
                    className={errors.default_points ? 'border-red-500' : ''}
                    min="1"
                    max="100"
                  />
                  {errors.default_points && <p className="text-red-400 text-sm">{errors.default_points}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="default_duration_minutes">Длительность (мин)</Label>
                  <Input
                    id="default_duration_minutes"
                    type="number"
                    value={formData.default_duration_minutes}
                    onChange={(e) => setFormData({...formData, default_duration_minutes: parseInt(e.target.value) || 0})}
                    className={errors.default_duration_minutes ? 'border-red-500' : ''}
                    min="0"
                    placeholder="0"
                  />
                  {errors.default_duration_minutes && <p className="text-red-400 text-sm">{errors.default_duration_minutes}</p>}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({...formData, is_active: checked})}
                />
                <Label htmlFor="is_active">Активный тип</Label>
              </div>

              <div className="flex gap-2 pt-4">
                <Button type="submit" className="flex-1">
                  {editingType ? 'Обновить' : 'Создать'}
                </Button>
                <Button type="button" variant="outline" onClick={() => {
                  setDialogOpen(false);
                  setEditingType(null);
                  resetForm();
                }}>
                  Отмена
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Типы аскез ({asceticTypes.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {asceticTypes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Нет типов аскез
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Название</TableHead>
                    <TableHead>Описание</TableHead>
                    <TableHead>Очки</TableHead>
                    <TableHead>Длительность</TableHead>
                    <TableHead>Статус</TableHead>
                    <TableHead>Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {asceticTypes.map((type) => (
                    <TableRow key={type.id}>
                      <TableCell className="font-medium">{type.name}</TableCell>
                      <TableCell className="max-w-xs truncate">
                        {type.description || '—'}
                      </TableCell>
                      <TableCell>{type.default_points}</TableCell>
                      <TableCell>
                        {type.default_duration_minutes ? `${type.default_duration_minutes} мин` : '—'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={type.is_active}
                            onCheckedChange={(checked) => handleToggleActive(type.id, checked)}
                          />
                          <Badge variant={type.is_active ? 'default' : 'secondary'}>
                            {type.is_active ? 'Активен' : 'Неактивен'}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(type)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(type.id)}
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
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};