import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Users, Plus, Edit, Trash2, User, CalendarIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface Participant {
  id: string;
  user_id: string;
  display_name: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  telegram?: string;
  total_points: number;
  stream?: string;
  status: 'registered' | 'active' | 'completed';
  height_cm?: number;
  weight_kg?: number;
  date_of_birth?: string;
}

export const EnhancedParticipantManagement: React.FC = () => {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingParticipant, setEditingParticipant] = useState<Participant | null>(null);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    telegram: '',
    stream: '',
    password: '',
    height_cm: '',
    weight_kg: '',
    date_of_birth: undefined as Date | undefined,
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchParticipants();
  }, []);

  const fetchParticipants = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, user_id, display_name, first_name, last_name, total_points, height_cm, weight_kg, date_of_birth')
        .order('display_name');

      if (error) throw error;

      // Transform data to match our interface
      const transformedData = data?.map(item => ({
        ...item,
        total_points: item.total_points || 0,
        stream: '2-й поток',
        status: 'registered' as const,
        email: 'participant@mail.ru' // Mock email, would come from auth.users in real implementation
      })) || [];

      setParticipants(transformedData);
    } catch (error) {
      console.error('Error fetching participants:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось загрузить участников',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.first_name || !formData.last_name || !formData.email) {
      toast({
        title: 'Ошибка',
        description: 'Заполните обязательные поля',
        variant: 'destructive',
      });
      return;
    }

    try {
      if (editingParticipant) {
        // Update existing participant
        const { error } = await supabase
          .from('profiles')
          .update({
            first_name: formData.first_name,
            last_name: formData.last_name,
            display_name: `${formData.first_name} ${formData.last_name}`,
            height_cm: formData.height_cm ? parseInt(formData.height_cm) : null,
            weight_kg: formData.weight_kg ? parseInt(formData.weight_kg) : null,
            date_of_birth: formData.date_of_birth?.toISOString().split('T')[0] || null,
          })
          .eq('id', editingParticipant.id);

        if (error) throw error;

        toast({
          title: 'Участник обновлен',
          description: 'Данные участника успешно обновлены',
        });
      } else {
        // Create new participant
        const { data, error } = await supabase.functions.invoke('create-user', {
          body: {
            email: formData.email,
            password: formData.password,
            metadata: {
              first_name: formData.first_name,
              last_name: formData.last_name,
              display_name: `${formData.first_name} ${formData.last_name}`,
              phone: formData.phone || null,
              telegram: formData.telegram || null,
              height_cm: formData.height_cm ? parseInt(formData.height_cm) : null,
              weight_kg: formData.weight_kg ? parseInt(formData.weight_kg) : null,
              date_of_birth: formData.date_of_birth ? formData.date_of_birth.toISOString().split('T')[0] : null,
             }
           }
         });

        if (error) {
          console.error('Error creating participant:', error);
          let errorMessage = 'Не удалось создать участника';
          
          // Try to extract error message from different possible structures
          if (typeof error === 'object' && error !== null) {
            if ('message' in error) {
              errorMessage = error.message as string;
            } else if ('error' in error && typeof error.error === 'string') {
              errorMessage = error.error;
            } else if ('details' in error && typeof error.details === 'string') {
              errorMessage = error.details;
            }
          }
          
          toast({
            title: 'Ошибка',
            description: errorMessage,
            variant: 'destructive',
          });
          return;
        }

        toast({
          title: 'Успешно',
          description: 'Участник создан',
          variant: 'default',
        });
      }

      setDialogOpen(false);
      setEditingParticipant(null);
      resetForm();
      fetchParticipants();
    } catch (error) {
      console.error('Error saving participant:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось сохранить участника',
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (participant: Participant) => {
    setEditingParticipant(participant);
    setFormData({
      first_name: participant.first_name || '',
      last_name: participant.last_name || '',
      email: participant.email || '',
      phone: '', // participant.phone || '', // Add when available
      telegram: '', // participant.telegram || '', // Add when available  
      stream: participant.stream || '2-й поток',
      password: '',
      height_cm: participant.height_cm?.toString() || '',
      weight_kg: participant.weight_kg?.toString() || '',
      date_of_birth: participant.date_of_birth ? new Date(participant.date_of_birth) : undefined,
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      telegram: '',
      stream: '2-й поток',
      password: '',
      height_cm: '',
      weight_kg: '',
      date_of_birth: undefined,
    });
  };

  const formatParticipantName = (participant: Participant) => {
    if (participant.first_name && participant.last_name) {
      return `${participant.first_name} ${participant.last_name}`;
    }
    return participant.display_name || 'Неизвестный участник';
  };

  const getInitials = (participant: Participant) => {
    const name = formatParticipantName(participant);
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'registered':
        return <Badge className="bg-green-100 text-green-800">Зарегистрирован</Badge>;
      case 'active':
        return <Badge className="bg-blue-100 text-blue-800">Активен</Badge>;
      case 'completed':
        return <Badge className="bg-gray-100 text-gray-800">Завершен</Badge>;
      default:
        return <Badge>Неизвестно</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-pulse">Загрузка участников...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Управление участниками</h1>
          <p className="text-muted-foreground">Добавляйте и редактируйте участников интенсивов</p>
        </div>
        
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              className="bg-destructive hover:bg-destructive/90 text-white"
              onClick={() => {
                setEditingParticipant(null);
                resetForm();
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Добавить участника
            </Button>
          </DialogTrigger>
          
          <DialogContent className="max-w-md bg-gray-900 border-gray-700">
            <DialogHeader>
              <DialogTitle className="text-white">
                {editingParticipant ? 'Редактировать участника' : 'Добавить нового участника'}
              </DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-white">Имя *</Label>
                  <Input
                    value={formData.first_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, first_name: e.target.value }))}
                    placeholder="Имя участника"
                    className="bg-white text-black"
                    required
                  />
                </div>
                <div>
                  <Label className="text-white">Фамилия</Label>
                  <Input
                    value={formData.last_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, last_name: e.target.value }))}
                    placeholder="Фамилия участника"
                    className="bg-white text-black"
                  />
                </div>
              </div>

              <div>
                <Label className="text-white">Электронная почта</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="email@example.com"
                  className="bg-white text-black"
                  disabled={!!editingParticipant}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-white">Телефон</Label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="+7 (999) 123-45-67"
                    className="bg-white text-black"
                  />
                </div>
                <div>
                  <Label className="text-white">Telegram</Label>
                  <Input
                    value={formData.telegram}
                    onChange={(e) => setFormData(prev => ({ ...prev, telegram: e.target.value }))}
                    placeholder="@username"
                    className="bg-white text-black"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="text-white">Рост (см)</Label>
                  <Input
                    type="number"
                    value={formData.height_cm}
                    onChange={(e) => setFormData(prev => ({ ...prev, height_cm: e.target.value }))}
                    placeholder="175"
                    className="bg-white text-black"
                  />
                </div>
                <div>
                  <Label className="text-white">Вес (кг)</Label>
                  <Input
                    type="number"
                    value={formData.weight_kg}
                    onChange={(e) => setFormData(prev => ({ ...prev, weight_kg: e.target.value }))}
                    placeholder="70"
                    className="bg-white text-black"
                  />
                </div>
                <div>
                  <Label className="text-white">Дата рождения</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal bg-white text-black hover:bg-gray-50",
                          !formData.date_of_birth && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.date_of_birth ? format(formData.date_of_birth, "dd.MM.yyyy") : "дд.мм.гггг"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-white border border-gray-300 shadow-lg z-[9999]" align="start">
                      <Calendar
                        mode="single"
                        selected={formData.date_of_birth}
                        onSelect={(date) => setFormData(prev => ({ ...prev, date_of_birth: date }))}
                        initialFocus
                        className="bg-white pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div>
                <Label className="text-white">Поток</Label>
                <Select value={formData.stream} onValueChange={(value) => setFormData(prev => ({ ...prev, stream: value }))}>
                  <SelectTrigger className="bg-white text-black">
                    <SelectValue placeholder="Выберите поток" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-gray-300 shadow-lg z-50">
                    <SelectItem value="2-й поток" className="hover:bg-gray-100">2-й поток</SelectItem>
                    <SelectItem value="1-й поток" className="hover:bg-gray-100">1-й поток</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {!editingParticipant && (
                <div>
                  <Label className="text-white">Пароль *</Label>
                  <Input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                    placeholder="Минимум 6 символов"
                    className="bg-white text-black"
                    required
                    minLength={6}
                  />
                </div>
              )}

              <div className="flex gap-2">
                <Button 
                  type="submit" 
                  className="bg-destructive hover:bg-destructive/90 text-white"
                >
                  {editingParticipant ? 'Сохранить' : 'Создать'}
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
        {participants.map((participant) => (
          <Card key={participant.id} className="p-4">
            <CardContent className="p-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Avatar className="h-12 w-12 bg-destructive/10">
                    <AvatarFallback className="text-destructive font-medium">
                      <User className="w-6 h-6" />
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold text-lg">
                      {formatParticipantName(participant)}
                    </h3>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{participant.total_points} баллов</span>
                      <span>•</span>
                      <span>{participant.email}</span>
                      {participant.height_cm && participant.weight_kg && (
                        <>
                          <span>•</span>
                          <span>{participant.height_cm}см, {participant.weight_kg}кг</span>
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline">{participant.stream}</Badge>
                      {getStatusBadge(participant.status)}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleEdit(participant)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {participants.length === 0 && (
        <Card className="p-8">
          <div className="text-center text-muted-foreground">
            <Users className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-semibold mb-2">Нет участников</h3>
            <p className="text-sm">Добавьте первого участника, чтобы начать</p>
          </div>
        </Card>
      )}
    </div>
  );
};