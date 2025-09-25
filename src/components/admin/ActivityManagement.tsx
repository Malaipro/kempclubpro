import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Plus, User, Target, BookOpen, Zap } from 'lucide-react';
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
  const [trainers, setTrainers] = useState<any[]>([]);
  const [multiplier, setMultiplier] = useState('1.0');
  
  const { toast } = useToast();

  useEffect(() => {
    fetchParticipants();
    fetchTrainers();
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

  const fetchTrainers = async () => {
    try {
      const { data, error } = await supabase
        .from('trainers')
        .select('id, name')
        .eq('is_active', true)
        .order('sort_order');

      if (error) throw error;
      setTrainers(data || []);
    } catch (error) {
      console.error('Error fetching trainers:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось загрузить тренеров',
        variant: 'destructive',
      });
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
          multiplier: parseFloat(multiplier),
          session_date: date?.toISOString() || new Date().toISOString(),
          trainer_id: trainer || null,
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
      setMultiplier('1.0');
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
    <div className="bg-gray-900 p-6 rounded-lg">
      <div className="flex items-center gap-2 mb-6">
        <Plus className="w-5 h-5 text-destructive" />
        <h2 className="text-xl font-semibold text-destructive">Добавить активность участнику</h2>
      </div>
      <p className="text-gray-400 mb-6">Добавьте активность любому участнику текущего потока</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Participant Selection */}
        <Select value={selectedParticipant} onValueChange={setSelectedParticipant} required>
          <SelectTrigger className="bg-white text-black">
            <SelectValue placeholder="Выберите участника" />
          </SelectTrigger>
          <SelectContent className="bg-white">
            {participants.map((participant) => (
              <SelectItem key={participant.user_id} value={participant.user_id}>
                {formatParticipantName(participant)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Activity Type */}
        <Select value={activityType} onValueChange={setActivityType} required>
          <SelectTrigger className="bg-white text-black">
            <SelectValue placeholder="Выберите тип награды" />
          </SelectTrigger>
          <SelectContent className="bg-white">
            <SelectItem value="physical">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-red-500" />
                <span>Закал (физика)</span>
              </div>
            </SelectItem>
            <SelectItem value="theory">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-blue-500" />
                <span>Грань (теория)</span>
              </div>
            </SelectItem>
            <SelectItem value="challenge">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-orange-500" />
                <span>Шрам (испытания)</span>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>

        {/* Points and Multiplier Row */}
        <div className="grid grid-cols-2 gap-4">
          <Input
            type="number"
            min="1"
            value={points}
            onChange={(e) => setPoints(e.target.value)}
            placeholder="Баллы"
            className="bg-white text-black"
            required
          />
          
          <Select value={multiplier} onValueChange={setMultiplier}>
            <SelectTrigger className="bg-white text-black">
              <SelectValue placeholder="Коэффициент" />
            </SelectTrigger>
            <SelectContent className="bg-white">
              <SelectItem value="1.0">x1.0 (обычно)</SelectItem>
              <SelectItem value="1.5">x1.5 (за сверхусилие)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Date Selection */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="w-full justify-start text-left font-normal bg-white text-black hover:bg-gray-50"
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {date ? format(date, "dd.MM.yyyy") : "25.09.2025"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 bg-white" align="start">
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              initialFocus
              className="bg-white"
            />
          </PopoverContent>
        </Popover>

        {/* Trainer */}
        <Select value={trainer} onValueChange={setTrainer}>
          <SelectTrigger className="bg-white text-black">
            <SelectValue placeholder="Выберите тренера или куратора" />
          </SelectTrigger>
          <SelectContent className="bg-white">
            {trainers.map((trainerItem) => (
              <SelectItem key={trainerItem.id} value={trainerItem.id}>
                {trainerItem.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Notes */}
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Дополнительная информация об активности"
          rows={3}
          className="bg-white text-black"
        />

        {/* Submit Button */}
        <Button 
          type="submit" 
          className="w-full bg-destructive hover:bg-destructive/90 text-white"
          disabled={loading}
        >
          Добавить активность
        </Button>
      </form>
    </div>
  );
};