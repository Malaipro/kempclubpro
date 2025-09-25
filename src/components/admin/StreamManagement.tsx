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
import { Calendar, Plus, Edit, Trash2, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Stream {
  id: string;
  name: string;
  description: string | null;
  stream_type: string;
  start_date: string;
  end_date: string | null;
  max_participants: number | null;
  is_active: boolean;
  created_at: string;
}

export const StreamManagement: React.FC = () => {
  const [streams, setStreams] = useState<Stream[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingStream, setEditingStream] = useState<Stream | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    stream_type: 'intensive',
    start_date: '',
    end_date: '',
    max_participants: '',
  });
  const { toast } = useToast();

  const fetchStreams = async () => {
    try {
      const { data, error } = await supabase
        .from('streams')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setStreams(data || []);
    } catch (error) {
      console.error('Error fetching streams:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось загрузить список потоков',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStreams();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const streamData = {
      name: formData.name,
      description: formData.description || null,
      stream_type: formData.stream_type,
      start_date: formData.start_date,
      end_date: formData.end_date || null,
      max_participants: formData.max_participants ? parseInt(formData.max_participants) : null,
    };

    try {
      if (editingStream) {
        const { error } = await supabase
          .from('streams')
          .update(streamData)
          .eq('id', editingStream.id);
        
        if (error) throw error;
        toast({ title: 'Поток обновлен', description: 'Изменения сохранены успешно' });
      } else {
        const { error } = await supabase
          .from('streams')
          .insert([streamData]);
        
        if (error) throw error;
        toast({ title: 'Поток создан', description: 'Новый поток добавлен успешно' });
      }

      setIsDialogOpen(false);
      setEditingStream(null);
      setFormData({
        name: '',
        description: '',
        stream_type: 'intensive',
        start_date: '',
        end_date: '',
        max_participants: '',
      });
      fetchStreams();
    } catch (error) {
      console.error('Error saving stream:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось сохранить поток',
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (stream: Stream) => {
    setEditingStream(stream);
    setFormData({
      name: stream.name,
      description: stream.description || '',
      stream_type: stream.stream_type,
      start_date: stream.start_date,
      end_date: stream.end_date || '',
      max_participants: stream.max_participants?.toString() || '',
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (streamId: string) => {
    if (!confirm('Вы уверены, что хотите удалить этот поток?')) return;

    try {
      const { error } = await supabase
        .from('streams')
        .delete()
        .eq('id', streamId);

      if (error) throw error;
      toast({ title: 'Поток удален', description: 'Поток успешно удален' });
      fetchStreams();
    } catch (error) {
      console.error('Error deleting stream:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось удалить поток',
        variant: 'destructive',
      });
    }
  };

  const getStreamTypeLabel = (type: string) => {
    switch (type) {
      case 'intensive': return 'Интенсив';
      case 'regular': return 'Регулярный';
      case 'special': return 'Специальный';
      default: return type;
    }
  };

  return (
    <Card className="kamp-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 justify-between">
          <div className="flex items-center gap-2 text-kamp-accent">
            <Calendar className="w-5 h-5" />
            Управление потоками
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Создать поток
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingStream ? 'Редактировать поток' : 'Создать новый поток'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Название потока</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="stream_type">Тип потока</Label>
                  <Select value={formData.stream_type} onValueChange={(value) => setFormData({ ...formData, stream_type: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="intensive">Интенсив</SelectItem>
                      <SelectItem value="regular">Регулярный</SelectItem>
                      <SelectItem value="special">Специальный</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="start_date">Дата начала</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="end_date">Дата окончания</Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="max_participants">Макс. участников</Label>
                  <Input
                    id="max_participants"
                    type="number"
                    value={formData.max_participants}
                    onChange={(e) => setFormData({ ...formData, max_participants: e.target.value })}
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
                    {editingStream ? 'Сохранить' : 'Создать'}
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
            <div className="animate-pulse">Загрузка потоков...</div>
          </div>
        ) : (
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Название</TableHead>
                  <TableHead>Тип</TableHead>
                  <TableHead>Период</TableHead>
                  <TableHead>Участники</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {streams.map((stream) => (
                  <TableRow key={stream.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{stream.name}</div>
                        {stream.description && (
                          <div className="text-sm text-gray-600">{stream.description}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {getStreamTypeLabel(stream.stream_type)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{new Date(stream.start_date).toLocaleDateString('ru-RU')}</div>
                        {stream.end_date && (
                          <div className="text-gray-600">
                            - {new Date(stream.end_date).toLocaleDateString('ru-RU')}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {stream.max_participants || '∞'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={stream.is_active ? "default" : "secondary"}>
                        {stream.is_active ? 'Активный' : 'Неактивный'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(stream)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(stream.id)}
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

        {streams.length === 0 && !loading && (
          <div className="text-center py-8 text-gray-500">
            Нет созданных потоков
          </div>
        )}
      </CardContent>
    </Card>
  );
};