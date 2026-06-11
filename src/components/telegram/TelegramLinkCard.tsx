import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Send, Loader2, Copy, Check, Link2Off, KeyRound } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface TelegramFields {
  telegram_id: string | null;
  telegram_username: string | null;
  telegram_first_name: string | null;
  telegram_last_name: string | null;
  telegram_linked_at: string | null;
}

interface TelegramLinkCardProps {
  userId: string;
  /** true — режим админа (полные данные + кнопка отвязки). false — режим ЛК (только свои данные). */
  isAdmin?: boolean;
}

export const TelegramLinkCard: React.FC<TelegramLinkCardProps> = ({ userId, isAdmin = false }) => {
  const { toast } = useToast();
  const [data, setData] = useState<TelegramFields | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [unlinking, setUnlinking] = useState(false);
  const [copied, setCopied] = useState(false);
  const [code, setCode] = useState<string | null>(null);
  const [codeExpiresAt, setCodeExpiresAt] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('telegram_id, telegram_username, telegram_first_name, telegram_last_name, telegram_linked_at')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) {
      console.error('Error loading telegram fields:', error);
    }
    setData((profile as TelegramFields) ?? null);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const { data: result, error } = await supabase.rpc('generate_telegram_link_code', {
        p_user_id: userId,
      });
      if (error) throw error;
      const payload = result as { code: string; expires_at: string };
      setCode(payload.code);
      setCodeExpiresAt(payload.expires_at);
      toast({ title: 'Код создан', description: 'Код привязки Telegram сгенерирован' });
    } catch (error: any) {
      console.error('Error generating link code:', error);
      toast({
        title: 'Ошибка',
        description: error?.message || 'Не удалось сгенерировать код',
        variant: 'destructive',
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleUnlink = async () => {
    if (!confirm('Отвязать Telegram у этого пользователя?')) return;
    setUnlinking(true);
    try {
      const { error } = await supabase.rpc('unlink_telegram_profile', { p_user_id: userId });
      if (error) throw error;
      setCode(null);
      setCodeExpiresAt(null);
      toast({ title: 'Готово', description: 'Telegram отвязан' });
      await load();
    } catch (error: any) {
      console.error('Error unlinking telegram:', error);
      toast({
        title: 'Ошибка',
        description: error?.message || 'Не удалось отвязать Telegram',
        variant: 'destructive',
      });
    } finally {
      setUnlinking(false);
    }
  };

  const handleCopy = async () => {
    if (!code) return;
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isLinked = !!data?.telegram_id;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Send className="w-5 h-5" />
          Telegram
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" /> Загрузка...
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Статус:</span>
              {isLinked ? (
                <Badge className="bg-green-600 hover:bg-green-600 text-white">Привязан</Badge>
              ) : (
                <Badge variant="secondary">Не привязан</Badge>
              )}
            </div>

            {isLinked && (
              <div className="grid grid-cols-2 gap-3 text-sm">
                {isAdmin && (
                  <div>
                    <span className="text-muted-foreground">Telegram ID:</span>
                    <p className="font-medium break-all">{data?.telegram_id}</p>
                  </div>
                )}
                <div>
                  <span className="text-muted-foreground">Username:</span>
                  <p className="font-medium">
                    {data?.telegram_username ? `@${data.telegram_username}` : 'Не указан'}
                  </p>
                </div>
                {isAdmin && (
                  <>
                    <div>
                      <span className="text-muted-foreground">Имя:</span>
                      <p className="font-medium">{data?.telegram_first_name || '-'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Фамилия:</span>
                      <p className="font-medium">{data?.telegram_last_name || '-'}</p>
                    </div>
                  </>
                )}
                <div>
                  <span className="text-muted-foreground">Дата привязки:</span>
                  <p className="font-medium">
                    {data?.telegram_linked_at
                      ? format(new Date(data.telegram_linked_at), 'dd.MM.yyyy HH:mm', { locale: ru })
                      : '-'}
                  </p>
                </div>
              </div>
            )}

            {/* Сгенерированный код привязки */}
            {code && (
              <div className="rounded-lg border bg-muted/40 p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-lg font-bold tracking-widest">{code}</span>
                  <Button variant="ghost" size="icon-sm" onClick={handleCopy} aria-label="Копировать код">
                    {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
                {codeExpiresAt && (
                  <p className="text-xs text-muted-foreground">
                    Действует до:{' '}
                    {format(new Date(codeExpiresAt), 'dd.MM.yyyy HH:mm', { locale: ru })}
                  </p>
                )}
                <p className="text-sm text-muted-foreground">
                  Откройте Telegram-бот КЭМП, нажмите «Привязать ЛК» и введите этот код.
                </p>
              </div>
            )}

            {/* Кнопки */}
            <div className="flex flex-wrap gap-2 pt-1">
              {!isLinked && (
                <Button onClick={handleGenerate} disabled={generating}>
                  {generating ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <KeyRound className="w-4 h-4 mr-2" />
                  )}
                  {isAdmin ? 'Сгенерировать код привязки' : 'Получить код привязки'}
                </Button>
              )}
              {isAdmin && isLinked && (
                <Button variant="destructive" onClick={handleUnlink} disabled={unlinking}>
                  {unlinking ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Link2Off className="w-4 h-4 mr-2" />
                  )}
                  Отвязать Telegram
                </Button>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
