import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { safeAppReturnLink } from './appLinks';

type Notice = { id: string; title: string; message: string; is_read: boolean; action_url: string | null; created_at: string };

const fmt = (d: string) => new Date(d).toLocaleString('ru-RU', { timeZone: 'Europe/Moscow', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

export const NotificationBell: React.FC = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<Notice[]>([]);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    const { data } = await (supabase as any).from('notifications').select('id,title,message,is_read,action_url,created_at').order('created_at', { ascending: false }).limit(100);
    if (data) setItems(data as Notice[]);
  }, []);

  useEffect(() => {
    void load();
    const t = window.setInterval(load, 60000);
    const onFocus = () => void load();
    window.addEventListener('focus', onFocus);
    return () => { window.clearInterval(t); window.removeEventListener('focus', onFocus); };
  }, [load]);

  const markRead = async (ids: string[]) => {
    if (!ids.length) return;
    setItems(prev => prev.map(n => ids.includes(n.id) ? { ...n, is_read: true } : n));
    await (supabase as any).from('notifications').update({ is_read: true }).in('id', ids);
  };

  const openNotice = async (n: Notice) => {
    await markRead([n.id]);
    setOpen(false);
    let link = '/app';
    try { link = safeAppReturnLink(n.action_url ?? '/app'); } catch { /* fallback to home */ }
    navigate(link);
  };

  const unread = items.filter(n => !n.is_read);
  const read = items.filter(n => n.is_read);
  const row = (n: Notice) => (
    <button key={n.id} type="button" onClick={() => void openNotice(n)} className={`w-full rounded-lg border border-border p-3 text-left ${n.is_read ? 'opacity-70' : 'bg-secondary/40'}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="font-semibold text-foreground">{n.title}</span>
        <span className="shrink-0 text-xs text-muted-foreground">{fmt(n.created_at)}</span>
      </div>
      <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground line-clamp-4">{n.message}</p>
    </button>
  );

  return (
    <>
      <Button variant="ghost" size="icon" aria-label={`Уведомления${unread.length ? `: ${unread.length} новых` : ''}`} className="relative h-12 w-12" onClick={() => setOpen(true)}>
        <Bell className="h-7 w-7" />
        {unread.length > 0 && <span className="absolute -right-0.5 -top-0.5 flex h-6 min-w-6 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-bold text-primary-foreground">{unread.length > 99 ? '99+' : unread.length}</span>}
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="web-app-theme w-full overflow-y-auto bg-background text-foreground sm:max-w-md">
          <SheetHeader><SheetTitle>Уведомления</SheetTitle></SheetHeader>
          <div className="mt-4 space-y-5">
            <section className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">Новые ({unread.length})</h3>
                {unread.length > 0 && <Button size="sm" variant="outline" onClick={() => void markRead(unread.map(n => n.id))}>Прочитать все</Button>}
              </div>
              {unread.length ? unread.map(row) : <p className="text-sm text-muted-foreground">Новых уведомлений нет</p>}
            </section>
            {read.length > 0 && <section className="space-y-2"><h3 className="text-sm font-semibold text-foreground">Прочитанные</h3>{read.map(row)}</section>}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};
