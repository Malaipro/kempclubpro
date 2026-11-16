import { useState } from 'react';
import { Home, CalendarDays, MessageCircle, User, ShoppingBag, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { WebHomeView, WebHomeTile } from './WebHomeView';
import { ResidentGoalCard } from './ResidentGoalCard';
import { previewRewards, selectGoal, type GoalReward } from './residentGoal';

type Scenario = 'empty' | 'progress' | 'enough';
export default function ResidentGoalPreview() {
  const [scenario, setScenario] = useState<Scenario>('empty');
  const [state, setState] = useState<{ balance: number; reward: GoalReward | null }>({ balance: 380, reward: null });
  const [shop, setShop] = useState(false);
  const chooseScenario = (value: string) => {
    if (value !== 'empty' && value !== 'progress' && value !== 'enough') return;
    setScenario(value);
    setState({ balance: value === 'enough' ? 500 : 380, reward: value === 'empty' ? null : previewRewards[0] });
  };
  return <main className="web-home-theme min-h-screen bg-background text-foreground">
    <div className="mx-auto max-w-lg pb-20">
      <div className="px-4 pt-3 pb-2">
        <p className="mb-2 text-xs">Preview · тестовые данные · без покупок</p>
        <Tabs value={scenario} onValueChange={chooseScenario}><TabsList className="grid w-full grid-cols-3 bg-accent"><TabsTrigger value="empty" className="text-xs">Без цели</TabsTrigger><TabsTrigger value="progress" className="text-xs">380 / 500</TabsTrigger><TabsTrigger value="enough" className="text-xs">Хватает</TabsTrigger></TabsList></Tabs>
      </div>
      <WebHomeView data={{ found: true, status: 'club_resident', approved: true, coins_balance: state.balance, total_points: 0,
        profile: { user_id: 'preview', display_name: 'Дмитрий', first_name: null, last_name: null, avatar_url: null, telegram: null, approved: true, referral_code: null } }}
        onProfile={() => {}} onCoins={() => setShop(true)} onPoints={() => {}}
        goalSlot={<ResidentGoalCard balance={state.balance} reward={state.reward} onSelect={reward => setState(previous => selectGoal(previous, reward))} onShop={() => setShop(true)} />}
        tiles={<><WebHomeTile section="activities" icon={<Activity />} label="Отметки" onClick={() => { window.location.href = '/app/preview/checkins'; }} /><WebHomeTile section="shop" icon={<ShoppingBag />} label="Магазин" onClick={() => setShop(true)} /><WebHomeTile section="chat" icon={<MessageCircle />} label="Чат" onClick={() => {}} /></>} />
    </div>
    <nav aria-label="Навигация макета" className="fixed bottom-0 left-1/2 grid w-full max-w-lg -translate-x-1/2 grid-cols-4 border-t border-border bg-background px-2 py-2">
      {[{ icon: Home, label: 'Главная' }, { icon: CalendarDays, label: 'Расписание' }, { icon: MessageCircle, label: 'Чат' }, { icon: User, label: 'Профиль' }].map(({ icon: Icon, label }) => <Button key={label} variant="ghost" className="h-12 flex-col gap-1 text-xs" onClick={() => {}}><Icon className="h-5 w-5" />{label}</Button>)}
    </nav>
    <Dialog open={shop} onOpenChange={setShop}><DialogContent className="web-home-theme w-[calc(100%-2rem)] rounded-lg bg-background text-foreground"><DialogTitle className="tracking-normal">Магазин · Preview</DialogTitle><DialogDescription>Тестовый просмотр награды. Покупка недоступна.</DialogDescription><p className="font-semibold">{state.reward?.title ?? 'Награды КЭМП'}</p>{state.reward && <><p>{state.reward.cost} коинов</p>{state.reward.condition && <p className="text-sm text-muted-foreground">{state.reward.condition}</p>}</>}</DialogContent></Dialog>
  </main>;
}