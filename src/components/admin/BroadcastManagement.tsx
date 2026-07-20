import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Send, Plus, Trash2, Loader2, Megaphone, Paperclip, ChevronDown, ChevronRight, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

type Audience = 'intensive' | 'resident' | 'alumni' | 'all';

interface BroadcastButton {
  label: string;
  url: string;
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
  const [buttons, setButtons] = useState<BroadcastButton[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);

  const [history, setHistory] = useState<BroadcastMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const openFile = async (path: string) => {
    try {
      const { data, error } = await supabase.storage.from('broadcasts').createSignedUrl(path, 60 * 10);
      if (error) throw error;
      if (data?.signedUrl) window.open(data.signedUrl, '_blank');
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

  useEffect(() => { loadHistory(); }, [loadHistory]);

  const addButton = () => setButtons((prev) => [...prev, { label: '', url: '' }]);
  const removeButton = (i: number) => setButtons((prev) => prev.filter((_, idx) => idx !== i));
  const updateButton = (i: number, field: keyof BroadcastButton, value: string) =>
    setButtons((prev) => prev.map((b, idx) => (idx === i ? { ...b, [field]: value } : b)));

  const resetForm = () => {
    setText('');
    setAudience('all');
    setButtons([]);
    setFile(null);
  };

  const handleSend = async () => {
    if (!text.trim()) {
      toast({ title: 'Введите текст', description: 'Сообщение не может быть пустым', variant: 'destructive' });
      return;
    }
    const validButtons = buttons.filter((b) => b.label.trim() && b.url.trim());

    setSending(true);
    try {
      let fileUrl: string | null = null;
      if (file) {
        const path = `${Date.now()}-${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from('broadcasts')
          .upload(path, file);
        if (uploadError) throw uploadError;
        fileUrl = path;
      }

      const { data: userData } = await supabase.auth.getUser();

      const { data: inserted, error } = await (supabase as any)
        .from('broadcast_messages')
        .insert({
          text: text.trim(),
          audience,
          buttons: validButtons,
          file_url: fileUrl,
          status: 'draft',
          recipients_count: 0,
          created_by: userData?.user?.id ?? null,
        })
        .select('id')
        .single();
      if (error) throw error;

      const broadcastId = inserted?.id;
      if (!broadcastId) throw new Error('Не удалось получить id рассылки');

      const { data: sendData, error: sendError } = await supabase.functions.invoke(
        'send-broadcast',
        { body: { broadcastId } }
      );
      if (sendError) throw sendError;
      if (sendData && (sendData as any).ok === false) {
        throw new Error((sendData as any).error || 'Ошибка отправки');
      }

      const sent = (sendData as any)?.data?.sent ?? (sendData as any)?.sent ?? 0;
      toast({ title: 'Рассылка отправлена', description: `Отправлено ${sent} участникам` });
      resetForm();
      loadHistory();
    } catch (e: any) {
      toast({ title: 'Ошибка', description: e?.message || 'Не удалось отправить рассылку', variant: 'destructive' });
    } finally {
      setSending(false);
    }
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

          <div className="space-y-2">
            <Label>Аудитория</Label>
            <Select value={audience} onValueChange={(v) => setAudience(v as Audience)}>
              <SelectTrigger className="w-full sm:w-72">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="intensive">Все интенсив</SelectItem>
                <SelectItem value="resident">Все резиденты</SelectItem>
                <SelectItem value="alumni">Все выпускники</SelectItem>
                <SelectItem value="all">Все сразу</SelectItem>
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
            <div className="space-y-2">
              {buttons.map((b, i) => (
                <div key={i} className="flex flex-col sm:flex-row gap-2">
                  <Input
                    placeholder="Название кнопки"
                    value={b.label}
                    onChange={(e) => updateButton(i, 'label', e.target.value)}
                  />
                  <Input
                    placeholder="https://..."
                    value={b.url}
                    onChange={(e) => updateButton(i, 'url', e.target.value)}
                  />
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

          <Button onClick={handleSend} disabled={sending} className="w-full sm:w-auto">
            {sending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
            Отправить рассылку
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
                                      {m.buttons.map((b, i) => (
                                        <a
                                          key={i}
                                          href={b.url}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="inline-flex items-center gap-1 px-2 py-1 border rounded text-xs hover:bg-muted"
                                        >
                                          {b.label} <ExternalLink className="w-3 h-3" />
                                        </a>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                {m.file_url && (
                                  <div>
                                    <div className="font-semibold mb-1">Файл:</div>
                                    <Button variant="outline" size="sm" onClick={() => openFile(m.file_url!)}>
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
