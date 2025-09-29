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
import { Users, Plus, Edit, Trash2, User, CalendarIcon, CheckCircle, XCircle, ChevronDown, ChevronUp, Target, Zap, Dumbbell, Book, Shield, Award } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
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
  approved?: boolean;
  approved_at?: string | null;
  approved_by?: string | null;
}

interface ParticipantDetails {
  bjj_points: number;
  kickboxing_points: number;
  ofp_points: number;
  theory_points: number;
  tactical_points: number;
  challenges_points: number;
  bjj_zakals: number;
  bjj_scars: number;
  kick_zakals: number;
  kick_scars: number;
  ofp_zakals: number;
  ofp_scars: number;
  theory_grans: number;
  tactical_scars: number;
}

export const EnhancedParticipantManagement: React.FC = () => {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingParticipant, setEditingParticipant] = useState<Participant | null>(null);
  const [expandedParticipants, setExpandedParticipants] = useState<Set<string>>(new Set());
  const [participantDetails, setParticipantDetails] = useState<Map<string, ParticipantDetails>>(new Map());
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
  const { user } = useAuth();

  useEffect(() => {
    fetchParticipants();
  }, []);

  const fetchParticipants = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
.select(`
          id, 
          user_id, 
          display_name, 
          first_name, 
          last_name, 
          email,
          phone,
          telegram,
          total_points, 
          height_cm, 
          weight_kg, 
          date_of_birth,
          approved,
          approved_at,
          approved_by
        `)
        .order('display_name');
      
      if (error) throw error;

      // Transform data to match our interface
      const transformedData = data?.map(item => ({
        ...item,
        total_points: item.total_points || 0,
        stream: '2-й поток',
        status: 'registered' as const
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
            display_name: [formData.first_name, formData.last_name].filter(Boolean).join(' ') || null,
            email: formData.email || null,
            phone: formData.phone || null,
            telegram: formData.telegram || null,
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
              display_name: [formData.first_name, formData.last_name].filter(Boolean).join(' '),
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
      phone: participant.phone || '',
      telegram: participant.telegram || '',
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

  const handleToggleApproval = async (p: Participant) => {
    try {
      const newApproved = !p.approved;
      const { error } = await supabase
        .from('profiles')
        .update({
          approved: newApproved,
          approved_at: newApproved ? new Date().toISOString() : null,
          approved_by: newApproved && user ? user.id : null,
        })
        .eq('id', p.id);

      if (error) throw error;

      toast({
        title: newApproved ? 'Участник утвержден' : 'Утверждение снято',
        description: p.display_name || [p.first_name, p.last_name].filter(Boolean).join(' ') || 'Участник',
      });
      fetchParticipants();
    } catch (err) {
      console.error('Error toggling approval:', err);
      toast({ title: 'Ошибка', description: 'Не удалось обновить статус утверждения', variant: 'destructive' });
    }
  };

  const formatParticipantName = (participant: Participant) => {
    const first = (participant.first_name || '').trim();
    const last = (participant.last_name || '').trim();
    const disp = (participant.display_name || '').trim();
    if (first || last) return `${first} ${last}`.trim();
    if (disp) return disp;
    if (participant.email) return participant.email.split('@')[0];
    return 'Участник';
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

  const fetchParticipantDetails = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('leaderboard')
        .select('bjj_points, kickboxing_points, ofp_points, theory_points, tactical_points, challenges_points')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        const details: ParticipantDetails = {
          bjj_points: data.bjj_points || 0,
          kickboxing_points: data.kickboxing_points || 0,
          ofp_points: data.ofp_points || 0,
          theory_points: data.theory_points || 0,
          tactical_points: data.tactical_points || 0,
          challenges_points: data.challenges_points || 0,
          bjj_zakals: data.bjj_points || 0,
          bjj_scars: Math.floor((data.bjj_points || 0) / 10),
          kick_zakals: data.kickboxing_points || 0,
          kick_scars: Math.floor((data.kickboxing_points || 0) / 10),
          ofp_zakals: data.ofp_points || 0,
          ofp_scars: Math.floor((data.ofp_points || 0) / 10),
          theory_grans: data.theory_points || 0,
          tactical_scars: data.tactical_points || 0,
        };

        setParticipantDetails(prev => new Map(prev).set(userId, details));
      }
    } catch (error) {
      console.error('Error fetching participant details:', error);
    }
  };

  const refreshParticipantData = async (userId?: string) => {
    await fetchParticipants();
    if (userId && expandedParticipants.has(userId)) {
      // Очистить кэш и перезагрузить детали
      setParticipantDetails(prev => {
        const newMap = new Map(prev);
        newMap.delete(userId);
        return newMap;
      });
      await fetchParticipantDetails(userId);
    }
  };

  const toggleExpand = (userId: string) => {
    setExpandedParticipants(prev => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
        fetchParticipantDetails(userId);
      }
      return newSet;
    });
  };

  // Подписка на изменения в leaderboard
  useEffect(() => {
    const channel = supabase
      .channel('leaderboard-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'leaderboard'
        },
        (payload) => {
          console.log('Leaderboard changed:', payload);
          const userId = (payload.new as any)?.user_id || (payload.old as any)?.user_id;
          if (userId) {
            refreshParticipantData(userId);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [expandedParticipants]);

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
                  required
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
        {participants.map((participant) => {
          const fullName = formatParticipantName(participant);
          const isExpanded = expandedParticipants.has(participant.user_id);
          const details = participantDetails.get(participant.user_id);
          
          return (
            <Card key={participant.id} className="p-4">
              <CardContent className="p-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    <Avatar className="h-12 w-12 bg-destructive/10 flex-shrink-0">
                      <AvatarFallback className="text-destructive font-medium">
                        {getInitials(participant)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-lg text-foreground">
                        {fullName}
                      </h3>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                        <span>{participant.total_points} баллов</span>
                        {participant.email && (
                          <>
                            <span>•</span>
                            <span className="truncate">{participant.email}</span>
                          </>
                        )}
                        {participant.height_cm && participant.weight_kg && (
                          <>
                            <span>•</span>
                            <span>{participant.height_cm}см, {participant.weight_kg}кг</span>
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <Badge variant="outline">{participant.stream}</Badge>
                        {participant.approved && (<Badge className="bg-green-100 text-green-800">Утвержден</Badge>)}
                        {getStatusBadge(participant.status)}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => toggleExpand(participant.user_id)}
                      title={isExpanded ? "Скрыть детали" : "Показать детали"}
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleToggleApproval(participant)}
                      title={participant.approved ? "Снять утверждение" : "Утвердить участника"}
                    >
                      {participant.approved ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleEdit(participant)}
                      title="Редактировать"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-destructive hover:text-destructive"
                      title="Удалить"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {isExpanded && details && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                      <Award className="w-4 h-4 text-kamp-accent" />
                      Детализация достижений КЭМП:
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {details.bjj_points > 0 && (
                        <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/30">
                          <div className="flex items-start gap-2">
                            <Target className="w-5 h-5 text-blue-400 mt-0.5" />
                            <div className="flex-1">
                              <p className="font-semibold text-gray-900 mb-1">БЖЖ</p>
                              <div className="space-y-1 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Закалы:</span>
                                  <span className="font-semibold">{details.bjj_zakals}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Шрамы:</span>
                                  <span className="font-semibold text-red-600">{details.bjj_scars}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {details.kickboxing_points > 0 && (
                        <div className="p-3 bg-red-500/10 rounded-lg border border-red-500/30">
                          <div className="flex items-start gap-2">
                            <Zap className="w-5 h-5 text-red-400 mt-0.5" />
                            <div className="flex-1">
                              <p className="font-semibold text-gray-900 mb-1">Кикбоксинг</p>
                              <div className="space-y-1 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Закалы:</span>
                                  <span className="font-semibold">{details.kick_zakals}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Шрамы:</span>
                                  <span className="font-semibold text-red-600">{details.kick_scars}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {details.ofp_points > 0 && (
                        <div className="p-3 bg-green-500/10 rounded-lg border border-green-500/30">
                          <div className="flex items-start gap-2">
                            <Dumbbell className="w-5 h-5 text-green-400 mt-0.5" />
                            <div className="flex-1">
                              <p className="font-semibold text-gray-900 mb-1">ОФП</p>
                              <div className="space-y-1 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Закалы:</span>
                                  <span className="font-semibold">{details.ofp_zakals}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Шрамы:</span>
                                  <span className="font-semibold text-red-600">{details.ofp_scars}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {details.theory_points > 0 && (
                        <div className="p-3 bg-purple-500/10 rounded-lg border border-purple-500/30">
                          <div className="flex items-start gap-2">
                            <Book className="w-5 h-5 text-purple-400 mt-0.5" />
                            <div className="flex-1">
                              <p className="font-semibold text-gray-900 mb-1">Теория</p>
                              <div className="space-y-1 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Грани:</span>
                                  <span className="font-semibold">{details.theory_grans}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {details.tactical_points > 0 && (
                        <div className="p-3 bg-orange-500/10 rounded-lg border border-orange-500/30">
                          <div className="flex items-start gap-2">
                            <Shield className="w-5 h-5 text-orange-400 mt-0.5" />
                            <div className="flex-1">
                              <p className="font-semibold text-gray-900 mb-1">Тактика</p>
                              <div className="space-y-1 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Шрамы:</span>
                                  <span className="font-semibold text-red-600">{details.tactical_scars}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {!details.bjj_points && !details.kickboxing_points && !details.ofp_points && 
                     !details.theory_points && !details.tactical_points && (
                      <div className="text-center py-4 text-gray-400">
                        <Award className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">Активности пока не зафиксированы</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
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