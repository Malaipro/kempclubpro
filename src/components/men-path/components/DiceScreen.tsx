import { useState, useEffect } from 'react';
import type { GameState } from '../lib/game';
import type { RollResult } from '../lib/game';
import { getPublicUrl } from '../lib/assets';

interface DiceScreenProps {
  game: GameState;
  lastRoll: RollResult | null;
  onRoll: () => void;
  onBack: () => void;
}

export function DiceScreen({ game, lastRoll, onRoll, onBack }: DiceScreenProps) {
  const [isRolling, setIsRolling] = useState(false);
  const [displayValue, setDisplayValue] = useState(4);

  const isBirth = game.status === 'waiting_birth';

  useEffect(() => {
    if (!isRolling && lastRoll?.dieValue) {
      setDisplayValue(lastRoll.dieValue);
    }
  }, [lastRoll, isRolling]);

  const handleRoll = () => {
    if (isRolling) return;
    setIsRolling(true);

    let count = 0;
    const interval = setInterval(() => {
      setDisplayValue(Math.floor(Math.random() * 6) + 1);
      count++;
      if (count > 12) clearInterval(interval);
    }, 100);

    setTimeout(() => {
      clearInterval(interval);
      onRoll();
      setIsRolling(false);
    }, 1350);
  };

  return (
    <div 
      className="min-h-dvh flex flex-col relative bg-ink"
      style={{ 
        backgroundImage: `url(${getPublicUrl('/textures/base_graphite_topography_400.png?v=4')})`, 
        backgroundRepeat: 'repeat', 
        backgroundSize: '200px' 
      }}
    >
      {/* Back button */}
      <div className="pt-6 px-6">
        <button
          onClick={onBack}
          className="text-caption text-muted hover:text-bone transition-colors flex items-center gap-1"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5"/>
            <path d="m12 19-7-7 7-7"/>
          </svg>
          Назад
        </button>
      </div>

      {/* Header */}
      <div className="px-6 text-center mt-4">
        <h1 className="font-heading text-display text-bronze tracking-widest uppercase">
          Путь Мужчины
        </h1>
        <p className="font-heading text-h2 text-muted mt-1">
          {isBirth ? 'Кубик пути' : 'Бросок кубика'}
        </p>
      </div>

      {/* Center - dice */}
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <img
          src={getPublicUrl(`/dice/dice_face_${displayValue}.png`)}
          alt={`Кубик: ${displayValue}`}
          width={160}
          height={160}
          className={`drop-shadow-2xl ${isRolling ? 'animate-dice-shake' : ''}`}
          style={{ filter: 'drop-shadow(0 8px 24px rgba(0,0,0,0.5))' }}
          draggable={false}
        />

        <p className="text-body text-bone/80 text-center mt-8">
          {isBirth 
            ? 'Бросай до выпадения шестёрки'
            : game.status === 'ready_bonus_roll'
            ? 'Бонусный бросок!'
            : `Текущая клетка: ${game.currentCellId}`}
        </p>
      </div>

      {/* Result */}
      {lastRoll && !isRolling && (
        <div className="px-6 text-center mb-4">
          <p className="text-h2 font-heading text-bone">{lastRoll.message}</p>
          {lastRoll.landedCell && (
            <p className="text-caption text-muted mt-1">
              {game.currentCellId} + {lastRoll.dieValue} = {lastRoll.landedCell}
            </p>
          )}
          {lastRoll.bonusGenerated && (
            <p className="text-caption text-bronze mt-1">+1 бонусный бросок</p>
          )}
        </div>
      )}

      {/* Button */}
      <div className="px-6 pb-24 pt-4">
        <button
          onClick={handleRoll}
          disabled={isRolling}
          className="w-full min-h-cta bg-bronze text-ink font-heading text-h2 rounded-card hover:opacity-90 transition-opacity disabled:opacity-50 shadow-lg flex items-center justify-center gap-2"
        >
          <span>{isRolling ? 'Бросок...' : isBirth ? 'Бросить кубик' : 'Бросить'}</span>
          {!isRolling && (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
              <circle cx="8" cy="8" r="1.5" fill="currentColor" stroke="none"/>
              <circle cx="16" cy="16" r="1.5" fill="currentColor" stroke="none"/>
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
