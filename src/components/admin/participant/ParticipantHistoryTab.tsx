import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { History, Loader2, ArrowRightLeft, StickyNote, FileText, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { getParticipantStatusLabel } from '@/constants/participantStatus';

interface Props { userId: string; }

interface TimelineEvent {
  event_type: string;
  event_time: string;
  actor_id: string | null;
  payload: any;
}

const typeMeta: Record<string, { icon: React.ComponentType<any>; label: string; badge: string }> = {
  status_change: { icon: ArrowRightLeft, label: 'Смена статуса', badge: 'bg-primary text-primary-foreground' },
  note: { icon: StickyNote, label: 'Заметка', badge: 'bg-accent text-accent-foreground' },
  audit: { icon: FileText, label: 'Аудит', badge: 'bg-muted text-muted-foreground' },
};

export const ParticipantHistoryTab: React.FC<Props> = ({ userId }) => {
  const { toast } = useToast();
  const [items, setItems] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_participant_timeline', { _user_id: userId });
      if (error) throw error;
      setItems((data as any as TimelineEvent[]) || []);
    } catch (e: any) {
      toast({ title: 'Ошибка', description: e?.message || 'Не удалось загрузить историю', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [userId, toast]);

  useEffect(() => { load(); }, [load]);

  const renderSummary = (ev: TimelineEvent) => {
    const p = ev.payload || {};
    if (ev.event_type === 'status_change') {
      return `${getParticipantStatusLabel(p.old_status)} → ${getParticipantStatusLabel(p.new_status)}`;
    }
    if (ev.event_type === 'note') {
      const txt = String(p.note || '');
      return txt.length > 140 ? txt.slice(0, 140) + '…' : txt;
    }
    if (ev.event_type === 'audit') {
      return `${p.action || 'action'}${p.table_name ? ` · ${p.table_name}` : ''}`;
    }
    return '';
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="w-5 h-5 text-primary" />История участника
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-muted-foreground text-center py-6">
            Событий пока нет.
          </p>
        ) : (
          <div className="space-y-2">
            {items.map((ev, i) => {
              const meta = typeMeta[ev.event_type] || typeMeta.audit;
              const Icon = meta.icon;
              return (
                <Collapsible key={i} className="border rounded-lg">
                  <CollapsibleTrigger className="w-full flex items-start gap-3 p-3 text-left hover:bg-muted/40">
                    <Icon className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={meta.badge} variant="outline">{meta.label}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(ev.event_time), 'dd.MM.yyyy HH:mm', { locale: ru })}
                        </span>
                      </div>
                      <p className="text-sm mt-1 break-words">{renderSummary(ev)}</p>
                    </div>
                    <ChevronDown className="w-4 h-4 text-muted-foreground mt-1 shrink-0" />
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <pre className="text-xs bg-muted/40 p-3 overflow-x-auto border-t">
{JSON.stringify(ev.payload, null, 2)}
                    </pre>
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
