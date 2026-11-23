import { useEffect, useState } from 'react';
import { getPublicUrl } from '../lib/assets';
import { getCellById } from '../lib/cells';

interface TransitionScreenProps {
  transition: { type: 'support' | 'breakdown'; from: number; to: number };
  onAccept: () => void;
}

export function TransitionScreen({ transition, onAccept }: TransitionScreenProps) {
  const fromCell = getCellById(transition.from);
  const toCell = getCellById(transition.to);
  const isSupport = transition.type === 'support';
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      className={`min-h-[60dvh] flex flex-col items-center justify-center py-8 px-safe transition-all duration-700 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
    >
      {/* Atmosphere container */}
      <div
        className={`relative w-full max-w-sm rounded-card p-6 border-2 overflow-hidden bg-cover bg-center ${
          isSupport ? 'border-olive/60' : 'border-red/50'
        }`}
        style={{
          backgroundImage: `url(${getPublicUrl(`/textures/${isSupport ? 'support_background_390x844.png' : 'breakdown_background_390x844.png'}`)})`,
        }}
      >
        {/* Decorative line — up for support, down for breakdown */}
        <div
          className={`pointer-events-none absolute left-1/2 -translate-x-1/2 w-px transition-all duration-700 ${
            isSupport
              ? 'top-0 h-16 bg-gradient-to-b from-bronze via-olive to-transparent'
              : 'bottom-0 h-16 bg-gradient-to-t from-red via-copper to-transparent'
          }`}
        />

        {/* Title */}
        <h2
          className={`font-heading text-display text-center mb-6 pt-4 ${
            isSupport ? 'text-olive' : 'text-red'
          }`}
        >
          {isSupport ? 'ОПОРА' : 'СРЫВ'}
        </h2>

        {/* Arrow visualization */}
        <div className="flex items-center justify-center gap-4 mb-6">
          <div className="text-center">
            <span className="text-caption text-muted block mb-1">{transition.from}</span>
            <span className="text-body text-bone/80">{fromCell?.kempName}</span>
          </div>

          <div className={`flex flex-col items-center ${isSupport ? 'animate-bounce' : 'animate-pulse'}`}>
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                isSupport
                  ? 'border-olive bg-olive/20 text-olive'
                  : 'border-red bg-red/20 text-red'
              }`}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                {isSupport ? (
                  <path d="M12 19V5M5 12l7-7 7 7" />
                ) : (
                  <path d="M12 5v14M5 12l7 7 7-7" />
                )}
              </svg>
            </div>
          </div>

          <div className="text-center">
            <span className="text-caption text-muted block mb-1">{transition.to}</span>
            <span className="text-body text-bone/80">{toCell?.kempName}</span>
          </div>
        </div>

        {/* Explanation */}
        {fromCell?.transitionExplanation ? (
          <p className="text-body text-bone/80 text-center mb-6 leading-relaxed px-2">
            {fromCell.transitionExplanation}
          </p>
        ) : (
          <p className="text-body text-muted text-center mb-6 leading-relaxed px-2">
            {isSupport
              ? `${fromCell?.kempName} открывает путь к ${toCell?.kempName}. Это усиление.`
              : `${fromCell?.kempName} возвращает к ${toCell?.kempName}. Это часть маршрута — материал для работы.`}
          </p>
        )}

        {/* CTA */}
        <button
          onClick={onAccept}
          className={`w-full min-h-cta font-heading text-h2 rounded-card transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] ${
            isSupport
              ? 'bg-gradient-to-r from-olive to-olive/80 text-bone shadow-lg shadow-olive/20'
              : 'bg-gradient-to-r from-red to-red/80 text-bone shadow-lg shadow-red/20'
          }`}
        >
          {isSupport ? `Подняться на клетку ${transition.to}` : `Спуститься на клетку ${transition.to}`}
        </button>
      </div>
    </div>
  );
}
