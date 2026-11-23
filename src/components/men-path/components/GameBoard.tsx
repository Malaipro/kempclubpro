import { useEffect, useState } from 'react';

import type { GameState, VisitRecord } from '../lib/game';
import { canRoll, CELL_EXPERIENCE_HOURS, getVisits, isVisitUnlocked } from '../lib/game';
import { getCellById } from '../lib/cells';
import { getPublicUrl } from '../lib/assets';

interface GameBoardProps {
  game: GameState;
  currentVisit: VisitRecord | null;
  onRoll: () => void;
  onOpenCell: () => void;
}

function formatTime(ms: number): string {
  const safe = Math.max(0, ms);
  const h = Math.floor(safe / 3_600_000);
  const m = Math.floor((safe % 3_600_000) / 60_000);
  const s = Math.floor((safe % 60_000) / 1000);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export function GameBoard({ game, currentVisit, onRoll, onOpenCell }: GameBoardProps) {
  const [timestamp, setTimestamp] = useState(Date.now());
  const visits = getVisits();
  const currentCell = game.currentCellId > 0 ? getCellById(game.currentCellId) : null;

  useEffect(() => {
    const interval = window.setInterval(() => setTimestamp(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  const visitedCells = new Set(visits.map((visit) => visit.cellId));
  const routeCells = visits.map((visit) => visit.cellId);
  const canRollNow = canRoll(game);
  const isWaitingRoll = game.status === 'waiting_roll' && game.nextRollAt;
  const waitTimeLeft = isWaitingRoll && game.nextRollAt
    ? new Date(game.nextRollAt).getTime() - timestamp
    : 0;
  const actionStarted = Boolean(currentVisit?.actionAcceptedAt);
  const visitUnlocked = currentVisit ? isVisitUnlocked(currentVisit) : false;

  const rows: number[][] = [];
  for (let row = 0; row < 8; row += 1) {
    const start = row * 9 + 1;
    const rowCells = Array.from({ length: 9 }, (_, index) => start + index);
    if (row % 2 === 1) rowCells.reverse();
    rows.push(rowCells);
  }

  const cellCta = !actionStarted
    ? 'Открыть клетку'
    : visitUnlocked ? 'Записать итог' : 'Открыть проживание';

  return (
    <div className="py-4">
      {currentCell && currentVisit && game.status === 'active_cell' && (
        <section className="mb-6 overflow-hidden rounded-card border border-copper/20 bg-graphite">
          <div className="p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-caption text-muted">Клетка {currentCell.id}</span>
              <span className={`rounded px-2 py-0.5 text-caption ${
                currentVisit.visitMode === 'node' ? 'bg-red/20 text-red' :
                  currentVisit.visitMode === 'return' ? 'bg-bronze/20 text-bronze' :
                    'bg-olive/20 text-olive'
              }`}>
                {currentVisit.visitMode === 'introduction' ? 'Знакомство' :
                  currentVisit.visitMode === 'return' ? 'Возврат' : 'Узел'}
              </span>
            </div>
            <h2 className="font-heading text-h1 text-bone">{currentCell.kempName}</h2>
            {currentCell.subtitle && <p className="mt-1 text-caption text-muted">{currentCell.subtitle}</p>}

            {!actionStarted && (
              <p className="mt-4 text-sm leading-relaxed text-bone/80">
                Прочитай смысл клетки, запиши первое наблюдение и выбери действие, которое проживёшь следующие {CELL_EXPERIENCE_HOURS} часов.
              </p>
            )}

            {actionStarted && !visitUnlocked && (
              <div className="experience-timer mt-4 text-center">
                <span className="text-[10px] tracking-[0.16em] text-muted">ДО ИТОГОВОЙ РЕФЛЕКСИИ</span>
                <strong className="mt-2 block font-heading text-[30px] font-medium text-bone">
                  {formatTime(new Date(currentVisit.unlockAt).getTime() - timestamp)}
                </strong>
              </div>
            )}

            {actionStarted && visitUnlocked && (
              <div className="mt-4 rounded-[10px] border border-bronze/40 bg-bronze/10 p-3">
                <p className="text-sm font-medium text-bronze">Время настало</p>
                <p className="mt-1 text-sm leading-relaxed text-bone/80">
                  Запиши, что произошло за {CELL_EXPERIENCE_HOURS} часов, и заверши клетку. После этого откроется следующий бросок.
                </p>
              </div>
            )}

            <button onClick={onOpenCell} className="gameplay-primary-button mt-4">
              {cellCta}
            </button>
          </div>
        </section>
      )}

      {canRollNow && game.status !== 'waiting_birth' && (
        <section className="mb-6 rounded-card border border-bronze/25 bg-graphite p-4 text-center">
          <p className="gameplay-eyebrow">СЛЕДУЮЩИЙ ШАГ</p>
          <h2 className="mt-2 font-heading text-h1 text-bone">Путь открыт</h2>
          <p className="mt-2 text-sm text-muted">Клетка завершена. Можно двигаться дальше.</p>
          <button onClick={onRoll} className="gameplay-primary-button mt-4">
            {game.status === 'ready_bonus_roll' ? 'Бонусный бросок' : 'Бросить кубик'}
          </button>
        </section>
      )}

      {isWaitingRoll && !canRollNow && (
        <section className="mb-6 rounded-card border border-copper/20 bg-graphite p-4 text-center">
          <p className="gameplay-eyebrow">ЕЩЁ ОДИН ЦИКЛ</p>
          <p className="mt-2 text-sm text-muted">До следующего броска</p>
          <strong className="mt-2 block font-heading text-[30px] text-bone">{formatTime(waitTimeLeft)}</strong>
        </section>
      )}

      <div
        className="rounded-card border border-copper/10 bg-cover bg-center p-3"
        style={{ backgroundImage: `url(${getPublicUrl('/screens/02_path_map.png')})` }}
      >
        <div className="rounded-card bg-graphite/55 p-3 backdrop-blur-[2px]">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-heading text-h2 text-bone">Карта Пути</h3>
            <span className="text-caption text-muted">{game.currentCellId > 0 ? `Текущая: ${game.currentCellId}` : 'Не начат'}</span>
          </div>
          <div className="grid grid-cols-9 gap-1">
            {rows.flat().map((cellId) => {
              const isCurrent = cellId === game.currentCellId;
              const isVisited = visitedCells.has(cellId);
              const cell = getCellById(cellId);
              const isSupport = cell?.transitionType === 'support';
              const isBreakdown = cell?.transitionType === 'breakdown';

              return (
                <span
                  key={cellId}
                  className={`flex aspect-square items-center justify-center rounded text-[10px] font-medium leading-none ${
                    isCurrent ? 'bg-bronze text-ink ring-2 ring-bronze/50' :
                      isBreakdown ? 'bg-red/30 text-red' :
                        isSupport ? 'bg-olive/30 text-olive' :
                          isVisited ? 'bg-copper/20 text-bone/70' : 'bg-ink text-muted/50'
                  }`}
                >
                  {cellId}
                </span>
              );
            })}
          </div>
          <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-caption text-muted">
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-bronze" />Текущая</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-olive" />Опора</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red" />Срыв</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-copper/40" />Посещена</span>
          </div>
        </div>
      </div>

      {routeCells.length > 0 && (
        <div className="mt-6 rounded-card border border-copper/10 bg-graphite/30 p-4">
          <h3 className="mb-3 font-heading text-h2 text-bone">Маршрут</h3>
          <div className="flex flex-wrap gap-1 text-caption">
            {routeCells.map((cellId, index) => (
              <span key={`${cellId}-${index}`} className="flex items-center">
                <span className={`rounded px-1.5 py-0.5 ${
                  cellId === game.currentCellId ? 'bg-bronze text-ink' : 'bg-graphite text-muted'
                }`}>
                  {cellId}
                </span>
                {index < routeCells.length - 1 && <span className="mx-0.5 text-muted">→</span>}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
