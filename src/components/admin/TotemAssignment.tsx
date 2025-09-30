import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Award, Loader2 } from 'lucide-react';

interface Profile {
  id: string;
  user_id: string;
  display_name: string;
  first_name: string;
  last_name: string;
}

interface Totem {
  id: string;
  name: string;
  description: string;
  discipline: string;
  totem_type: string;
}

export const TotemAssignment: React.FC = () => {
  const { toast } = useToast();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [totems, setTotems] = useState<Totem[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedTotemId, setSelectedTotemId] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Загружаем профили
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, user_id, display_name, first_name, last_name')
        .order('display_name');

      if (profilesError) throw profilesError;
      setProfiles(profilesData || []);

      // Загружаем тотемы
      const { data: totemsData, error: totemsError } = await supabase
        .from('totems')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (totemsError) throw totemsError;
      setTotems(totemsData || []);

    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось загрузить данные',
        variant: 'destructive',
      });
    } finally {
      setLoadingData(false);
    }
  };

  const handleAssignTotem = async () => {
    if (!selectedUserId || !selectedTotemId) {
      toast({
        title: 'Ошибка',
        description: 'Выберите участника и тотем',
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
        .from('user_totems')
        .insert([{
          user_id: selectedUserId,
          totem_id: selectedTotemId,
          assigned_by: user.id,
          notes: notes || null,
          is_manual: true,
        }]);

      if (error) {
        if (error.code === '23505') {
          throw new Error('Этот тотем уже присвоен данному участнику');
        }
        throw error;
      }

      toast({
        title: 'Успешно',
        description: 'Тотем успешно присвоен',
      });

      // Сброс формы
      setSelectedUserId('');
      setSelectedTotemId('');
      setNotes('');

    } catch (error: any) {
      console.error('Error assigning totem:', error);
      toast({
        title: 'Ошибка',
        description: error.message || 'Не удалось присвоить тотем',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
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
          <Award className="h-5 w-5 text-kamp-accent" />
          Ручное присвоение тотема
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
          <Label>Тотем</Label>
          <Select value={selectedTotemId} onValueChange={setSelectedTotemId}>
            <SelectTrigger>
              <SelectValue placeholder="Выберите тотем" />
            </SelectTrigger>
            <SelectContent>
              {totems.map((totem) => (
                <SelectItem key={totem.id} value={totem.id}>
                  {totem.name} ({totem.discipline})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Примечание (необязательно)</Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Укажите причину присвоения..."
            rows={3}
          />
        </div>

        <Button
          onClick={handleAssignTotem}
          disabled={loading || !selectedUserId || !selectedTotemId}
          className="w-full bg-kamp-accent hover:bg-red-600 text-white font-bold"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Присваиваю...
            </>
          ) : (
            'Присвоить тотем'
          )}
        </Button>
      </CardContent>
    </Card>
  );
};
