import { useEffect, useState, type CSSProperties } from 'react';

import { getPublicUrl } from '../lib/assets';

interface Dice3DProps {
  value: number | null;
  isRolling: boolean;
  isPressed: boolean;
  size?: number;
}

// Texture values for the cube's logical positions: front, right, left, top,
// bottom, back. Each row is a valid rotation of the same physical die. The
// requested result is always placed on the large front face, facing the player.
const faceLayoutByFrontValue: Record<number, number[]> = {
  1: [1, 4, 3, 5, 2, 6],
  2: [2, 4, 3, 1, 6, 5],
  3: [3, 2, 5, 1, 6, 4],
  4: [4, 5, 2, 1, 6, 3],
  5: [5, 3, 4, 1, 6, 2],
  6: [6, 4, 3, 2, 5, 1],
};

export function Dice3D({ value, isRolling, isPressed, size = 230 }: Dice3DProps) {
  const [rollingValue, setRollingValue] = useState(1);

  useEffect(() => {
    if (!isRolling) return;

    const interval = window.setInterval(() => {
      setRollingValue((current) => current % 6 + 1);
    }, 95);

    return () => window.clearInterval(interval);
  }, [isRolling]);

  const visibleValue = value ?? rollingValue;
  const faceLayout = faceLayoutByFrontValue[visibleValue] ?? faceLayoutByFrontValue[1];
  const visibleFaces = [
    { className: 'is-top', value: faceLayout[3] },
    { className: 'is-left', value: faceLayout[2] },
    { className: 'is-right', value: faceLayout[0] },
  ];
  const cubeStyle = {
    transform: !isRolling && isPressed ? 'translateY(3px) scale(.96)' : undefined,
  } as CSSProperties;

  return (
    <div
      className="dice-3d-scene"
      style={{ width: size, height: size }}
      role="img"
      aria-label={isRolling ? 'Кубик вращается' : value ? `На кубике ${value}` : 'Игровой кубик'}
    >
      <div className={`dice-3d-cube ${isRolling ? 'is-rolling' : ''}`} style={cubeStyle}>
        {visibleFaces.map((face) => (
          <span
            key={face.className}
            className={`dice-3d-face ${face.className}`}
            aria-hidden="true"
          >
            <img
              src={getPublicUrl(`/runtime/cube_B_v001/faces/dice_face_${face.value}.png`)}
              alt=""
              draggable={false}
            />
          </span>
        ))}
      </div>
    </div>
  );
}
