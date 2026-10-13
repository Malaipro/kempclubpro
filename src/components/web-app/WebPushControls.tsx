import React, { useEffect, useState } from 'react';
import { Bell, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { usePushSubscription } from '@/hooks/usePushSubscription';

export const WebPushSettingsCard: React.FC = () => {
  const { isSupported, permission, isSubscribed, subscribe, unsubscribe, loading } = usePushSubscription();
  const [error, setError] = useState('');
  const toggle = async (on: boolean) => {
    setError('');
    try { await (on ? subscribe() : unsubscribe()); } catch (e) { setError(e instanceof Error ? e.message : 'Не удалось изменить настройку'); }
  };
  return (
    <Card>
      <CardContent className="space-y-2 p-4">
        <p className="flex items-center gap-2 text-sm font-semibold"><Bell className="h-4 w-4 text-primary" />Уведомления</p>
        {!isSupported ? (
          <p className="text-sm text-muted-foreground">Ваш браузер не поддерживает push-уведомления</p>
        ) : (
          <>
            <label className="flex items-center justify-between gap-3 text-sm">
              <span>Уведомления о тренировках и событиях</span>
              {loading ? <Loader2 className="h-5 w-5 animate-spin text-primary" /> : <Switch checked={isSubscribed} onCheckedChange={(v) => void toggle(v)} />}
            </label>
            {permission === 'denied' && <p className="text-xs text-muted-foreground">Уведомления запрещены в настройках браузера — разрешите их для этого сайта.</p>}
            {error && <p className="text-xs text-destructive">{error}</p>}
          </>
        )}
      </CardContent>
    </Card>
  );
};

const VISIT_KEY = 'kemp_visit_count';
const DISMISS_KEY = 'kemp_push_dismissed';

export const WebPushPrompt: React.FC = () => {
  const { isSupported, permission, subscribe, loading } = usePushSubscription();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const count = Number(localStorage.getItem(VISIT_KEY) || '0') + 1;
    localStorage.setItem(VISIT_KEY, String(count));
    if (count === 2 && isSupported && Notification.permission === 'default' && !localStorage.getItem(DISMISS_KEY)) setOpen(true);
  }, [isSupported]);

  if (!open || permission !== 'default') return null;
  const dismiss = () => { localStorage.setItem(DISMISS_KEY, '1'); setOpen(false); };

  return (
    <div className="fixed inset-0 z-[60] flex items-end bg-background/60" onClick={dismiss}>
      <div role="dialog" aria-labelledby="push-prompt-title" onClick={(e) => e.stopPropagation()}
        className="app-push-sheet bg-card w-full mx-auto max-w-lg rounded-t-2xl border border-border p-6 pb-8 space-y-3 animate-in slide-in-from-bottom duration-300">
        <span aria-hidden="true" className="mx-auto mb-2 block h-1 w-10 rounded-full bg-muted-foreground/40" />
        <Bell className="h-8 w-8 text-primary" />
        <h2 id="push-prompt-title" className="text-lg font-bold uppercase">Не пропусти тренировку</h2>
        <p className="text-sm text-muted-foreground">Включи уведомления, чтобы получать напоминания о тренировках и событиях клуба</p>
        <Button className="w-full" disabled={loading} onClick={async () => { try { await subscribe(); } catch { /* ignore */ } setOpen(false); }}>
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}Включить
        </Button>
        <Button variant="ghost" className="w-full text-muted-foreground" onClick={dismiss}>Не сейчас</Button>
      </div>
    </div>
  );
};
