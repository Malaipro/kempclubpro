import { useState } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { pushPayload, pushRecipients, type PushAudience, type PushRecipient } from './broadcastPush';

const people: PushRecipient[] = [
  { user_id: 'r1', name: 'Алексей (резидент)', status: 'club_resident', subscribed: true },
  { user_id: 'r2', name: 'Мария (резидент)', status: 'club_resident', subscribed: true },
  { user_id: 'r3', name: 'Олег (резидент)', status: 'club_resident', subscribed: false },
  { user_id: 'i1', name: 'Игорь (интенсив)', status: 'intensive_active', subscribed: true },
  { user_id: 'a1', name: 'Анна (выпускник)', status: 'alumni', subscribed: false },
];
const event = { id: '00000000-0000-4000-8000-000000000001', title: 'Открытая тренировка БЖЖ', when: 'Сб, 28 ноября · 11:00 МСК', free: true };
const labels: Record<PushAudience, string> = { resident: 'Резиденты', intensive: 'Интенсив', alumni: 'Выпускники', all: 'Все' };

export default function BroadcastPushPreview() {
  const [audience, setAudience] = useState<PushAudience>('resident');
  const [text, setText] = useState('Приглашаем на открытую тренировку БЖЖ в субботу!');
  const [withBook, setWithBook] = useState(true);
  const [step, setStep] = useState<'form' | 'push' | 'card' | 'booked'>('form');
  const { inScope, subscribed } = pushRecipients(people, audience);
  const payload = pushPayload(text, withBook ? [{ type: 'book_event', target_id: event.id }] : []);

  return <main className="web-app-theme min-h-screen bg-background text-foreground">
    <div className="mx-auto max-w-lg space-y-4 p-4">
      <p className="text-xs text-muted-foreground">Preview · тестовые данные · ничего не отправляется</p>
      {step === 'form' && <Card><CardContent className="space-y-4 p-4">
        <Tabs value={audience} onValueChange={v => setAudience(v as PushAudience)}><TabsList className="grid w-full grid-cols-4">
          {(Object.keys(labels) as PushAudience[]).map(a => <TabsTrigger key={a} value={a} className="text-xs">{labels[a]}</TabsTrigger>)}
        </TabsList></Tabs>
        <Textarea aria-label="Текст рассылки" value={text} onChange={e => setText(e.target.value)} />
        <div className="flex items-center gap-2"><Switch id="book" checked={withBook} onCheckedChange={setWithBook} /><Label htmlFor="book">Кнопка «Записаться»: {event.title}</Label></div>
        <div className="rounded-md border border-border p-3 text-sm">
          <p className="font-semibold">Пуш получат: {subscribed.length} из {inScope.length}</p>
          <ul className="mt-1 text-muted-foreground">{inScope.map(p => <li key={p.user_id}>{p.name} — {p.subscribed ? 'уведомления включены' : 'уведомления выключены'}</li>)}</ul>
        </div>
        <Button className="w-full" disabled={!subscribed.length} onClick={() => setStep('push')}>Показать пуш (тест)</Button>
      </CardContent></Card>}
      {step === 'push' && <Button variant="outline" className="flex h-auto w-full justify-start gap-3 whitespace-normal rounded-lg border border-border bg-card p-3 text-left" onClick={() => setStep(payload.url === '/app' ? 'form' : 'card')}>
        <Bell className="mt-1 h-5 w-5 shrink-0" /><span><span className="block font-semibold">{payload.title}</span><span className="block text-sm">{payload.body}</span><span className="block text-xs text-muted-foreground">Откроется: {payload.url}</span></span>
      </Button>}
      {(step === 'card' || step === 'booked') && <Card><CardContent className="space-y-3 p-4">
        <p className="text-lg font-bold">{event.title}</p><p className="text-sm text-muted-foreground">{event.when}</p>
        {step === 'card' ? <Button className="w-full" onClick={() => setStep('booked')}>{event.free ? 'Записаться' : 'Забронировать'}</Button> : <p className="font-semibold">Вы записаны</p>}
        <Button variant="outline" className="w-full" onClick={() => setStep('form')}>Сначала</Button>
      </CardContent></Card>}
    </div>
  </main>;
}
