import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  History, Loader2, ArrowRightLeft, StickyNote, FileText, ChevronDown,
  Send, Clock,
} from 'lucide-react';
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
  application: { icon: Send, label: 'Заявка с сайта', badge: 'bg-blue-500/20 text-blue-400' },
  current_status: { icon: Clock, label: 'Текущий статус', badge: 'bg-muted text-muted-foreground' },
  audit: { icon: FileText, label: 'Аудит', badge: 'bg-muted text-muted-foreground' },
};

function formatEventDate(iso: string) {
  return format(new Date(iso), 'dd MMM yyyy', { locale: ru });
}

export const ParticipantHistoryTab: React.FC<Props> = ({ userId }) => {
  const { toast } = useToast();
  const [items, setItems] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [actorNames, setActorNames] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_participant_timeline', { _user_id: userId });
      if (error) throw error;
      const raw = (data as any as TimelineEvent[]) || [];
      // Audit-события — технический шум, не показываем их в операторской ленте
      const filtered = raw.filter((ev) => ev.event_type !== 'audit');
      setItems(filtered);

      const actorIds = Array.from(new Set(filtered.map((ev) => ev.actor_id).filter(Boolean)));
      if (actorIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, display_name')
          .in('id', actorIds as string[]);
        const map: Record<string, string> = {};
        profiles?.forEach((p: any) => {
          map[p.id] = p.display_name || p.full_name || 'Автор неизвестен';
        });
        setActorNames(map);
      }
    } catch (e: any) {
      toast({ title: 'Ошибка', description: e?.message || 'Не удалось загрузить историю', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [userId, toast]);

  useEffect(() => { load(); }, [load]);

  const renderedItems = useMemo(() => {
    return items.map((ev, i) => {
      const meta = typeMeta[ev.event_type] || typeMeta.audit;
      const Icon = meta.icon;
      const dateStr = formatEventDate(ev.event_time);

      let title = meta.label;
      let details: React.ReactNode = null;

      if (ev.event_type === 'status_change') {
        const p = ev.payload || {};
        const oldLabel = getParticipantStatusLabel(p.old_status);
        const newLabel = getParticipantStatusLabel(p.new_status);
        title = 'Статус изменён';
        details = (
          <span className="font-medium">
            {oldLabel} → {newLabel}
          </span>
        );
      } else if (ev.event_type === 'note') {
        const p = ev.payload || {};
        const author = actorNames[ev.actor_id || ''] || p.author_name || 'Автор неизвестен';
        title = 'Заметка';
        details = (
          <div className="space-y-1">
            <p className="text-sm whitespace-pre-wrap">{p.note || ''}</p>
            <p className="text-xs text-muted-foreground">Автор: {author}</p>
          </div>
        );
      } else if (ev.event_type === 'application') {
        const p = ev.payload || {};
        title = 'Заявка с сайта';
        details = (
          <div className="space-y-1 text-sm">
            {p.phone && <p>Телефон: {p.phone}</p>}
            {p.created_at && (
              <p>Дата заявки: {formatEventDate(p.created_at)}</p>
            )}
            {p.referral_code && <p>Реферал: {p.referral_code}</p>}
            {p.status && <p>Статус заявки: {p.status}</p>}
          </div>
        );
      } else if (ev.event_type === 'current_status') {
        const p = ev.payload || {};
        title = 'Текущий статус';
        details = <span className="font-medium">{getParticipantStatusLabel(p.status)}</span>;
      } else {
        details = <pre className="text-xs overflow-x-auto">{JSON.stringify(ev.payload, null, 2)}</pre>;
      }

      return { ev, meta, Icon, title, details, dateStr, key: i };
    });
  }, [items, actorNames]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
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
            {renderedItems.map(({ ev, meta, Icon, title, details, dateStr, key }) => (
              <Collapsible key={key} className="border rounded-lg">
                <CollapsibleTrigger className="w-full flex items-start gap-3 p-3 text-left hover:bg-muted/40">
                  <Icon className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={meta.badge} variant="outline">{title}</Badge>
                      <span className="text-xs text-muted-foreground">{dateStr}</span>
                    </div>
                    <div className="text-sm mt-1 break-words">{details}</div>
                  </div>
                  <ChevronDown className="w-4 h-4 text-muted-foreground mt-1 shrink-0" />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <pre className="text-xs bg-muted/40 p-3 overflow-x-auto border-t">
                    {JSON.stringify(ev.payload, null, 2)}
                  </pre>
                </CollapsibleContent>
              </Collapsible>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
