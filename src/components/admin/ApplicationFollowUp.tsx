import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader2, BellRing, MessageSquarePlus, Check, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface Note {
  id: string;
  note: string;
  created_at: string;
  author_id: string | null;
}

interface Reminder {
  id: string;
  remind_at: string;
  comment: string | null;
  sent: boolean;
  done: boolean;
}

const toLocalInput = (d: Date) => {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export const ApplicationFollowUp: React.FC<{ submissionId: string }> = ({ submissionId }) => {
  const qc = useQueryClient();
  const [noteText, setNoteText] = useState('');
  const [remindAt, setRemindAt] = useState('');
  const [remindComment, setRemindComment] = useState('');

  const { data: notes = [], isLoading: notesLoading } = useQuery({
    queryKey: ['application_notes', submissionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('application_notes')
        .select('id,note,created_at,author_id')
        .eq('submission_id', submissionId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as Note[];
    },
  });

  const { data: reminders = [] } = useQuery({
    queryKey: ['application_reminders', submissionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('application_reminders')
        .select('id,remind_at,comment,sent,done')
        .eq('submission_id', submissionId)
        .order('remind_at', { ascending: true });
      if (error) throw error;
      return (data || []) as Reminder[];
    },
  });

  const addNote = useMutation({
    mutationFn: async (text: string) => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) throw new Error('Не авторизован');
      const { error } = await supabase
        .from('application_notes')
        .insert({ submission_id: submissionId, note: text, author_id: uid });
      if (error) throw error;
    },
    onSuccess: () => {
      setNoteText('');
      toast.success('Заметка добавлена');
      qc.invalidateQueries({ queryKey: ['application_notes', submissionId] });
    },
    onError: (e: any) => toast.error(e?.message || 'Не удалось сохранить заметку'),
  });

  const deleteNote = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('application_notes').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['application_notes', submissionId] }),
    onError: (e: any) => toast.error(e?.message || 'Не удалось удалить заметку'),
  });

  const addReminder = useMutation({
    mutationFn: async () => {
      if (!remindAt) throw new Error('Укажите дату и время');
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) throw new Error('Не авторизован');
      const { error } = await supabase.from('application_reminders').insert({
        submission_id: submissionId,
        author_id: uid,
        remind_at: new Date(remindAt).toISOString(),
        comment: remindComment.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setRemindAt('');
      setRemindComment('');
      toast.success('Напоминание создано — придёт в Telegram');
      qc.invalidateQueries({ queryKey: ['application_reminders', submissionId] });
      qc.invalidateQueries({ queryKey: ['reminders_all'] });
    },
    onError: (e: any) => toast.error(e?.message || 'Не удалось создать напоминание'),
  });

  const updateReminder = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Reminder> }) => {
      const { error } = await supabase.from('application_reminders').update(patch).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['application_reminders', submissionId] });
      qc.invalidateQueries({ queryKey: ['reminders_all'] });
    },
    onError: (e: any) => toast.error(e?.message || 'Не удалось обновить напоминание'),
  });

  const deleteReminder = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('application_reminders').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['application_reminders', submissionId] });
      qc.invalidateQueries({ queryKey: ['reminders_all'] });
    },
  });

  return (
    <div className="mt-3 pt-3 border-t border-border space-y-4">
      {/* Комментарий */}
      <div>
        <div className="flex gap-2">
          <Input
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Комментарий по участнику…"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && noteText.trim()) addNote.mutate(noteText.trim());
            }}
          />
          <Button
            size="sm"
            variant="outline"
            disabled={!noteText.trim() || addNote.isPending}
            onClick={() => addNote.mutate(noteText.trim())}
          >
            <MessageSquarePlus className="w-4 h-4 mr-1" />Добавить
          </Button>
        </div>
        {notesLoading ? (
          <div className="py-2"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>
        ) : notes.length > 0 && (
          <div className="mt-2 space-y-1">
            {notes.map((n) => (
              <div key={n.id} className="flex items-start justify-between gap-2 text-sm bg-muted/30 rounded px-2 py-1">
                <div className="min-w-0">
                  <span className="whitespace-pre-wrap break-words">{n.note}</span>
                  <span className="text-xs text-muted-foreground ml-2">
                    {format(new Date(n.created_at), 'd MMM, HH:mm', { locale: ru })}
                  </span>
                </div>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-destructive shrink-0"
                  onClick={() => deleteNote.mutate(n.id)}
                  aria-label="Удалить заметку"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Напоминание */}
      <div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            type="datetime-local"
            value={remindAt}
            min={toLocalInput(new Date())}
            onChange={(e) => setRemindAt(e.target.value)}
            className="sm:w-56"
          />
          <Input
            value={remindComment}
            onChange={(e) => setRemindComment(e.target.value)}
            placeholder="Текст напоминания (например: перезвонить)"
          />
          <Button size="sm" disabled={!remindAt || addReminder.isPending} onClick={() => addReminder.mutate()}>
            <BellRing className="w-4 h-4 mr-1" />Напомнить
          </Button>
        </div>
        {reminders.length > 0 && (
          <div className="mt-2 space-y-1">
            {reminders.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-2 text-sm bg-muted/30 rounded px-2 py-1">
                <div className="flex flex-wrap items-center gap-2 min-w-0">
                  <BellRing className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>{format(new Date(r.remind_at), 'd MMM yyyy, HH:mm', { locale: ru })}</span>
                  {r.comment && <span className="text-muted-foreground truncate">· {r.comment}</span>}
                  {r.done ? (
                    <Badge variant="outline" className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30">Выполнено</Badge>
                  ) : r.sent ? (
                    <Badge variant="outline" className="bg-blue-500/15 text-blue-400 border-blue-500/30">Отправлено</Badge>
                  ) : (
                    <Badge variant="outline" className="bg-amber-500/15 text-amber-400 border-amber-500/30">Запланировано</Badge>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {!r.done && (
                    <button
                      type="button"
                      className="text-muted-foreground hover:text-emerald-400"
                      onClick={() => updateReminder.mutate({ id: r.id, patch: { done: true } })}
                      aria-label="Отметить выполненным"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => deleteReminder.mutate(r.id)}
                    aria-label="Удалить напоминание"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
