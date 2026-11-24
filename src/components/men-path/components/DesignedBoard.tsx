import { useEffect, useRef } from 'react';
import { canRoll, getVisits, type GameState, type VisitRecord } from '../lib/game';
import { getCellById } from '../lib/cells';
import { getPublicUrl } from '../lib/assets';
import { isPlaytest } from '../lib/playtest';

export function DesignedBoard({game, currentVisit, onRoll, onOpenCell, onOpenRules}: {game: GameState; currentVisit: VisitRecord | null; onRoll: () => void; onOpenCell: () => void; onOpenRules: () => void}) {
  const current = useRef<HTMLSpanElement>(null);
  useEffect(() => { current.current?.scrollIntoView({block:'nearest'}); }, [game.currentCellId]);
  const visits = getVisits();
  const cell = getCellById(game.currentCellId);
  const ready = canRoll(game);
  const rows = Array.from({length:8}, (_,r) => Array.from({length:9}, (_,c) => r*9+(r%2 ? 9-c : c+1)));
  return <section className="designed-board">
    <header className="board-header">
      <button type="button" onClick={onOpenRules} className="board-rules-button">Правила</button>
      <h1>Карта пути</h1><p>Путь Мужчины</p>
    </header>
    <div className="board-route" aria-label="Карта из 72 клеток">
      {rows.map((row,r) => <div className={`route-row ${r%2 ? 'reverse':''}`} key={r}>{row.map(id => {
        const info = getCellById(id);
        const state = id===game.currentCellId ? 'current' : visits.some(v=>v.cellId===id && v.completedAt) ? 'lived' : info?.transitionType==='support' ? 'support' : info?.transitionType==='breakdown' ? 'breakdown' : 'normal';
        return <span ref={id===game.currentCellId ? current : undefined} key={id} data-cell-id={id} aria-current={id===game.currentCellId ? 'step':undefined} className="route-cell" style={{backgroundImage:`url(${getPublicUrl(`/v005/cells/cell_${state}.png`)})`}}>{id}</span>;
      })}</div>)}
    </div>
    <footer className="board-footer"><div className="board-status"><p>Клетка {game.currentCellId || '—'} · {ready ? 'Путь открыт':'Текущая'}</p><h2>{cell?.kempName || 'Начало пути'}</h2><p>{game.status==='transition_pending' ? 'Подтверди переход после завершённой клетки.' : ready ? 'Можно бросать кубик.' : currentVisit?.actionAcceptedAt ? 'Выполни действие и сохрани итог.' : 'Открой клетку и выбери действие.'}</p></div>
      <button className="gameplay-primary-button" onClick={ready ? onRoll : onOpenCell}>{ready ? 'Бросить кубик' : game.status==='transition_pending' ? 'Открыть переход' : currentVisit?.actionAcceptedAt ? 'Записать итог' : 'Открыть клетку'}</button>
      {isPlaytest && <p className="playtest-note">Проба · без ожидания · тексты карты уточняются</p>}
    </footer>
  </section>;
}
