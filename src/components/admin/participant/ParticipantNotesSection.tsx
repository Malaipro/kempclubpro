import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { StickyNote, Loader2, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface Props { userId: string; }

interface Note {
  id: string;
  note: string;
  author_id: string;
  created_at: string;
  authorName?: string;
}

export const ParticipantNotesSection: React.FC<Props> = ({ userId }) => {
  const { toast } = useToast();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [me, setMe] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      setMe(auth.user?.id ?? null);

      const { data, error } = await supabase
        .from('participant_notes')
        .select('id, note, author_id, created_at')
        .eq('profile_user_id', userId)
        .order('created_at', { ascending: false });
      if (error) throw error;

      const list = (data as Note[]) || [];
      const authorIds = Array.from(new Set(list.map((n) => n.author_id))).filter(Boolean);
      let names: Record<string, string> = {};
      if (authorIds.length) {
        const { data: profs } = await supabase
          .from('profiles')
          .select('user_id, display_name, first_name, last_name')
          .in('user_id', authorIds);
        (profs || []).forEach((p: any) => {
          names[p.user_id] =
            p.display_name ||
            [p.last_name, p.first_name].filter(Boolean).join(' ') ||
            'Администратор';
        });
      }
      setNotes(list.map((n) => ({ ...n, authorName: names[n.author_id] || 'Администратор' })));
    } catch (e: any) {
      toast({ title: 'Ошибка', description: e?.message || 'Не удалось загрузить заметки', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [userId, toast]);

  useEffect(() => { load(); }, [load]);

  const add = async () => {
    if (!text.trim()) return;
    setBusy(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const authorId = auth.user?.id;
      if (!authorId) throw new Error('Не авторизован');
      const { error } = await supabase.from('participant_notes').insert([{
        profile_user_id: userId, note: text.trim(), author_id: authorId,
      }]);
      if (error) throw error;
      setText('');
      load();
    } catch (e: any) {
      toast({ title: 'Ошибка', description: e?.message || 'Не удалось сохранить заметку', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    try {
      const { error } = await supabase.from('participant_notes').delete().eq('id', id);
      if (error) throw error;
      setNotes((prev) => prev.filter((n) => n.id !== id));
    } catch (e: any) {
      toast({ title: 'Ошибка', description: e?.message || 'Не удалось удалить заметку', variant: 'destructive' });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <StickyNote className="w-4 h-4 text-primary" />
          Заметки
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Добавить заметку…"
            rows={2}
          />
          <div className="flex justify-end">
            <Button size="sm" onClick={add} disabled={busy || !text.trim()}>
              {busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Добавить
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
        ) : notes.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Заметок пока нет</p>
        ) : (
          <div className="space-y-2">
            {notes.map((n) => (
              <div key={n.id} className="p-3 border rounded-lg bg-muted/30">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm whitespace-pre-wrap flex-1">{n.note}</p>
                  {me === n.author_id && (
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => remove(n.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {n.authorName} · {format(new Date(n.created_at), 'dd.MM.yyyy HH:mm', { locale: ru })}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
