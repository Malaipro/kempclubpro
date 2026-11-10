import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { safeAppLink } from '@/components/web-app/appLinks';
import { Checkbox } from '@/components/ui/checkbox';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { Switch } from '@/components/ui/switch';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Send, Plus, Trash2, Loader2, Megaphone, Paperclip, ChevronDown, ChevronRight, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { proxyStorageUrl } from '@/lib/storageUrl';
import { broadcastScheduleType } from './clubBroadcastQuery';

type Audience = 'intensive' | 'resident' | 'alumni' | 'all';


// Темы (topics) группового чата КЭМП
const GROUP_TOPICS: { value: string; label: string; threadId: number | null }[] = [
  { value: 'general', label: 'General', threadId: null },
  { value: '304', label: 'Челендж', threadId: 304 },
  { value: '13', label: 'Активности', threadId: 13 },
  { value: '4', label: 'Тренировки', threadId: 4 },
  { value: '12', label: 'Разговорчики', threadId: 12 },
];


// Форматируем момент времени в московском поясе (UTC+3) независимо от часового пояса устройства
const fmtMoscow = (iso: string) =>
  new Date(iso).toLocaleString('ru-RU', {
    timeZone: 'Europe/Moscow',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).replace(',', '');


type ButtonType = 'url' | 'checkin' | 'book_event' | 'request_reward';

interface BroadcastButton {
  id?: string;
  label: string;
  type: ButtonType;
  url?: string;
  target_id?: string;
}

const buttonTypeLabels: Record<ButtonType, string> = {
  url: 'Ссылка',
  checkin: 'Отметка / Чекин',
  book_event: 'Запись на событие',
  request_reward: 'Заказ награды',
};

interface ScheduleOption { id: string; title: string; description: string | null; start_time: string }
interface RewardOption { id: string; title: string; cost_coins: number }

interface BroadcastResponse {
  id: string;
  user_id: string | null;
  display_name: string | null;
  phone: string | null;
  telegram_id: string | null;
  button_id: string | null;
  button_label: string | null;
  action_type: string | null;
  created_at: string;
}

interface BroadcastMessage {
  id: string;
  text: string;
  audience: Audience;
  buttons: BroadcastButton[];
  file_url: string | null;
  status: 'draft' | 'sent';
  recipients_count: number;
  created_at: string;
  sent_at: string | null;
  target_user_ids?: string[] | null;
  filter_snapshot?: Record<string, any> | null;
}

const audienceLabels: Record<Audience, string> = {
  intensive: 'Все интенсив',
  resident: 'Все резиденты',
  alumni: 'Все выпускники',
  all: 'Все сразу',
};

export const BroadcastManagement: React.FC = () => {
  const { toast } = useToast();
  const [text, setText] = useState('');
  const [audience, setAudience] = useState<Audience>('all');
  const [sendPersonal, setSendPersonal] = useState(true);
  const [pushTitle, setPushTitle] = useState('КЭМП');
  const [pushBody, setPushBody] = useState('');
  const [pushUrl, setPushUrl] = useState('/app?section=schedule');
  const [counts, setCounts] = useState<{selected:number;subscribers:number} | null>(null);
  const [ready, setReady] = useState(false);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [report, setReport] = useState<Record<string, any> | null>(null);
  const [sendToGroup, setSendToGroup] = useState(false);
  const [topic, setTopic] = useState<string>('general');

  const [buttons, setButtons] = useState<BroadcastButton[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);

  const [history, setHistory] = useState<BroadcastMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [schedules, setSchedules] = useState<ScheduleOption[]>([]);
  const [rewards, setRewards] = useState<RewardOption[]>([]);
  const [responses, setResponses] = useState<Record<string, BroadcastResponse[]>>({});
  const [responsesLoading, setResponsesLoading] = useState<Set<string>>(new Set());

  const loadResponses = useCallback(async (broadcastId: string) => {
    setResponsesLoading((prev) => new Set(prev).add(broadcastId));
    try {
      const { data, error } = await (supabase as any)
        .from('broadcast_responses')
        .select('id, user_id, display_name, phone, telegram_id, button_id, button_label, action_type, created_at')
        .eq('broadcast_id', broadcastId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setResponses((prev) => ({ ...prev, [broadcastId]: (data || []) as BroadcastResponse[] }));
    } catch (e: any) {
      toast({ title: 'Ошибка', description: e?.message || 'Не удалось загрузить ответы', variant: 'destructive' });
    } finally {
      setResponsesLoading((prev) => {
        const next = new Set(prev);
        next.delete(broadcastId);
        return next;
      });
    }
  }, [toast]);


  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
    if (!expanded.has(id) && !responses[id]) loadResponses(id);
  };

  const openFile = async (path: string) => {
    try {
      const { data, error } = await supabase.storage.from('broadcasts').createSignedUrl(path, 60 * 10);
      if (error) throw error;
      if (data?.signedUrl) window.open(proxyStorageUrl(data.signedUrl), '_blank');
    } catch (e: any) {
      toast({ title: 'Ошибка', description: e?.message || 'Не удалось открыть файл', variant: 'destructive' });
    }
  };

  const loadHistory = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('broadcast_messages')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setHistory((data || []) as BroadcastMessage[]);
    } catch (e: any) {
      toast({ title: 'Ошибка', description: e?.message || 'Не удалось загрузить историю', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const loadOptions = useCallback(async () => {
    try {
      const [{ data: sch }, { data: rw }] = await Promise.all([
        (supabase as any)
          .from('schedules')
          .select('id, title, description, start_time')
          .eq('schedule_type', broadcastScheduleType)
          .eq('is_active', true)
          .gte('start_time', new Date().toISOString())
          .order('start_time', { ascending: true })
          .limit(50),
        (supabase as any)
          .from('rewards')
          .select('id, title, cost_coins')
          .eq('is_active', true)
          .order('sort_order', { ascending: true }),
      ]);
      setSchedules((sch || []) as ScheduleOption[]);
      setRewards((rw || []) as RewardOption[]);
    } catch {
      /* опции не критичны для формы */
    }
  }, []);

  useEffect(() => { loadHistory(); loadOptions(); }, [loadHistory, loadOptions]);

  const addButton = () =>
    setButtons((prev) => [...prev, { id: crypto.randomUUID(), label: '', type: 'url', url: '' }]);
  const removeButton = (i: number) => setButtons((prev) => prev.filter((_, idx) => idx !== i));
  const updateButton = (i: number, patch: Partial<BroadcastButton>) =>
    setButtons((prev) => prev.map((b, idx) => (idx === i ? { ...b, ...patch } : b)));

  const resetForm = () => {
    setText('');
    setAudience('all');
    setTopic('general');
    setButtons([]);
    setFile(null);
  };

  const isButtonValid = (b: BroadcastButton) => {
    if (!b.label.trim()) return false;
    if (b.type === 'url') return !!b.url?.trim();
    if (b.type === 'book_event' || b.type === 'request_reward') return !!b.target_id;
    return true;
  };

  const [sendPush, setSendPush] = useState(false);

  useEffect(() => {
    let live = true;
    setReady(false); setCounts(null);
    if (audience === 'alumni') return;
    supabase.functions.invoke('dispatch-club-notification', { body: { operation: 'preview', audience } })
      .then(({data,error}) => { if (!live) return; if (!error && data?.ok) { setReady(true); setCounts(data); } });
    return () => { live = false; };
  }, [audience]);

  useEffect(() => { setRequestId(null); setReport(null); }, [text, audience, sendPersonal, sendToGroup, sendPush, pushTitle, pushBody, pushUrl, topic, buttons, file]);

  const handleSend = async () => {
    const channels = [sendPersonal ? 'telegram_personal' : null, sendToGroup ? 'telegram_group' : null, sendPush ? 'push' : null].filter(Boolean);
    if (!channels.length) { toast({title:'Выберите канал',variant:'destructive'}); return; }
    if ((sendPersonal || sendToGroup) && !text.trim()) { toast({title:'Введите текст',variant:'destructive'}); return; }
    if (sendPush && (!pushTitle.trim() || !(pushBody.trim() || text.trim()))) { toast({title:'Заполните заголовок и текст Push',variant:'destructive'}); return; }
    setSending(true);
    const id = requestId ?? crypto.randomUUID(); setRequestId(id);
    try {
      const url = safeAppLink(pushUrl);
      let fileUrl: string | null = null;
      if (file && sendPersonal) {
        const path = `${id}-${file.name}`;
        const {error} = await supabase.storage.from('broadcasts').upload(path, file, {upsert:true});
        if(error) throw error; fileUrl=path;
      }
      const validButtons = buttons.filter(isButtonValid).map(b=>({...b,id:b.id??crypto.randomUUID(),label:b.label.trim()}));
      const {data,error} = await supabase.functions.invoke('dispatch-club-notification', {body:{
        operation:'send',request_id:id,channels,audience,text:text.trim(),title:pushTitle.trim(),body:pushBody.trim() || text.trim(),url,
        topic_id:GROUP_TOPICS.find(t=>t.value===topic)?.threadId??null,buttons:validButtons,file_url:fileUrl,
      }});
      if(error) throw new Error(error instanceof FunctionsHttpError ? await error.context.text() : error.message);
      if(!data?.ok) throw new Error(data?.error??'Не удалось отправить');
      setReport(data.results); loadHistory();
      toast({title:'Результаты доставки получены',description:'Повторный запрос не отправляет уже обработанные каналы заново.'});
    } catch(e) { toast({title:'Отправка не подтверждена',description:e instanceof Error?e.message:'Ошибка',variant:'destructive'}); }
    finally {setSending(false);}
  };

  return (
    <div className="space-y-6">
      {/* Create form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-primary" />
            Новая рассылка
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="broadcast-text">Сообщение</Label>
            <Textarea
              id="broadcast-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Текст рассылки..."
              rows={5}
              maxLength={4000}
            />
          </div>

          <fieldset className="space-y-3" disabled={sending}>
            <legend className="mb-2 text-sm font-medium">Каналы доставки</legend>
            <label className="flex items-center gap-2"><Checkbox checked={sendPersonal} onCheckedChange={v=>setSendPersonal(v===true)} />Telegram — личные сообщения</label>
            <label className="flex items-center gap-2"><Checkbox checked={sendToGroup} onCheckedChange={v=>setSendToGroup(v===true)} />Telegram — групповой чат</label>
            <label className="flex items-center gap-2"><Checkbox checked={sendPush} onCheckedChange={v=>setSendPush(v===true)} />Push — приложение КЭМП</label>
          </fieldset>

          {sendToGroup && (
            <div className="space-y-2">
              <Label>Тема</Label>
              <Select value={topic} onValueChange={setTopic}>
                <SelectTrigger className="w-full sm:w-72">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GROUP_TOPICS.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Аудитория</Label>
            <Select value={audience} onValueChange={(v) => setAudience(v as Audience)}>
              <SelectTrigger className="w-full sm:w-72">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="intensive">Все интенсив</SelectItem>
                <SelectItem value="resident">Все резиденты</SelectItem>
                
                <SelectItem value="all">Все допущенные пользователи</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Кнопки</Label>
              <Button type="button" variant="outline" size="sm" onClick={addButton}>
                <Plus className="w-4 h-4 mr-1" /> Добавить кнопку
              </Button>
            </div>
            {buttons.length === 0 && (
              <p className="text-sm text-muted-foreground">Кнопки не добавлены</p>
            )}
            <div className="space-y-3">
              {buttons.map((b, i) => (
                <div key={b.id || i} className="border rounded-md p-3 space-y-2">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Input
                      placeholder="Название кнопки"
                      value={b.label}
                      onChange={(e) => updateButton(i, { label: e.target.value })}
                    />
                    <Select
                      value={b.type}
                      onValueChange={(v) =>
                        updateButton(i, { type: v as ButtonType, url: undefined, target_id: undefined })
                      }
                    >
                      <SelectTrigger className="w-full sm:w-56">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.keys(buttonTypeLabels) as ButtonType[]).map((t) => (
                          <SelectItem key={t} value={t}>{buttonTypeLabels[t]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeButton(i)}
                      className="flex-shrink-0"
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>

                  {b.type === 'url' && (
                    <Input
                      placeholder="https://..."
                      value={b.url ?? ''}
                      onChange={(e) => updateButton(i, { url: e.target.value })}
                    />
                  )}

                  {b.type === 'book_event' && (
                    <Select value={b.target_id ?? ''} onValueChange={(v) => updateButton(i, { target_id: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите событие" />
                      </SelectTrigger>
                      <SelectContent>
                        {schedules.length === 0 && (
                          <SelectItem value="none" disabled>Нет ближайших событий</SelectItem>
                        )}
                        {schedules.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.description?.split('|||')[0]?.trim() || 'Без темы'} — {fmtMoscow(s.start_time)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  {b.type === 'request_reward' && (
                    <Select value={b.target_id ?? ''} onValueChange={(v) => updateButton(i, { target_id: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите награду" />
                      </SelectTrigger>
                      <SelectContent>
                        {rewards.length === 0 && (
                          <SelectItem value="none" disabled>Нет активных наград</SelectItem>
                        )}
                        {rewards.map((r) => (
                          <SelectItem key={r.id} value={r.id}>
                            {r.title} — {r.cost_coins} коинов
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  {b.type === 'checkin' && (
                    <p className="text-xs text-muted-foreground">
                      Кнопка подтверждения — дополнительные поля не требуются.
                    </p>
                  )}
                </div>
              ))}
            </div>

          </div>

          <div className="space-y-2">
            <Label htmlFor="broadcast-file" className="flex items-center gap-2">
              <Paperclip className="w-4 h-4" /> Файл / фото (опционально)
            </Label>
            <Input
              id="broadcast-file"
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            {file && <p className="text-sm text-muted-foreground">Выбран: {file.name}</p>}
          </div>

          {sendPush && <div className="space-y-3">
            <div className="space-y-2"><Label htmlFor="push-title">Заголовок Push</Label><Input id="push-title" value={pushTitle} maxLength={100} onChange={e=>setPushTitle(e.target.value)} /></div>
            <div className="space-y-2"><Label htmlFor="push-body">Текст Push</Label><Textarea id="push-body" value={pushBody} placeholder="Текст сообщения, если не заполнено" maxLength={1000} onChange={e=>setPushBody(e.target.value)} /></div>
            <div className="space-y-2"><Label htmlFor="push-url">Переход в приложение</Label><Select value={pushUrl} onValueChange={setPushUrl}><SelectTrigger id="push-url"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="/app">Главная</SelectItem><SelectItem value="/app?section=schedule">Расписание</SelectItem><SelectItem value="/app?section=activities">Отметки</SelectItem><SelectItem value="/app?section=chat">Чат</SelectItem><SelectItem value="/app?section=profile">Профиль</SelectItem></SelectContent></Select></div>
            <p className="text-sm text-muted-foreground">{counts ? `Допущено: ${counts.selected}. С Push-подпиской: ${counts.subscribers}.` : 'Количество подписчиков пока недоступно.'}</p>
          </div>}
          {!ready && <p role="status" className="text-sm text-muted-foreground">Адресная отправка подготовлена, но ещё не включена на сервере. Отправка заблокирована.</p>}
          {report && <section className="space-y-2" aria-label="Результаты доставки">{Object.entries(report).map(([channel,r])=><div key={channel} className="border-b border-border py-2 text-sm"><b>{{push:'Push',telegram_personal:'Telegram — личные',telegram_group:'Telegram — группа'}[channel]}</b>: {r.ok?'Передано службе доставки':'Не подтверждено'}{channel==='push' && ` · Получателей: ${r.selected}; с подпиской: ${r.subscribers??0}; устройств: ${r.subscriptions??0}; принято: ${r.accepted??0}; ошибок: ${r.errors??0}; недействительных: ${r.invalid??0}`}{r.reused?' · повтор без отправки':''}{r.error && ` · ${r.error}`}{channel!=='push' && r.telegram && <pre className="whitespace-pre-wrap break-words">{JSON.stringify(r.telegram)}</pre>}</div>)}</section>}
          <Button onClick={handleSend} disabled={sending || !ready || (!sendPersonal && !sendToGroup && !sendPush)} className="w-full sm:w-auto">
            {sending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
            Отправить по выбранным каналам
          </Button>
        </CardContent>
      </Card>

      {/* History */}
      <Card>
        <CardHeader>
          <CardTitle>История рассылок</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : history.length === 0 ? (
            <p className="text-muted-foreground text-center py-6">Рассылок пока нет</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8" />
                    <TableHead>Дата</TableHead>
                    <TableHead>Аудитория</TableHead>
                    <TableHead>Текст</TableHead>
                    <TableHead>Статус</TableHead>
                    <TableHead>Получателей</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((m) => {
                    const isOpen = expanded.has(m.id);
                    const targetsInfo = m.target_user_ids && m.target_user_ids.length > 0
                      ? `${m.target_user_ids.length} получателей из списка`
                      : audienceLabels[m.audience];
                    const snapshot = m.filter_snapshot || null;
                    return (
                      <React.Fragment key={m.id}>
                        <TableRow className="cursor-pointer hover:bg-muted/50" onClick={() => toggleExpand(m.id)}>
                          <TableCell>
                            {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                          </TableCell>
                          <TableCell className="text-sm whitespace-nowrap">
                            {format(new Date(m.created_at), 'dd.MM.yyyy HH:mm', { locale: ru })}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{targetsInfo}</Badge>
                          </TableCell>
                          <TableCell className="max-w-xs truncate text-sm text-muted-foreground">
                            {m.text}
                          </TableCell>
                          <TableCell>
                            <Badge variant={m.status === 'sent' ? 'default' : 'secondary'}>
                              {m.status === 'sent' ? 'Отправлено' : 'Черновик'}
                            </Badge>
                          </TableCell>
                          <TableCell>{m.recipients_count}</TableCell>
                        </TableRow>
                        {isOpen && (
                          <TableRow className="bg-muted/30">
                            <TableCell colSpan={6}>
                              <div className="p-3 space-y-3 text-sm">
                                <div>
                                  <div className="font-semibold mb-1">Полный текст:</div>
                                  <div className="whitespace-pre-wrap">{m.text}</div>
                                </div>
                                {m.buttons && m.buttons.length > 0 && (
                                  <div>
                                    <div className="font-semibold mb-1">Кнопки:</div>
                                    <div className="flex flex-wrap gap-2">
                                      {m.buttons.map((b, i) =>
                                        (b.type ?? 'url') === 'url' && b.url ? (
                                          <a
                                            key={b.id || i}
                                            href={proxyStorageUrl(b.url)}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="inline-flex items-center gap-1 px-2 py-1 border rounded text-xs hover:bg-muted"
                                          >
                                            {b.label} <ExternalLink className="w-3 h-3" />
                                          </a>
                                        ) : (
                                          <span
                                            key={b.id || i}
                                            className="inline-flex items-center gap-1 px-2 py-1 border rounded text-xs"
                                          >
                                            {b.label}
                                            <Badge variant="secondary" className="text-[10px]">
                                              {buttonTypeLabels[(b.type ?? 'url') as ButtonType]}
                                            </Badge>
                                          </span>
                                        )
                                      )}
                                    </div>
                                  </div>
                                )}

                                {/* Ответы по интерактивным кнопкам */}
                                {m.buttons?.some((b) => (b.type ?? 'url') !== 'url') && (
                                  <div>
                                    <div className="font-semibold mb-1">Ответы:</div>
                                    {responsesLoading.has(m.id) ? (
                                      <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                                    ) : (
                                      <div className="space-y-3">
                                        {m.buttons
                                          .filter((b) => (b.type ?? 'url') !== 'url')
                                          .map((b, i) => {
                                            const all = responses[m.id] || [];
                                            const clicks = all.filter((r) =>
                                              b.id ? r.button_id === b.id : r.button_label === b.label
                                            );
                                            return (
                                              <div key={b.id || i} className="border rounded p-2">
                                                <div className="flex items-center gap-2 mb-2">
                                                  <span className="font-medium">{b.label}</span>
                                                  <Badge variant="outline">{clicks.length} нажатий</Badge>
                                                </div>
                                                {clicks.length === 0 ? (
                                                  <p className="text-xs text-muted-foreground">Нажатий пока нет</p>
                                                ) : (
                                                  <div className="overflow-x-auto">
                                                    <Table>
                                                      <TableHeader>
                                                        <TableRow>
                                                          <TableHead>Участник</TableHead>
                                                          <TableHead>Телефон</TableHead>
                                                          <TableHead>Telegram ID</TableHead>
                                                          <TableHead>Дата</TableHead>
                                                        </TableRow>
                                                      </TableHeader>
                                                      <TableBody>
                                                        {clicks.map((r) => (
                                                          <TableRow key={r.id}>
                                                            <TableCell className="text-xs">{r.display_name || '—'}</TableCell>
                                                            <TableCell className="text-xs">{r.phone || '—'}</TableCell>
                                                            <TableCell className="text-xs">{r.telegram_id || '—'}</TableCell>
                                                            <TableCell className="text-xs whitespace-nowrap">
                                                              {format(new Date(r.created_at), 'dd.MM.yyyy HH:mm', { locale: ru })}
                                                            </TableCell>
                                                          </TableRow>
                                                        ))}
                                                      </TableBody>
                                                    </Table>
                                                  </div>
                                                )}
                                              </div>
                                            );
                                          })}
                                      </div>
                                    )}
                                  </div>
                                )}

                                {m.file_url && (
                                  <div>
                                    <div className="font-semibold mb-1">Файл:</div>
                                    <Button variant="outline" size="sm" onClick={() => openFile(m.file_url ?? '')}>
                                      <Paperclip className="w-4 h-4 mr-2" /> Открыть вложение
                                    </Button>
                                  </div>
                                )}
                                {snapshot && (
                                  <div>
                                    <div className="font-semibold mb-1">Фильтр списка:</div>
                                    <div className="text-muted-foreground">
                                      {snapshot.statuses?.length ? `Статусы: ${snapshot.statuses.join(', ')}. ` : ''}
                                      {snapshot.streams?.length ? `Потоки: ${snapshot.streams.length}. ` : ''}
                                      {snapshot.tag_ids?.length ? `Тегов: ${snapshot.tag_ids.length}. ` : ''}
                                      {snapshot.search ? `Поиск: «${snapshot.search}». ` : ''}
                                      {!snapshot.statuses?.length && !snapshot.streams?.length && !snapshot.tag_ids?.length && !snapshot.search ? 'Без фильтров' : ''}
                                    </div>
                                  </div>
                                )}
                                <div className="text-xs text-muted-foreground pt-1 border-t">
                                  ID: {m.id}
                                  {m.sent_at && ` • Отправлено: ${format(new Date(m.sent_at), 'dd.MM.yyyy HH:mm', { locale: ru })}`}
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
