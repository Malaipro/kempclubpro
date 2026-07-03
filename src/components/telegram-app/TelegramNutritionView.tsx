import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Send, Salad } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const SERVER_URL = import.meta.env.VITE_TELEGRAM_SERVER_URL ?? 'https://tg.kempclub.pro';

// ---------- Types ----------

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

type SendState = 'idle' | 'loading' | 'error';

interface Props {
  onBack: () => void;
}

// ---------- View ----------

export const TelegramNutritionView: React.FC<Props> = ({ onBack }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sendState, setSendState] = useState<SendState>('idle');
  const bottomRef = useRef<HTMLDivElement>(null);

  // Telegram BackButton — показываем при маунте, скрываем при размонтировании
  useEffect(() => {
    const btn = window.Telegram?.WebApp?.BackButton;
    if (!btn) return;
    btn.show();
    btn.onClick(onBack);
    return () => {
      btn.offClick(onBack);
      btn.hide();
    };
  }, [onBack]);

  // Автоскролл к последнему сообщению
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sendState]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || sendState === 'loading') return;

    const initData = window.Telegram?.WebApp?.initData;
    if (!initData) return;

    const history = messages;
    setMessages((prev) => [...prev, { role: 'user', content: text }]);
    setInput('');
    setSendState('loading');

    try {
      const res = await fetch(`${SERVER_URL}/api/state`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          initData,
          action: 'nutrition_chat',
          message: text,
          history,
        }),
      });

      const body = await res.json() as { ok: boolean; data?: { reply: string }; error?: string };

      if (!body.ok || !body.data) {
        throw new Error(body.error ?? 'nutrition_chat_error');
      }

      setMessages((prev) => [...prev, { role: 'assistant', content: body.data!.reply }]);
      setSendState('idle');
    } catch {
      setSendState('error');
    }
  }, [input, messages, sendState]);

  return (
    <div className="min-h-screen bg-background flex flex-col">

      {/* Header */}
      <div className="bg-kamp-primary px-4 pt-8 pb-6 flex flex-col items-center gap-2 shrink-0">
        <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
          <Salad className="w-6 h-6 text-white" />
        </div>
        <h1 className="text-white text-xl font-bold">Нутрициолог Макс</h1>
        <Badge className="bg-white/20 text-white border-white/30 hover:bg-white/30">
          На связи
        </Badge>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 && (
          <Card>
            <CardContent className="py-3 px-4">
              <p className="text-sm text-muted-foreground leading-relaxed">
                Привет! Я Макс — твой персональный нутрициолог по питанию для спорта и единоборств.
                Спроси меня о рационе, сушке, наборе массы, сгонке веса перед соревнованиями или восстановлении.
              </p>
            </CardContent>
          </Card>
        )}

        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <Card
              className={
                m.role === 'user'
                  ? 'bg-kamp-primary border-kamp-primary max-w-[85%]'
                  : 'max-w-[85%]'
              }
            >
              <CardContent className="py-2.5 px-3.5">
                <p
                  className={`text-sm leading-relaxed whitespace-pre-wrap ${
                    m.role === 'user' ? 'text-white' : ''
                  }`}
                >
                  {m.content}
                </p>
              </CardContent>
            </Card>
          </div>
        ))}

        {sendState === 'loading' && (
          <div className="flex justify-start">
            <Card className="max-w-[85%]">
              <CardContent className="py-2.5 px-3.5">
                <p className="text-sm text-muted-foreground">Макс печатает...</p>
              </CardContent>
            </Card>
          </div>
        )}

        {sendState === 'error' && (
          <div className="flex justify-start">
            <Card className="max-w-[85%] border-destructive/40">
              <CardContent className="py-2.5 px-3.5">
                <p className="text-sm text-destructive">
                  Не удалось получить ответ. Попробуй ещё раз.
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border px-4 py-3 flex items-center gap-2 shrink-0">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
          placeholder="Спроси про питание..."
          disabled={sendState === 'loading'}
          className="flex-1"
        />
        <Button
          size="icon"
          className="bg-kamp-primary hover:bg-kamp-primary/90 text-white shrink-0"
          disabled={sendState === 'loading' || !input.trim()}
          onClick={() => void send()}
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>

    </div>
  );
};
