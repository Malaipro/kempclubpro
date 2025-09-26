import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar, Users, Plus, Eye, Edit, CalendarIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface Stream {
  id: string;
  name: string;
  description?: string;
  start_date: string;
  end_date?: string;
  max_participants?: number;
  is_active: boolean;
  stream_type: string;
  participant_count?: number;
}

export const EnhancedStreamManagement: React.FC = () => {
  const [streams, setStreams] = useState<Stream[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    start_date: undefined as Date | undefined,
    end_date: undefined as Date | undefined,
    max_participants: '',
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchStreams();
  }, []);

  const fetchStreams = async () => {
    try {
      const { data, error } = await supabase
        .from('streams')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Add mock participant counts for demo
      const streamsWithCounts = data?.map((stream, index) => ({
        ...stream,
        participant_count: index === 0 ? 1 : 0, // First stream has 1 participant
      })) || [];

      setStreams(streamsWithCounts);
    } catch (error) {
      console.error('Error fetching streams:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось загрузить потоки',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleStreamStatus = async (streamId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('streams')
        .update({ is_active: !currentStatus })
        .eq('id', streamId);

      if (error) throw error;

      setStreams(prev => 
        prev.map(stream => 
          stream.id === streamId 
            ? { ...stream, is_active: !currentStatus }
            : stream
        )
      );

      toast({
        title: 'Статус изменен',
        description: `Поток ${!currentStatus ? 'активирован' : 'деактивирован'}`,
      });
    } catch (error) {
      console.error('Error updating stream status:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось изменить статус потока',
        variant: 'destructive',
      });
    }
  };

  const handleCreateStream = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.start_date) {
      toast({
        title: 'Ошибка',
        description: 'Заполните обязательные поля',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('streams')
        .insert({
          name: formData.name,
          description: formData.description,
          start_date: formData.start_date.toISOString().split('T')[0],
          end_date: formData.end_date?.toISOString().split('T')[0],
          max_participants: formData.max_participants ? parseInt(formData.max_participants) : null,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;

      setStreams(prev => [{ ...data, participant_count: 0 }, ...prev]);
      setDialogOpen(false);
      setFormData({
        name: '',
        description: '',
        start_date: undefined,
        end_date: undefined,
        max_participants: '',
      });

      toast({
        title: 'Успех',
        description: 'Поток успешно создан',
      });
    } catch (error) {
      console.error('Error creating stream:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось создать поток',
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = (isActive: boolean, isCurrent: boolean = false) => {
    if (isCurrent) {
      return <Badge className="bg-green-100 text-green-800">Текущий</Badge>;
    }
    return isActive 
      ? <Badge className="bg-blue-100 text-blue-800">Активный</Badge>
      : <Badge variant="secondary">Неактивный</Badge>;
  };

  const formatDateRange = (startDate: string, endDate?: string) => {
    const start = format(new Date(startDate), 'dd.MM.yyyy');
    const end = endDate ? format(new Date(endDate), 'dd.MM.yyyy') : null;
    return end ? `${start} - ${end}` : start;
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-pulse">Загрузка потоков...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Управление потоками</h1>
          <p className="text-muted-foreground">Создавайте и управляйте интенсивными потоками</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-destructive hover:bg-destructive/90 text-white">
              <Plus className="w-4 h-4 mr-2" />
              Создать поток
            </Button>
          </DialogTrigger>
          
          <DialogContent className="max-w-md bg-gray-900 border-gray-700">
            <DialogHeader>
              <DialogTitle className="text-white">Создать новый поток</DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleCreateStream} className="space-y-4">
              <div>
                <Label className="text-white">Название потока *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="3-й поток"
                  className="bg-white text-black"
                  required
                />
              </div>

              <div>
                <Label className="text-white">Описание</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Описание потока..."
                  className="bg-white text-black"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-white">Дата начала *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal bg-white text-black hover:bg-gray-50",
                          !formData.start_date && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.start_date ? format(formData.start_date, "dd.MM.yyyy") : "Выберите дату"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-white border border-gray-300 shadow-lg z-50" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={formData.start_date}
                        onSelect={(date) => setFormData(prev => ({ ...prev, start_date: date }))}
                        initialFocus
                        className="bg-white"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                
                <div>
                  <Label className="text-white">Дата окончания</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal bg-white text-black hover:bg-gray-50",
                          !formData.end_date && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.end_date ? format(formData.end_date, "dd.MM.yyyy") : "Выберите дату"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-white border border-gray-300 shadow-lg z-50" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={formData.end_date}
                        onSelect={(date) => setFormData(prev => ({ ...prev, end_date: date }))}
                        initialFocus
                        className="bg-white"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div>
                <Label className="text-white">Максимум участников</Label>
                <Input
                  type="number"
                  value={formData.max_participants}
                  onChange={(e) => setFormData(prev => ({ ...prev, max_participants: e.target.value }))}
                  placeholder="20"
                  className="bg-white text-black"
                />
              </div>

              <div className="flex gap-2">
                <Button 
                  type="submit" 
                  className="bg-destructive hover:bg-destructive/90 text-white"
                >
                  Создать поток
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

      <div className="grid gap-4">
        {streams.map((stream, index) => {
          const isCurrent = index === 0 && stream.is_active; // First active stream is current
          
          return (
            <Card key={stream.id} className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-lg">{stream.name}</h3>
                    {getStatusBadge(stream.is_active, isCurrent)}
                  </div>
                  
                  <p className="text-muted-foreground mb-3">
                    {stream.description || 'Без описания'}
                  </p>
                  
                  <div className="flex items-center gap-6 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {formatDateRange(stream.start_date, stream.end_date)}
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {stream.participant_count || 0} участников
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  {/* Toggle Switch */}
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={stream.is_active}
                      onCheckedChange={() => toggleStreamStatus(stream.id, stream.is_active)}
                    />
                    <div className="w-6 h-6 bg-muted rounded-full flex items-center justify-center">
                      <div className="w-3 h-3 bg-white rounded-full" />
                    </div>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm">
                      <Edit className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  {/* Special Button for Current Stream */}
                  {isCurrent && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-red-600 border-red-200 hover:bg-red-50"
                    >
                      Сделать текущим
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {streams.length === 0 && (
        <Card className="p-8">
          <div className="text-center text-muted-foreground">
            <Calendar className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-semibold mb-2">Нет потоков</h3>
            <p className="text-sm">Создайте первый поток, чтобы начать</p>
          </div>
        </Card>
      )}
    </div>
  );
};