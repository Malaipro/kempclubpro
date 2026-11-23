import { useState } from 'react';

import { getPublicUrl } from '../lib/assets';
import { Dice3D } from './Dice3D';

interface DiceIdleScreenProps {
  onRoll: () => void;
  onBack?: () => void;
  onRules?: () => void;
  canRoll?: boolean;
  isBirth?: boolean;
}

export function DiceIdleScreen({
  onRoll,
  onBack,
  onRules,
  canRoll = true,
  isBirth = false,
}: DiceIdleScreenProps) {
  const [isPressed, setIsPressed] = useState(false);
  const [isRolling, setIsRolling] = useState(false);

  const handleRoll = () => {
    if (!canRoll || isRolling) return;
    setIsPressed(false);
    setIsRolling(true);
    window.setTimeout(onRoll, 1450);
  };

  return (
    <section className="gameplay-screen flex min-h-[calc(100dvh-72px)] flex-col items-center px-5 pb-7 pt-[calc(env(safe-area-inset-top)+34px)] text-center">
      <header>
        <p className="gameplay-eyebrow">ПУТЬ</p>
        <h1 className="gameplay-title mt-2">Бросок кубика</h1>
        <p className="mt-3 text-sm leading-[1.5] text-muted">
          {isBirth ? 'Для входа нужна шестёрка. После каждой попытки шанс растёт; четвёртая откроет Путь наверняка.' : 'Коснись кубика или используй кнопку ниже'}
        </p>
      </header>

      <button
        type="button"
        onPointerDown={() => canRoll && !isRolling && setIsPressed(true)}
        onPointerUp={() => setIsPressed(false)}
        onPointerCancel={() => setIsPressed(false)}
        onClick={handleRoll}
        disabled={!canRoll || isRolling}
        className="dice-hero my-auto flex min-h-[360px] w-full items-center justify-center disabled:cursor-not-allowed"
        aria-label="Бросить кубик"
      >
        {isRolling ? (
          <Dice3D value={null} isRolling={true} isPressed={false} size={230} />
        ) : (
          <img
            src={getPublicUrl('/runtime/cube_B_v001/cube_B_idle.webp')}
            alt=""
            className={`dice-hero__image w-[340px] max-w-none select-none ${isPressed ? 'is-pressed' : ''}`}
            draggable={false}
          />
        )}
      </button>

      <div className="w-full">
        <button
          onClick={handleRoll}
          disabled={!canRoll || isRolling}
          className="gameplay-primary-button disabled:cursor-not-allowed disabled:opacity-45"
        >
          {isRolling ? 'Кубик в пути…' : 'Бросить кубик'}
        </button>
        {onBack && !isBirth && (
          <button onClick={onBack} className="gameplay-secondary-button">Вернуться к пути</button>
        )}
        {onRules && isBirth && (
          <button onClick={onRules} className="gameplay-secondary-button">Правила</button>
        )}
      </div>
    </section>
  );
}
