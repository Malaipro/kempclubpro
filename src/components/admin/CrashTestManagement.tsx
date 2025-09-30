import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { CalendarIcon, Zap, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface Profile {
  user_id: string;
  display_name: string;
  first_name: string;
  last_name: string;
}

export const CrashTestManagement: React.FC = () => {
  const { toast } = useToast();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [testType, setTestType] = useState<string>('bjj');
  const [testDate, setTestDate] = useState<Date>(new Date());
  const [passed, setPassed] = useState<boolean>(false);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingProfiles, setLoadingProfiles] = useState(true);

  useEffect(() => {
    loadProfiles();
  }, []);

  const loadProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, display_name, first_name, last_name')
        .order('display_name');

      if (error) throw error;
      setProfiles(data || []);
    } catch (error) {
      console.error('Error loading profiles:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось загрузить участников',
        variant: 'destructive',
      });
    } finally {
      setLoadingProfiles(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedUserId) {
      toast({
        title: 'Ошибка',
        description: 'Выберите участника',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Пользователь не авторизован');
      }

      const { error } = await supabase
        .from('crash_tests')
        .insert([{
          user_id: selectedUserId,
          test_type: testType,
          test_date: testDate.toISOString(),
          passed,
          points_earned: passed ? 6 : 0,
          verified: true,
          verified_by: user.id,
          notes: notes || null,
        }]);

      if (error) throw error;

      toast({
        title: 'Успешно',
        description: 'Краштест добавлен',
      });

      // Сброс формы
      setSelectedUserId('');
      setTestType('bjj');
      setTestDate(new Date());
      setPassed(false);
      setNotes('');

    } catch (error: any) {
      console.error('Error adding crash test:', error);
      toast({
        title: 'Ошибка',
        description: error.message || 'Не удалось добавить краштест',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (loadingProfiles) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-kamp-accent" />
          Добавить краштест
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>Участник</Label>
          <Select value={selectedUserId} onValueChange={setSelectedUserId}>
            <SelectTrigger>
              <SelectValue placeholder="Выберите участника" />
            </SelectTrigger>
            <SelectContent>
              {profiles.map((profile) => (
                <SelectItem key={profile.user_id} value={profile.user_id}>
                  {profile.display_name || `${profile.first_name} ${profile.last_name}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Тип теста</Label>
          <Select value={testType} onValueChange={setTestType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="bjj">БЖЖ</SelectItem>
              <SelectItem value="kickboxing">Кикбоксинг</SelectItem>
              <SelectItem value="ofp">ОФП (финальное испытание)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Дата теста</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start text-left font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(testDate, "dd MMMM yyyy", { locale: ru })}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-white border border-gray-300 shadow-lg z-[9999]" align="start">
              <Calendar
                mode="single"
                selected={testDate}
                onSelect={(date) => date && setTestDate(date)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        <div>
          <Label>Результат</Label>
          <Select value={passed ? 'passed' : 'failed'} onValueChange={(val) => setPassed(val === 'passed')}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="passed">Пройден</SelectItem>
              <SelectItem value="failed">Не пройден</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Примечание</Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Дополнительная информация..."
            rows={3}
          />
        </div>

        <Button
          onClick={handleSubmit}
          disabled={loading || !selectedUserId}
          className="w-full bg-kamp-accent hover:bg-red-600 text-white font-bold"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Добавляю...
            </>
          ) : (
            'Добавить краштест'
          )}
        </Button>
      </CardContent>
    </Card>
  );
};
