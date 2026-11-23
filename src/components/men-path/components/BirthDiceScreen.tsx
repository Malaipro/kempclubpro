import { useState } from 'react';
import type { RollResult } from '../lib/game';
import { getPublicUrl } from '../lib/assets';
import { DiceCube } from './DiceCube';

interface BirthDiceScreenProps {
  onRoll: () => void;
  lastRoll: RollResult | null;
}

export function BirthDiceScreen({ onRoll, lastRoll }: BirthDiceScreenProps) {
  const [isRolling, setIsRolling] = useState(false);

  const handleRoll = () => {
    if (isRolling || lastRoll?.resultType === 'birth_success') return;
    setIsRolling(true);

    setTimeout(() => {
      onRoll();
      setIsRolling(false);
    }, 1200);
  };

  const isSuccess = lastRoll?.resultType === 'birth_success';

  return (
    <div 
      className="min-h-dvh flex flex-col relative bg-ink"
      style={{ 
        backgroundImage: `url(${getPublicUrl('/screens/03_dice_idle.png')})`,
        backgroundSize: 'cover',
        backgroundPosition: 'top center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      {/* Dark gradient overlay at bottom for button readability */}
      <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-ink via-ink/60 to-transparent pointer-events-none" />

      {/* Header text - positioned over the top area */}
      <div className="relative z-10 pt-14 px-6 text-center">
        <h1 className="font-heading text-display text-bronze tracking-[0.2em] uppercase drop-shadow-lg">
          Путь Мужчины
        </h1>
        <p className="font-heading text-h2 text-muted mt-2 tracking-wide drop-shadow">
          Кубик пути
        </p>
      </div>

      {/* Spacer - pushes content below the dice in the background image */}
      <div className="flex-1" />

      {/* Text below the background dice */}
      <div className="relative z-10 px-6 text-center mb-4">
        <p className="text-body text-bone/90 drop-shadow">
          Ты готов сделать следующий шаг?
        </p>
        <p className="text-caption text-muted mt-1 drop-shadow">
          Доверься Пути. Брось кубик.
        </p>
      </div>

      {/* Rolling overlay - centered dice animation */}
      {isRolling && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-ink/40 backdrop-blur-sm">
          <div className="flex flex-col items-center">
            <DiceCube
              value={lastRoll?.dieValue ?? null}
              isRolling={isRolling}
              size={160}
            />
            <p className="text-body text-bone mt-6 font-heading">Бросок...</p>
          </div>
        </div>
      )}

      {/* Result overlay */}
      {lastRoll && !isRolling && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-ink/50 backdrop-blur-sm">
          <div className="bg-graphite/90 rounded-2xl p-6 mx-6 text-center max-w-xs border border-bronze/30 shadow-2xl">
            <p className={`text-h1 font-heading mb-2 ${isSuccess ? 'text-bronze' : 'text-bone'}`}>
              {lastRoll.message}
            </p>
            {!isSuccess && (
              <p className="text-caption text-muted">Брось снова</p>
            )}
          </div>
        </div>
      )}

      {/* Bottom action area */}
      <div className="relative z-10 px-6 pb-28 pt-4">
        <button
          onClick={handleRoll}
          disabled={isRolling || isSuccess}
          className="w-full min-h-cta bg-bronze text-ink font-heading text-h2 rounded-card hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-xl flex items-center justify-center gap-2"
        >
          <span>{isRolling ? 'Бросок...' : isSuccess ? 'Путь открыт' : 'Бросить кубик'}</span>
          {!isRolling && !isSuccess && (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
              <circle cx="8" cy="8" r="1.5" fill="currentColor" stroke="none"/>
              <circle cx="16" cy="16" r="1.5" fill="currentColor" stroke="none"/>
            </svg>
          )}
        </button>

        <button
          onClick={() => {}}
          className="w-full mt-3 text-caption text-muted hover:text-bone transition-colors flex items-center justify-center gap-1"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 14 4 9l5-5"/>
            <path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5v0a5.5 5.5 0 0 1-5.5 5.5H11"/>
          </svg>
          Вернуться к карте
        </button>
      </div>
    </div>
  );
}
