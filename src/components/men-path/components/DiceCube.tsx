import { useState, useEffect } from 'react';
import { getPublicUrl } from '../lib/assets';

interface DiceCubeProps {
  value: number | null;
  isRolling: boolean;
  size?: number;
}

// PNG dice faces from designer
export function DiceCube({ value, isRolling, size = 128 }: DiceCubeProps) {
  const [displayValue, setDisplayValue] = useState(1);
  const [isBouncing, setIsBouncing] = useState(false);

  useEffect(() => {
    if (!isRolling) {
      if (value) {
        setDisplayValue(value);
      }
      return;
    }

    // Rolling animation: rapidly cycle through faces
    let count = 0;
    setIsBouncing(true);
    const interval = setInterval(() => {
      setDisplayValue(Math.floor(Math.random() * 6) + 1);
      count++;
      if (count > 15) {
        clearInterval(interval);
        setIsBouncing(false);
      }
    }, 80);

    return () => {
      clearInterval(interval);
      setIsBouncing(false);
    };
  }, [isRolling, value]);

  return (
    <div className="relative flex items-center justify-center">
      <img
        src={getPublicUrl(`/dice/dice_face_${displayValue}.png`)}
        alt={`Кубик: ${displayValue}`}
        width={size}
        height={size}
        className={`transition-transform duration-100 ${
          isRolling || isBouncing ? 'animate-dice-shake' : ''
        }`}
        style={{
          filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.4))',
        }}
        draggable={false}
      />
    </div>
  );
}
