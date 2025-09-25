import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Plus, User } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface Participant {
  id: string;
  user_id: string;
  display_name: string;
  first_name?: string;
  last_name?: string;
}

export const ActivityManagement: React.FC = () => {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedParticipant, setSelectedParticipant] = useState('');
  const [activityType, setActivityType] = useState('');
  const [points, setPoints] = useState('1');
  const [date, setDate] = useState<Date>();
  const [trainer, setTrainer] = useState('');
  const [notes, setNotes] = useState('');
  
  const { toast } = useToast();

  useEffect(() => {
    fetchParticipants();
  }, []);

  const fetchParticipants = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, user_id, display_name, first_name, last_name')
        .order('display_name');

      if (error) throw error;
      setParticipants(data || []);
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
    
    if (!selectedParticipant || !activityType) {
      toast({
        title: 'Ошибка',
        description: 'Выберите участника и тип активности',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('training_sessions')
        .insert([{
          user_id: selectedParticipant,
          session_type: activityType,
          points_earned: parseInt(points),
          session_date: date?.toISOString() || new Date().toISOString(),
          notes: notes || null,
        }]);

      if (error) throw error;

      toast({
        title: 'Активность добавлена',
        description: 'Активность успешно добавлена участнику',
      });

      // Reset form
      setSelectedParticipant('');
      setActivityType('');
      setPoints('1');
      setDate(undefined);
      setTrainer('');
      setNotes('');
    } catch (error) {
      console.error('Error adding activity:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось добавить активность',
        variant: 'destructive',
      });
    }
  };

  const formatParticipantName = (participant: Participant) => {
    if (participant.first_name && participant.last_name) {
      return `${participant.first_name} ${participant.last_name}`;
    }
    return participant.display_name || 'Неизвестный участник';
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-destructive/10 rounded-lg">
          <Plus className="w-6 h-6 text-destructive" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Добавить активность участнику</h1>
          <p className="text-muted-foreground">Добавьте активность любому участнику текущего потока</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Participant Selection */}
            <div className="space-y-2">
              <Label htmlFor="participant">Выберите участника</Label>
              <Select value={selectedParticipant} onValueChange={setSelectedParticipant} required>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите участника" />
                </SelectTrigger>
                <SelectContent>
                  {participants.map((participant) => (
                    <SelectItem key={participant.user_id} value={participant.user_id}>
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        {formatParticipantName(participant)}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Activity Type */}
            <div className="space-y-2">
              <Label htmlFor="activity-type">Выберите тип награды</Label>
              <Select value={activityType} onValueChange={setActivityType} required>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите тип награды" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="kickboxing">Кикбоксинг</SelectItem>
                  <SelectItem value="bjj">BJJ</SelectItem>
                  <SelectItem value="ofp">ОФП</SelectItem>
                  <SelectItem value="tactical">Тактическая медицина</SelectItem>
                  <SelectItem value="theory">Теория</SelectItem>
                  <SelectItem value="challenges">Челленджи</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Points and Duration Row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="points">Очки</Label>
                <Input
                  id="points"
                  type="number"
                  min="1"
                  value={points}
                  onChange={(e) => setPoints(e.target.value)}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label>Длительность</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите длительность" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 минут</SelectItem>
                    <SelectItem value="60">1 час</SelectItem>
                    <SelectItem value="90">1.5 часа</SelectItem>
                    <SelectItem value="120">2 часа</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Date Selection */}
            <div className="space-y-2">
              <Label>Дата</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "dd.MM.yyyy") : "25.09.2025"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Trainer */}
            <div className="space-y-2">
              <Label htmlFor="trainer">Имя тренера или куратора</Label>
              <Input
                id="trainer"
                value={trainer}
                onChange={(e) => setTrainer(e.target.value)}
                placeholder="Имя тренера или куратора"
              />
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Дополнительная информация об активности</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Дополнительная информация об активности"
                rows={3}
              />
            </div>

            {/* Submit Button */}
            <Button 
              type="submit" 
              className="w-full bg-destructive hover:bg-destructive/90 text-white"
              disabled={loading}
            >
              Добавить активность
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};