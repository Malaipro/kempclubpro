import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Loader2, ArrowRight } from 'lucide-react';
import {
  STATUS_TRANSITIONS,
  PARTICIPANT_STATUS_META,
  getParticipantStatusLabel,
  type ParticipantStatus,
  type StatusTransition,
} from '@/constants/participantStatus';

interface Props {
  userId: string;
  currentStatus: string | null;
  currentStreamId: string | null;
  onChanged: () => void;
}

interface StreamOption { id: string; name: string; }

export const QuickStatusActions: React.FC<Props> = ({
  userId, currentStatus, currentStreamId, onChanged,
}) => {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<StatusTransition | null>(null);
  const [streams, setStreams] = useState<StreamOption[]>([]);
  const [pickedStream, setPickedStream] = useState<string>('');

  const transitions = currentStatus
    ? STATUS_TRANSITIONS[currentStatus as ParticipantStatus] || []
    : [];

  useEffect(() => {
    if (!pending?.requiresStream) return;
    supabase
      .from('streams')
      .select('id, name')
      .order('created_at', { ascending: false })
      .then(({ data }) => setStreams(data || []));
  }, [pending]);

  const apply = async (transition: StatusTransition, streamId: string | null) => {
    setBusy(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const actor = auth.user?.id ?? null;

      const profilePatch: Record<string, unknown> = { participant_status: transition.to };
      if (transition.requiresStream && streamId) profilePatch.current_stream_id = streamId;

      const { error: upErr } = await supabase
        .from('profiles')
        .update(profilePatch)
        .eq('user_id', userId);
      if (upErr) throw upErr;

      const { error: histErr } = await supabase
        .from('participant_status_history')
        .insert([{
          profile_user_id: userId,
          old_status: (currentStatus as ParticipantStatus) || null,
          new_status: transition.to,
          stream_id: streamId ?? currentStreamId ?? null,
          changed_by: actor,
        }]);
      if (histErr) throw histErr;

      toast({ title: 'Статус обновлён', description: `→ ${getParticipantStatusLabel(transition.to)}` });
      setPending(null);
      setPickedStream('');
      onChanged();
    } catch (e: any) {
      toast({ title: 'Ошибка', description: e?.message || 'Не удалось изменить статус', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const currentMeta = currentStatus ? PARTICIPANT_STATUS_META[currentStatus as ParticipantStatus] : null;

  const handleClick = (t: StatusTransition) => {
    if (t.requiresStream) setPending(t);
    else apply(t, null);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            Быстрые действия
            {currentMeta && (
              <Badge className={currentMeta.badgeClass}>{currentMeta.shortLabel}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {transitions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Для текущего статуса нет быстрых переходов.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {transitions.map((t) => (
                <Button
                  key={t.to}
                  variant="outline"
                  size="sm"
                  disabled={busy}
                  onClick={() => handleClick(t)}
                >
                  <ArrowRight className="w-4 h-4 mr-1" />
                  {t.label}
                </Button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!pending} onOpenChange={(o) => { if (!o) { setPending(null); setPickedStream(''); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{pending?.label}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-sm font-medium">Поток</label>
            <Select value={pickedStream} onValueChange={setPickedStream}>
              <SelectTrigger><SelectValue placeholder="Выберите поток" /></SelectTrigger>
              <SelectContent>
                {streams.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPending(null)} disabled={busy}>Отмена</Button>
            <Button
              disabled={busy || !pickedStream}
              onClick={() => pending && apply(pending, pickedStream)}
            >
              {busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Применить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
