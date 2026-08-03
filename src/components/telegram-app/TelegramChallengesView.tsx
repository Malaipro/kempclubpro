import React, { useEffect, useState, useCallback } from 'react';
import { Trophy, Ticket, Share2, CheckCircle2, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const SERVER_URL = (import.meta as any).env?.VITE_TELEGRAM_SERVER_URL ?? 'https://tg.kempclub.pro';

interface Challenge {
  id: string; name: string; description: string | null;
  prize_description: string | null; start_date: string; end_date: string;
  max_per_day: number;
}
interface Entry { id: string; challenge_id: string; entry_date: string; }

interface Props { onBack: () => void; }

export const TelegramChallengesView: React.FC<Props> = ({ onBack }) => {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [justChecked, setJustChecked] = useState(false);

  useEffect(() => {
    const btn = (window as any).Telegram?.WebApp?.BackButton;
    if (!btn) return;
    btn.show(); btn.onClick(onBack);
    return () => { btn.offClick(onBack); btn.hide(); };
  }, [onBack]);

  const fetchData = useCallback(async () => {
    const initData = (window as any).Telegram?.WebApp?.initData;
    if (!initData) { setError('Нет доступа'); setLoading(false); return; }
    try {
      setLoading(true); setError(null);
      const res = await fetch(`${SERVER_URL}/api/state`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData, action: 'get_challenges' }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || 'Ошибка загрузки');
      setChallenges(json.data.challenges || []);
      setEntries(json.data.entries || []);
      setReferralCode(json.data.referral_code || null);
    } catch (e: any) { setError(e.message); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCheckin = async (challengeId: string) => {
    const initData = (window as any).Telegram?.WebApp?.initData;
    if (!initData) return;
    setChecking(true);
    try {
      const res = await fetch(`${SERVER_URL}/api/state`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData, action: 'challenge_checkin', challenge_id: challengeId }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || 'Ошибка');
      setJustChecked(true);
      await fetchData();
    } catch (e: any) { alert(e.message); } finally { setChecking(false); }
  };

  const handleShare = () => {
    const tg = (window as any).Telegram?.WebApp;
    if (tg?.openTelegramLink && referralCode) {
      const text = 'Присоединяйся к КЭМП — мужскому клубу, где меняют себя через дисциплину и тренировки. Мой реферальный код: ' + referralCode;
      const url = 'https://t.me/kempclub_bot?start=' + referralCode;
      tg.openTelegramLink('https://t.me/share/url?url=' + encodeURIComponent(url) + '&text=' + encodeURIComponent(text));
    }
  };

  const today = new Date().toISOString().split('T')[0];

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400">Загрузка...</div>;
  if (error) return <div className="p-4 text-center"><p className="text-red-400 mb-3">{error}</p><Button onClick={fetchData} variant="outline" size="sm">Повторить</Button></div>;

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <div className="bg-kamp-primary text-white px-4 py-3">
        <h1 className="text-lg font-bold flex items-center gap-2"><Trophy className="w-5 h-5" /> Челленджи</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {challenges.length === 0 ? (
          <div className="text-center text-gray-400 py-12"><Trophy className="w-12 h-12 mx-auto mb-3 opacity-40" /><p>Нет активных челленджей</p></div>
        ) : challenges.map(ch => {
          const myEntries = entries.filter(e => e.challenge_id === ch.id);
          const ticketCount = myEntries.length;
          const checkedToday = myEntries.some(e => e.entry_date === today);
          const daysLeft = Math.max(0, Math.ceil((new Date(ch.end_date).getTime() - Date.now()) / 86400000));

          return (
            <div key={ch.id} className="space-y-4">
              <Card className="border-kamp-primary/30 bg-kamp-primary/5">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <h2 className="text-base font-bold">{ch.name}</h2>
                    <Badge variant="outline" className="flex items-center gap-1 border-kamp-primary/40 text-kamp-primary">
                      <Clock className="w-3 h-3" /> {daysLeft} дн.
                    </Badge>
                  </div>
                  {ch.description && <p className="text-sm text-muted-foreground">{ch.description}</p>}
                  {ch.prize_description && (
                    <div className="bg-background rounded-lg p-3 border border-border/50">
                      <p className="text-sm font-medium mb-1">Призы:</p>
                      <p className="text-sm text-muted-foreground whitespace-pre-line">{ch.prize_description}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-yellow-500/30 bg-yellow-500/5">
                <CardContent className="p-4 text-center space-y-2">
                  <div className="flex items-center justify-center gap-2">
                    <Ticket className="w-8 h-8 text-yellow-500" />
                    <span className="text-3xl font-bold">{ticketCount}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{ticketCount === 0 ? 'Пока нет билетов' : ticketCount === 1 ? 'билет на розыгрыш' : ticketCount < 5 ? 'билета на розыгрыш' : 'билетов на розыгрыш'}</p>
                </CardContent>
              </Card>

              {checkedToday || justChecked ? (
                <Button className="w-full h-12 text-base" disabled>
                  <CheckCircle2 className="w-5 h-5 mr-2" /> Сегодня отмечен
                </Button>
              ) : (
                <Button className="w-full h-12 text-base bg-kamp-primary hover:bg-kamp-primary/90" onClick={() => handleCheckin(ch.id)} disabled={checking}>
                  {checking ? 'Отмечаю...' : 'Отметиться — получить билет'}
                </Button>
              )}

              {referralCode && (
                <Card className="border-border/50">
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground mb-2">Твой реферальный код для соцсетей:</p>
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-mono font-bold">{referralCode}</span>
                      <Button size="sm" variant="outline" onClick={handleShare}>
                        <Share2 className="w-4 h-4 mr-1" /> Поделиться
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
