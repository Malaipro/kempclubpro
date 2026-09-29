import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, ImagePlus, Loader2, Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

interface Topic { id: string; name: string; space_id: string }
interface Message { id: string; topic_id: string; user_id: string; content: string | null; file_url: string | null; file_type: string | null; created_at: string; is_deleted: boolean }

const BUCKET = 'chat-files';

const ChatImage = ({ path }: { path: string }) => {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (/^https?:/.test(path)) { setUrl(path); return; }
    supabase.storage.from(BUCKET).createSignedUrl(path, 3600).then(({ data }) => setUrl(data?.signedUrl ?? null));
  }, [path]);
  return url ? <img src={url} alt="Фото" className="mt-1 max-h-64 rounded-md" referrerPolicy="no-referrer" /> : <div className="h-24 w-24 animate-pulse rounded-md bg-muted" />;
};

export const WebChatView: React.FC<{ status: string | null }> = ({ status }) => {
  const [topics, setTopics] = useState<Topic[] | null>(null);
  const [topic, setTopic] = useState<Topic | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uid, setUid] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { supabase.auth.getUser().then(({ data }) => setUid(data.user?.id ?? null)); }, []);

  useEffect(() => {
    (async () => {
      const { data: spaces, error: e1 } = await supabase.from('chat_spaces').select('id').eq('is_active', true).eq('target_status', status ?? 'club_resident');
      if (e1) { setError(e1.message); return; }
      const ids = (spaces ?? []).map((s) => s.id);
      if (ids.length === 0) { setTopics([]); return; }
      const { data, error: e2 } = await supabase.from('chat_topics').select('id,name,space_id').in('space_id', ids).eq('is_active', true).order('sort_order');
      if (e2) setError(e2.message); else setTopics(data ?? []);
    })();
  }, [status]);

  const loadNames = useCallback(async (userIds: string[]) => {
    const missing = userIds.filter((id) => !(id in names));
    if (missing.length === 0) return;
    const { data } = await supabase.from('profiles').select('user_id,first_name,last_name').in('user_id', missing);
    setNames((prev) => {
      const next = { ...prev };
      missing.forEach((id) => { next[id] = 'Участник'; });
      (data ?? []).forEach((p) => { next[p.user_id] = [p.first_name, p.last_name].filter(Boolean).join(' ') || 'Участник'; });
      return next;
    });
  }, [names]);

  useEffect(() => {
    if (!topic) return;
    let active = true;
    supabase.from('chat_messages').select('*').eq('topic_id', topic.id).eq('is_deleted', false).order('created_at', { ascending: true }).limit(200)
      .then(({ data, error: e }) => {
        if (!active) return;
        if (e) setError(e.message); else setMessages((data ?? []) as Message[]);
      });
    const channel = supabase.channel(`chat-${topic.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `topic_id=eq.${topic.id}` }, (payload) => {
        const m = payload.new as Message;
        setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
      })
      .subscribe();
    return () => { active = false; supabase.removeChannel(channel); };
  }, [topic]);

  useEffect(() => {
    loadNames([...new Set(messages.map((m) => m.user_id))]);
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]); // eslint-disable-line react-hooks/exhaustive-deps

  const send = async (file?: File) => {
    if (!topic || !uid || (!text.trim() && !file)) return;
    setSending(true); setError(null);
    try {
      let file_url: string | null = null; let file_type: string | null = null;
      if (file) {
        const ext = file.name.split('.').pop()?.replace(/[^a-z0-9]/gi, '') || 'jpg';
        const path = `${topic.id}/${uid}-${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type });
        if (upErr) throw upErr;
        file_url = path; file_type = 'image';
      }
      const { data, error: e } = await supabase.from('chat_messages')
        .insert({ topic_id: topic.id, user_id: uid, content: text.trim() || null, file_url, file_type })
        .select().single();
      if (e) throw e;
      setText('');
      if (data) setMessages((prev) => (prev.some((x) => x.id === data.id) ? prev : [...prev, data as Message]));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Не удалось отправить');
    } finally { setSending(false); }
  };

  if (!topic) {
    return (
      <div>
        <header className="bg-kamp-primary px-4 pb-6 pt-8 text-center"><h1 className="text-xl font-bold text-primary-foreground">Чат клуба</h1></header>
        <div className="space-y-2 p-4">
          {error && <p className="text-sm text-destructive">{error}</p>}
          {topics === null && !error ? <p className="py-12 text-center text-sm text-muted-foreground">Загрузка…</p>
            : topics?.length === 0 ? <p className="py-12 text-center text-sm text-muted-foreground">Тем пока нет</p>
            : topics?.map((t) => (
              <Card key={t.id} className="cursor-pointer" onClick={() => setTopic(t)}>
                <CardContent className="p-4 font-medium">{t.name}</CardContent>
              </Card>
            ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-5rem)] flex-col">
      <header className="flex items-center gap-2 border-b border-border px-2 py-3">
        <Button size="icon" variant="ghost" onClick={() => { setTopic(null); setMessages([]); }}><ArrowLeft className="h-5 w-5" /></Button>
        <h1 className="font-semibold">{topic.name}</h1>
      </header>
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 && <p className="py-12 text-center text-sm text-muted-foreground">Сообщений пока нет</p>}
        {messages.map((m) => {
          const mine = m.user_id === uid;
          return (
            <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-lg px-3 py-2 ${mine ? 'bg-kamp-primary text-primary-foreground' : 'bg-muted'}`}>
                {!mine && <p className="text-xs font-semibold opacity-80">{names[m.user_id] ?? '…'}</p>}
                {m.content && <p className="whitespace-pre-wrap break-words text-sm">{m.content}</p>}
                {m.file_url && <ChatImage path={m.file_url} />}
                <p className="mt-1 text-[10px] opacity-60">{new Date(m.created_at).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      {error && <p className="px-4 text-xs text-destructive">{error}</p>}
      <div className="sticky bottom-20 flex items-center gap-2 border-t border-border bg-background p-2">
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) send(f); e.target.value = ''; }} />
        <Button size="icon" variant="ghost" disabled={sending} onClick={() => fileRef.current?.click()}><ImagePlus className="h-5 w-5" /></Button>
        <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Сообщение" onKeyDown={(e) => { if (e.key === 'Enter') send(); }} />
        <Button size="icon" disabled={sending || !text.trim()} onClick={() => send()}>{sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}</Button>
      </div>
    </div>
  );
};
