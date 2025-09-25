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
            <SelectItem value="kickboxing">Кикбоксинг</SelectItem>
            <SelectItem value="bjj">BJJ</SelectItem>
            <SelectItem value="ofp">ОФП</SelectItem>
            <SelectItem value="tactical">Тактическая медицина</SelectItem>
            <SelectItem value="theory">Теория</SelectItem>
            <SelectItem value="challenges">Челленджи</SelectItem>
          </SelectContent>
        </Select>

        {/* Points and Duration Row */}
        <div className="grid grid-cols-2 gap-4">
          <Input
            type="number"
            min="1"
            value={points}
            onChange={(e) => setPoints(e.target.value)}
            placeholder="1"
            className="bg-white text-black"
            required
          />
          
          <Input
            placeholder="Длительность"
            className="bg-white text-black"
          />
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
        <Input
          value={trainer}
          onChange={(e) => setTrainer(e.target.value)}
          placeholder="Имя тренера или куратора"
          className="bg-white text-black"
        />

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