import type { RollResult } from '../lib/game';
import { Dice3D } from './Dice3D';

interface DiceResultScreenProps {
  result: RollResult;
  onContinue: () => void;
}

export function DiceResultScreen({ result, onContinue }: DiceResultScreenProps) {
  const hasDestination = result.landedCell !== null;
  const canContinueToCell = result.resultType === 'move' || result.resultType === 'birth_success';

  return (
    <section className="gameplay-screen flex min-h-[calc(100dvh-72px)] flex-col items-center px-5 pb-7 pt-[calc(env(safe-area-inset-top)+34px)] text-center">
      <header className="w-full">
        <p className="gameplay-eyebrow">ПУТЬ</p>
        <h1 className="gameplay-title mt-2">Результат броска</h1>
      </header>

      <div className="result-value-card mt-5 flex w-full items-center justify-between px-4 py-3">
        <span className="text-sm text-muted">Выпало</span>
        <strong className="font-heading text-[26px] font-medium text-bronze">{result.dieValue}</strong>
      </div>

      <div className="my-auto flex min-h-[310px] items-center justify-center">
        <Dice3D value={result.dieValue} isRolling={false} isPressed={false} size={250} />
      </div>

      <div className="mb-7">
        <h2 className="font-heading text-[20px] text-bone">
          {canContinueToCell ? 'Ход определён' : 'Ты остаёшься на месте'}
        </h2>
        <p className="mt-2 text-sm leading-[1.5] text-muted">
          {hasDestination ? `Ты переходишь на клетку ${result.landedCell}` : result.message}
        </p>
        {result.bonusGenerated && <p className="mt-2 text-sm text-bronze">Получен бонусный бросок</p>}
      </div>

      <button onClick={onContinue} className="gameplay-primary-button">
        {canContinueToCell ? 'Перейти к клетке' : 'Продолжить'}
      </button>
    </section>
  );
}
