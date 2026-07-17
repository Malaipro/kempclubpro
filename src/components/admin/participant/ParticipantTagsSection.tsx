import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Loader2, Tag as TagIcon } from 'lucide-react';

interface Props { userId: string; }

interface Tag { id: string; name: string; color: string | null; }

export const ParticipantTagsSection: React.FC<Props> = ({ userId }) => {
  const { toast } = useToast();
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [assigned, setAssigned] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [tagsRes, mapRes] = await Promise.all([
        supabase.from('participant_tags').select('id, name, color').order('name'),
        supabase.from('profile_tags').select('tag_id').eq('profile_user_id', userId),
      ]);
      if (tagsRes.error) throw tagsRes.error;
      if (mapRes.error) throw mapRes.error;
      setAllTags(tagsRes.data || []);
      setAssigned((mapRes.data || []).map((r: any) => r.tag_id));
    } catch (e: any) {
      toast({ title: 'Ошибка', description: e?.message || 'Не удалось загрузить теги', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [userId, toast]);

  useEffect(() => { load(); }, [load]);

  const toggle = async (tagId: string, checked: boolean) => {
    setBusy(tagId);
    try {
      if (checked) {
        const { data: auth } = await supabase.auth.getUser();
        const { error } = await supabase.from('profile_tags').insert([{
          profile_user_id: userId, tag_id: tagId, created_by: auth.user?.id ?? null,
        }]);
        if (error) throw error;
        setAssigned((prev) => [...prev, tagId]);
      } else {
        const { error } = await supabase
          .from('profile_tags')
          .delete()
          .eq('profile_user_id', userId)
          .eq('tag_id', tagId);
        if (error) throw error;
        setAssigned((prev) => prev.filter((id) => id !== tagId));
      }
    } catch (e: any) {
      toast({ title: 'Ошибка', description: e?.message || 'Не удалось обновить тег', variant: 'destructive' });
    } finally {
      setBusy(null);
    }
  };

  const assignedTags = allTags.filter((t) => assigned.includes(t.id));

  return (
    <div className="flex flex-wrap items-center gap-2">
      <TagIcon className="w-4 h-4 text-muted-foreground" />
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
      ) : assignedTags.length === 0 ? (
        <span className="text-sm text-muted-foreground">Теги не назначены</span>
      ) : (
        assignedTags.map((t) => (
          <Badge
            key={t.id}
            style={t.color ? { backgroundColor: t.color, color: '#fff', borderColor: t.color } : undefined}
            variant="outline"
          >
            {t.name}
          </Badge>
        ))
      )}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-7 px-2">
            <Plus className="w-4 h-4 mr-1" />
            Тег
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 max-h-80 overflow-y-auto">
          {allTags.length === 0 ? (
            <p className="text-sm text-muted-foreground">Нет доступных тегов</p>
          ) : (
            <div className="space-y-2">
              {allTags.map((t) => {
                const isChecked = assigned.includes(t.id);
                return (
                  <label key={t.id} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={isChecked}
                      disabled={busy === t.id}
                      onCheckedChange={(v) => toggle(t.id, !!v)}
                    />
                    <span
                      className="inline-block w-2 h-2 rounded-full"
                      style={{ backgroundColor: t.color || '#94a3b8' }}
                    />
                    <span className="text-sm">{t.name}</span>
                  </label>
                );
              })}
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
};
