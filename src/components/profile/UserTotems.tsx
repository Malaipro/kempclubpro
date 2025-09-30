import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Award, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface UserTotem {
  id: string;
  assigned_at: string;
  notes: string | null;
  is_manual: boolean;
  totems: {
    id: string;
    name: string;
    description: string;
    discipline: string;
    totem_type: string;
    icon_name: string | null;
    icon_color: string | null;
  };
}

interface Props {
  userId?: string;
}

export const UserTotems: React.FC<Props> = ({ userId }) => {
  const { toast } = useToast();
  const [totems, setTotems] = useState<UserTotem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTotems();
  }, [userId]);

  const loadTotems = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const targetUserId = userId || user?.id;

      if (!targetUserId) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('user_totems')
        .select(`
          id,
          assigned_at,
          notes,
          is_manual,
          totems (
            id,
            name,
            description,
            discipline,
            totem_type,
            icon_name,
            icon_color
          )
        `)
        .eq('user_id', targetUserId)
        .order('assigned_at', { ascending: false });

      if (error) throw error;
      setTotems(data || []);

    } catch (error) {
      console.error('Error loading totems:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось загрузить тотемы',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
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

  if (totems.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-kamp-accent" />
            Тотемы
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            <Award className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>У вас пока нет присвоенных тотемов</p>
            <p className="text-sm mt-2">Продолжайте тренироваться для получения тотемов</p>
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
          Тотемы ({totems.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4">
          {totems.map((userTotem) => (
            <div
              key={userTotem.id}
              className="border rounded-lg p-4 hover:border-kamp-accent transition-colors"
              style={{
                borderColor: userTotem.totems.icon_color || '#e60000',
              }}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-lg">{userTotem.totems.name}</h3>
                    {userTotem.is_manual && (
                      <Badge variant="outline" className="text-xs">
                        Присвоен вручную
                      </Badge>
                    )}
                  </div>
                  
                  <p className="text-sm text-muted-foreground mb-2">
                    {userTotem.totems.description}
                  </p>

                  <div className="flex flex-wrap gap-2 mb-2">
                    <Badge variant="secondary" className="text-xs">
                      {userTotem.totems.discipline}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {userTotem.totems.totem_type}
                    </Badge>
                  </div>

                  {userTotem.notes && (
                    <p className="text-sm text-muted-foreground italic mt-2">
                      Примечание: {userTotem.notes}
                    </p>
                  )}

                  <p className="text-xs text-muted-foreground mt-2">
                    Получен: {format(new Date(userTotem.assigned_at), 'dd MMMM yyyy', { locale: ru })}
                  </p>
                </div>

                <Award
                  className="h-12 w-12 flex-shrink-0"
                  style={{ color: userTotem.totems.icon_color || '#e60000' }}
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
