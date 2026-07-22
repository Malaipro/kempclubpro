import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2 } from 'lucide-react';

interface Props {
  userId: string;
  onChanged?: () => void;
}

type CoachingType = 'standard' | 'personal';

export const CoachingTypeToggle: React.FC<Props> = ({ userId, onChanged }) => {
  const { toast } = useToast();
  const [value, setValue] = useState<CoachingType>('standard');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<CoachingType | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('coaching_type')
        .eq('user_id', userId)
        .maybeSingle();
      if (!alive) return;
      setValue(((data as any)?.coaching_type as CoachingType) || 'standard');
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [userId]);

  const update = async (next: CoachingType) => {
    if (next === value) return;
    setSaving(next);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ coaching_type: next } as any)
        .eq('user_id', userId);
      if (error) throw error;
      setValue(next);
      toast({ title: 'Готово', description: `Тип ведения: ${next === 'personal' ? 'Личное' : 'Стандарт'}` });
      onChanged?.();
    } catch (e: any) {
      toast({ title: 'Ошибка', description: e?.message || 'Не удалось обновить', variant: 'destructive' });
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="rounded-lg border p-3 flex items-center gap-3 flex-wrap">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Sparkles className="w-4 h-4 text-amber-500" />
        Тип ведения:
      </div>
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
      ) : (
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={value === 'standard' ? 'default' : 'outline'}
            onClick={() => update('standard')}
            disabled={saving !== null}
          >
            {saving === 'standard' && <Loader2 className="w-3 h-3 animate-spin mr-1" />}
            Стандарт
          </Button>
          <Button
            size="sm"
            variant={value === 'personal' ? 'default' : 'outline'}
            className={value === 'personal' ? 'bg-amber-500 hover:bg-amber-600' : ''}
            onClick={() => update('personal')}
            disabled={saving !== null}
          >
            {saving === 'personal' && <Loader2 className="w-3 h-3 animate-spin mr-1" />}
            Личное ведение
          </Button>
        </div>
      )}
    </div>
  );
};
