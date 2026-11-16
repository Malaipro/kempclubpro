import { useState } from 'react';
import { ArrowUpRight, CheckCircle2, Gift, RefreshCw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { goalProgress, previewRewards, type GoalReward } from './residentGoal';

export function ResidentGoalCard({ balance, reward, onSelect, onShop }: {
  balance: number; reward: GoalReward | null; onSelect: (reward: GoalReward | null) => void; onShop: () => void;
}) {
  const [open, setOpen] = useState(false);
  const progress = reward ? goalProgress(balance, reward) : null;
  return <section className="photo-glass mt-3 p-3" aria-label="Моя цель">
    <div className="flex items-center justify-between gap-2">
      <h2 className="flex items-center gap-2 text-sm font-bold"><Gift className="h-4 w-4" />Моя цель</h2>
      {reward && <div className="flex gap-1">
        <Button variant="ghost" size="icon" className="h-8 w-8" title="Сменить цель" aria-label="Сменить цель" onClick={() => setOpen(true)}><RefreshCw className="h-4 w-4" /></Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" title="Убрать цель" aria-label="Убрать цель" onClick={() => onSelect(null)}><X className="h-4 w-4" /></Button>
      </div>}
    </div>
    {reward && progress ? <>
      <p className="mt-1 text-sm font-semibold">{reward.title}</p>
      {progress.enough ? <p className="mt-2 flex items-center gap-2 text-sm font-semibold"><CheckCircle2 className="h-4 w-4" />Коинов хватает</p>
        : <p className="mt-1 text-xs">{balance} из {reward.cost} коинов · осталось {progress.remaining}</p>}
      <progress className="resident-goal-progress mt-2" value={progress.current} max={reward.cost} aria-label={`Прогресс цели: ${progress.current} из ${reward.cost}`} />
      {reward.condition && <div className="mt-2 text-xs text-muted-foreground">{reward.condition}</div>}
      {progress.enough && <Button variant="link" onClick={onShop} className="mt-1 h-8 px-0 text-foreground">Открыть в магазине<ArrowUpRight className="ml-1 h-4 w-4" /></Button>}
    </> : <Button variant="outline" className="mt-3 h-9 w-full gap-2 border-border bg-transparent text-foreground" onClick={() => setOpen(true)}><Gift className="h-4 w-4" />Выбрать награду</Button>}
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="web-home-theme max-h-[85dvh] w-[calc(100%-2rem)] overflow-y-auto rounded-lg bg-background text-foreground">
        <DialogTitle className="tracking-normal">Выбрать награду</DialogTitle>
        <DialogDescription>Тестовые награды · выбор без покупки и списания коинов</DialogDescription>
        <div className="divide-y divide-border">{previewRewards.map(item => <Button key={item.id} variant="ghost" className="h-auto w-full justify-between gap-3 rounded-none px-0 py-4 text-left whitespace-normal" onClick={() => { onSelect(item); setOpen(false); }}>
          <span className="min-w-0"><span className="block font-semibold">{item.title}</span>{item.condition && <span className="mt-1 block text-xs text-muted-foreground">{item.condition}</span>}</span>
          <span className="shrink-0 text-sm">{item.cost} коинов</span>
        </Button>)}</div>
      </DialogContent>
    </Dialog>
  </section>;
}