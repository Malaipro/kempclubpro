/**
 * MenPathPreview — предпросмотр игры «Путь Мужчины» в кабинете КЭМП.
 *
 * Маршрут: /app/preview/men-path (только в DEV, аналогично CheckinsPreview)
 * Источник механики: Malaipro/put-muzhchiny @ 4cee101
 * Хранение: localStorage с ключами preview-men-path-* (не пересекается с кабинетом)
 * Таймер: 12 часов (CELL_EXPERIENCE_HOURS)
 * Telegram: все TG-вызовы заглушены — функции возвращают no-op
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getGame,
  createGame,
  rollBirthDice,
  rollDice,
  beginVisitExperience,
  completeVisit,
  acceptTransition,
  getCurrentVisit,
  isVisitUnlocked,
  getGameStats,
  getInitialReflection,
  getVisits,
  clearGame,
  getClockOffset,
  setClockOffset,
  getNow,
  devMoveToCell,
  type GameState,
  type RollResult,
} from './lib/game';
import { getCellById } from './lib/cells';
import { Onboarding } from './components/Onboarding';
import { DiceIdleScreen } from './components/DiceIdleScreen';
import { DesignedBoard } from './components/DesignedBoard';
import { CellView } from './components/CellView';
import { DiceResultScreen } from './components/DiceResultScreen';
import { TransitionScreen } from './components/TransitionScreen';
import { BottomNav, type NavSection } from './components/BottomNav';
import { PassportScreen } from './components/PassportScreen';
import { SectionPlaceholder } from './components/SectionPlaceholder';
import { ReflectionsScreen } from './components/ReflectionsScreen';
import { RulesScreen } from './components/RulesScreen';
import './MenPathPreview.css';

// Telegram-функции заглушены — кабинет работает без TG
const noOp = () => {};
const initData = '';
// ReminderStatus заглушён: без initData уведомления всегда unavailable
type ReminderStatus = 'unavailable';
const reminderStatusStub: ReminderStatus = 'unavailable';

export default function MenPathPreview() {
  const [game, setGame] = useState<GameState | null>(getGame);
  const [screen, setScreen] = useState<string>('map');
  const [lastRoll, setLastRoll] = useState<RollResult | null>(null);
  const [transition, setTransition] = useState<{
    type: 'support' | 'breakdown';
    from: number;
    to: number;
  } | null>(null);

  const currentVisit = getCurrentVisit();

  useEffect(() => {
    const refreshed = getGame();
    setGame(refreshed);
    if (refreshed?.status === 'waiting_birth') {
      setScreen('waiting_birth');
    }
  }, []);

  const refreshGame = useCallback(() => {
    setGame(getGame());
  }, []);

  const handleCreateGame = (query: string) => {
    const g = createGame(query);
    setGame(g);
    setScreen('waiting_birth');
  };

  const handleRollBirth = () => {
    const result = rollBirthDice();
    setLastRoll(result);
    refreshGame();
    setScreen('dice_result');
  };

  const handleRollDice = () => {
    const result = rollDice();
    setLastRoll(result);
    refreshGame();
    setScreen('dice_result');
  };

  const handleBeginExperience = (
    visitId: string,
    questionId: string,
    questionText: string,
    challengeText: string,
    answer: string,
  ) => {
    beginVisitExperience(visitId, questionId, questionText, challengeText, answer);
    refreshGame();
    setScreen('map');
  };

  const handleCompleteVisit = (
    visitId: string,
    questionId: string,
    questionText: string,
    challengeText: string,
    answer: string,
  ) => {
    const result = completeVisit(visitId, questionId, questionText, challengeText, answer);
    refreshGame();
    if (result.transition) {
      setTransition(result.transition);
      setScreen('transition');
    } else if (result.message.includes('завершён')) {
      setScreen('passport');
    } else {
      setScreen('map');
    }
  };

  const handleResultContinue = () => {
    if (!lastRoll) return;
    if (lastRoll.resultType === 'move' || lastRoll.resultType === 'birth_success') {
      setScreen('cell');
      return;
    }
    if (lastRoll.resultType === 'birth_failed') {
      setLastRoll(null);
      setScreen('waiting_birth');
      return;
    }
    setScreen('map');
  };

  const handleAcceptTransition = (fromCellId: number) => {
    acceptTransition(fromCellId);
    setTransition(null);
    refreshGame();
    setScreen('cell');
  };

  const [clockOffset, setOffsetState] = useState(getClockOffset);

  const applyOffset = (ms: number) => {
    setClockOffset(ms);
    setOffsetState(ms);
    refreshGame();
  };

  const setClockBeforeUnlock = () => {
    const v = getCurrentVisit();
    if (!v?.unlockAt) return;
    const unlockTime = new Date(v.unlockAt).getTime();
    const target = unlockTime - 60_000; // за 1 минуту до разблокировки
    applyOffset(target - Date.now());
  };

  const setClockAfterUnlock = () => {
    const v = getCurrentVisit();
    if (!v?.unlockAt) return;
    const unlockTime = new Date(v.unlockAt).getTime();
    const target = unlockTime + 60_000; // через 1 минуту после разблокировки
    applyOffset(target - Date.now());
  };

  const resetClock = () => {
    applyOffset(0);
  };

  const handleTestSupport10 = () => {
    devMoveToCell(10);
    refreshGame();
    setScreen('cell');
  };

  const handleTestBreakdown12 = () => {
    devMoveToCell(12);
    refreshGame();
    setScreen('cell');
  };

  const handleReset = () => {
    clearGame();
    resetClock();
    setGame(null);
    setScreen('map');
    setLastRoll(null);
    setTransition(null);
  };

  return (
    <div className="men-path-preview v005-design min-h-dvh bg-ink text-bone flex flex-col">
      {/* Dev-banner с тестовыми часами (только в DEV) */}
      {import.meta.env.DEV && (
        <div className="men-path-dev-banner">
          <div className="flex flex-wrap items-center justify-between gap-1 text-[11px]">
            <span>Preview · put-muzhchiny@4cee101</span>
            {clockOffset !== 0 && (
              <span className="text-amber-400 font-mono text-[10px]">
                ⏱ {getNow().toLocaleTimeString('ru-RU')} ({clockOffset > 0 ? '+' : ''}{Math.round(clockOffset / 3600000)}ч)
              </span>
            )}
          </div>
          {game && (
            <div className="mt-1 flex flex-wrap gap-1 justify-center text-[10px]">
              {currentVisit && currentVisit.actionAcceptedAt && (
                <>
                  <button
                    onClick={setClockBeforeUnlock}
                    aria-label="За минуту до разблокировки"
                    className="px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-600 cursor-pointer"
                  >
                    ⏱ -1 мин до разблокировки
                  </button>
                  <button
                    onClick={setClockAfterUnlock}
                    aria-label="Через минуту после разблокировки"
                    className="px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-600 cursor-pointer"
                  >
                    ⏱ +1 мин после разблокировки
                  </button>
                  {clockOffset !== 0 && (
                    <button
                      onClick={resetClock}
                      aria-label="Сброс часов"
                      className="px-2 py-0.5 rounded bg-zinc-900 hover:bg-zinc-800 text-amber-300 border border-amber-600 cursor-pointer"
                    >
                      Сброс часов
                    </button>
                  )}
                </>
              )}
              <button
                onClick={handleTestSupport10}
                aria-label="Тест Опора клетка 10"
                className="px-2 py-0.5 rounded bg-emerald-950 hover:bg-emerald-900 text-emerald-200 border border-emerald-700 cursor-pointer"
              >
                Тест: Опора (10 → 23)
              </button>
              <button
                onClick={handleTestBreakdown12}
                aria-label="Тест Срыв клетка 12"
                className="px-2 py-0.5 rounded bg-red-950 hover:bg-red-900 text-red-200 border border-red-700 cursor-pointer"
              >
                Тест: Срыв (12 → 8)
              </button>
            </div>
          )}
        </div>
      )}

      <main className="flex-1 overflow-y-auto pb-[calc(72px+env(safe-area-inset-bottom))]">
        {!game && (
          <Onboarding onStart={handleCreateGame} />
        )}

        {game && screen === 'map' && (
          <div className="px-safe">
            <DesignedBoard
              game={game}
              currentVisit={getCurrentVisit()}
              onRoll={() => setScreen('dice')}
              onOpenRules={() => setScreen('rules')}
              onOpenCell={() => {
                const cell = game.currentCellId > 0 ? getCellById(game.currentCellId) : null;
                if (game.status === 'transition_pending' && cell?.transitionTarget) {
                  setTransition({
                    type: cell.transitionType as 'support' | 'breakdown',
                    from: cell.id,
                    to: cell.transitionTarget,
                  });
                  setScreen('transition');
                } else {
                  setScreen('cell');
                }
              }}
            />
          </div>
        )}

        {game && screen === 'dice' && (
          <DiceIdleScreen
            onRoll={game.status === 'waiting_birth' ? handleRollBirth : handleRollDice}
            onBack={() => setScreen('map')}
            canRoll={true}
            isBirth={game.status === 'waiting_birth'}
            onRules={() => setScreen('rules')}
          />
        )}

        {game && screen === 'dice_result' && lastRoll && (
          <DiceResultScreen result={lastRoll} onContinue={handleResultContinue} />
        )}

        {game && screen === 'cell' && (() => {
          const currentVisit = getCurrentVisit();
          const currentCell = game.currentCellId > 0 ? getCellById(game.currentCellId) : null;
          if (!currentCell || !currentVisit) return null;
          return (
            <CellView
              cell={currentCell}
              visit={currentVisit}
              isUnlocked={isVisitUnlocked(currentVisit)}
              onBeginExperience={(qId, qText, cText, ans) =>
                handleBeginExperience(currentVisit.visitId, qId, qText, cText, ans)
              }
              onComplete={(qId, qText, cText, ans) =>
                handleCompleteVisit(currentVisit.visitId, qId, qText, cText, ans)
              }
              onBack={() => setScreen('map')}
              reminderStatus={reminderStatusStub}
            />
          );
        })()}

        {game && screen === 'transition' && transition && (() => {
          const currentCell = game.currentCellId > 0 ? getCellById(game.currentCellId) : null;
          if (!currentCell) return null;
          return (
            <TransitionScreen
              transition={transition}
              onAccept={() => handleAcceptTransition(transition.from)}
            />
          );
        })()}

        {game && screen === 'passport' && (
          <div className="px-safe">
            <PassportScreen stats={getGameStats()} onNewGame={handleReset} />
          </div>
        )}

        {game && screen === 'cells' && (
          <div className="px-safe">
            <SectionPlaceholder
              eyebrow="72 КЛЕТКИ"
              title="Клетки Пути"
              description="Каталог клеток и история посещений."
              icon="/men-path/icons/nav_map.svg"
            />
          </div>
        )}

        {game && screen === 'reflections' && (
          <ReflectionsScreen />
        )}

        {game && screen === 'waiting_birth' && game.status === 'waiting_birth' && (
          <DiceIdleScreen
            onRoll={handleRollBirth}
            canRoll={true}
            isBirth={true}
            onRules={() => setScreen('rules')}
          />
        )}

        {game && screen === 'rules' && (
          <RulesScreen
            onBack={() =>
              setScreen(game.status === 'waiting_birth' ? 'waiting_birth' : 'map')
            }
          />
        )}
      </main>

      {game && (
        <BottomNav
          active={
            screen === 'cells'
              ? 'cells'
              : screen === 'reflections'
              ? 'reflections'
              : screen === 'passport'
              ? 'profile'
              : 'path'
          }
          onNavigate={(section: NavSection) => {
            if (section === 'path') setScreen('map');
            if (section === 'cells') setScreen('cells');
            if (section === 'reflections') setScreen('reflections');
            if (section === 'profile') setScreen('passport');
          }}
        />
      )}
    </div>
  );
}
