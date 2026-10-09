import React, { useEffect, useRef, useState } from 'react';
import { Loader2, Salad, Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface ChatMsg { role: 'user' | 'assistant'; content: string }

export const WebNutritionView: React.FC = () => {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  const send = async () => {
    const message = text.trim();
    if (!message || sending) return;
    setText('');
    setError(null);
    setSending(true);
    const history = messages.slice(-20);
    setMessages((prev) => [...prev, { role: 'user', content: message }]);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('nutrition-chat', {
        body: { message, history },
      });
      if (fnError) throw fnError;
      const reply = (data as { reply?: string } | null)?.reply;
      if (!reply) throw new Error('Пустой ответ от нутрициолога');
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось получить ответ');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-5rem)] flex-col">
      <header className="bg-kamp-primary px-4 pb-5 pt-8">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-foreground/15">
            <Salad className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-primary-foreground">Макс</h1>
            <p className="text-xs text-primary-foreground/80">Нутрициолог КЭМП</p>
          </div>
        </div>
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Задайте вопрос по питанию, рецепту или добавкам — Макс ответит.
          </p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[80%] rounded-lg px-3 py-2 ${
                m.role === 'user' ? 'bg-kamp-primary text-primary-foreground' : 'bg-muted'
              }`}
            >
              <p className="whitespace-pre-wrap break-words text-sm">{m.content}</p>
            </div>
          </div>
        ))}
        {sending && (
          <div className="flex justify-start">
            <div className="rounded-lg bg-muted px-3 py-2">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {error && <p className="px-4 pb-1 text-xs text-destructive">{error}</p>}
      <div className="sticky bottom-20 flex items-center gap-2 border-t border-border bg-background p-2">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Вопрос по питанию…"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
        />
        <Button size="icon" disabled={sending || !text.trim()} onClick={send}>
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
};
