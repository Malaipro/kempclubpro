import React, { useCallback, useEffect, useState } from 'react';
import { Flame } from 'lucide-react';
import { useAppApi } from '@/components/app-shared/apiAdapter';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';

interface AsceticResponse {
  found?: boolean;
  has_ascetic: boolean;
  id?: string;
  text?: string;
  streak?: number;
  checked_in_today?: boolean;
  error?: string;
}

export const WebAsceticsView: React.FC = () => {
  const { callApi } = useAppApi();
  const [data, setData] = useState<AsceticResponse | null>(null);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const response = await callApi<AsceticResponse>('get_ascetics');
      if (response.found === false) throw new Error(response.error ?? 'Аскеза недоступна');
      setData(response);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Не удалось загрузить аскезу');
    }
  }, [callApi]);

  useEffect(() => { void load(); }, [load]);

  const take = async () => {
    if (!text.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const response = await callApi<AsceticResponse & { ok?: boolean }>('take_ascetic', { text: text.trim() });
      if (response.ok === false) throw new Error(response.error ?? 'Не удалось сохранить аскезу');
      setData({ ...response, has_ascetic: true });
      setText('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Не удалось сохранить аскезу');
    } finally {
      setBusy(false);
    }
  };

  const checkIn = async () => {
    if (!data?.id) return;
    setBusy(true);
    setError(null);
    try {
      const response = await callApi<{ ok?: boolean; checked_in: boolean; already_checked: boolean; streak: number; error?: string }>('checkin_ascetic', { ascetic_id: data.id });
      if (response.ok === false) throw new Error(response.error ?? 'Не удалось отметить день');
      setData((current) => current ? { ...current, checked_in_today: response.checked_in || response.already_checked, streak: response.streak } : current);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Не удалось отметить день');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="bg-kamp-primary px-4 pb-6 pt-8 text-center text-primary-foreground">
        <Flame className="mx-auto mb-2 h-6 w-6" />
        <h1 className="text-xl font-bold text-primary-foreground">Аскезы</h1>
        <p className="text-sm text-primary-foreground/75">Держи слово каждый день</p>
      </header>
      <div className="px-4 pt-4">
        {error && <p className="mb-3 text-center text-sm text-destructive">{error}</p>}
        {!data && !error && <p className="pt-10 text-center text-sm text-muted-foreground">Загрузка аскезы...</p>}
        {data && !data.has_ascetic && (
          <Card>
            <CardContent className="space-y-3 px-4 py-4">
              <p className="text-sm font-semibold">Напиши свою аскезу</p>
              <Textarea value={text} onChange={(event) => setText(event.target.value)} rows={4} placeholder="Например: холодный душ каждое утро" disabled={busy} />
              <Button className="w-full" onClick={() => void take()} disabled={!text.trim() || busy}>{busy ? 'Сохраняем...' : 'Взять аскезу'}</Button>
            </CardContent>
          </Card>
        )}
        {data?.has_ascetic && (
          <Card>
            <CardContent className="space-y-4 px-4 py-4">
              <p className="whitespace-pre-wrap text-sm">{data.text}</p>
              <div className="flex items-center gap-2 text-sm"><Flame className="h-4 w-4 text-primary" /><strong>{data.streak ?? 0}</strong><span className="text-muted-foreground">дней подряд</span></div>
              <Button className="w-full" variant={data.checked_in_today ? 'secondary' : 'default'} disabled={busy || data.checked_in_today} onClick={() => void checkIn()}>
                {data.checked_in_today ? 'Отмечено сегодня' : busy ? 'Отмечаем...' : 'День +'}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};