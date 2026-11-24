import { useEffect, useMemo, useState } from 'react';

import type { Cell } from '../types';
import { CELL_EXPERIENCE_HOURS, getInitialReflection, getReflections, getNow, type VisitRecord } from '../lib/game';
import { isPlaytest } from '../lib/playtest';
import { getCellIconPath, getCellImagePath } from '../lib/cellImages';
import { getPublicUrl } from '../lib/assets';
import type { ReminderStatus } from '../lib/reminders';

type CellStage = 'short' | 'full' | 'initial' | 'waiting' | 'final';

const FINAL_QUESTION = isPlaytest ? 'Что ты сделал? Что произошло и что стало понятнее?' : `Что ты заметил за ${CELL_EXPERIENCE_HOURS} часов? Что сделал и что изменилось в понимании твоего запроса?`;

interface CellViewProps {
  cell: Cell;
  visit: VisitRecord;
  isUnlocked: boolean;
  onBeginExperience: (questionId: string, questionText: string, challengeText: string, answer: string) => void;
  onComplete: (questionId: string, questionText: string, challengeText: string, answer: string) => void;
  onBack: () => void;
  reminderStatus?: ReminderStatus;
}

function getQuestion(cell: Cell, visit: VisitRecord): string {
  if (visit.visitMode === 'node') {
    return cell.nodeQuestions?.[0] ?? cell.questions[0] ?? 'Что эта клетка показывает тебе сейчас?';
  }
  if (visit.visitMode === 'return') {
    return cell.repeatQuestions?.[0] ?? cell.questions[0] ?? 'Что изменилось с прошлого посещения?';
  }
  return cell.questions[0] ?? 'Что эта клетка показывает тебе сейчас?';
}

function toHtml(value: string): string {
  return value.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br/>');
}

function formatRemaining(unlockAt: string, timestamp: number): string {
  const remaining = Math.max(0, new Date(unlockAt).getTime() - timestamp);
  const hours = Math.floor(remaining / 3_600_000);
  const minutes = Math.floor((remaining % 3_600_000) / 60_000);
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

export function CellView({
  cell: originalCell,
  visit,
  isUnlocked,
  onBeginExperience,
  onComplete,
  onBack,
  reminderStatus = 'unknown',
}: CellViewProps) {
  const cell = originalCell;
  const repeated = isPlaytest && visit.visitMode !== 'introduction';
  const challenge = repeated
    ? `${visit.visitMode === 'node' ? 'Сравни доступные прошлые попытки. Повторное попадание не доказывает, что ты делаешь что-то неправильно. Выбери одно условие, которое попробуешь изменить.' : 'Прочитай прошлый итог и выбери, что продолжить, упростить или изменить.'}\n\nНебольшая проба по теме: ${cell.challenge}\n\nПеред началом допиши: «В этот раз я сделаю… с учётом того, что раньше заметил…». Если прошлой записи нет, начни с нынешней ситуации.`
    : cell.challenge;
  const finalQuestion = repeated
    ? `Что я попробовал иначе по теме «${cell.subtitle}»? Чем результат отличается от прошлых попыток и что беру дальше?`
    : cell.finalQuestion || FINAL_QUESTION;
  const initialStage: CellStage = visit.actionAcceptedAt
    ? isUnlocked ? 'final' : 'waiting'
    : 'short';
  const [stage, setStage] = useState<CellStage>(initialStage);
  const [answer, setAnswer] = useState('');
  const [timestamp, setTimestamp] = useState(getNow().getTime());
  const [error, setError] = useState('');
  const [action, setAction] = useState('');
  const [actionDone, setActionDone] = useState(false);
  const previous = isPlaytest ? getReflections().filter(r => r.cellId === cell.id && r.visitId !== visit.visitId && r.phase === 'final') : [];

  useEffect(() => {
    setStage(visit.actionAcceptedAt ? (isUnlocked ? 'final' : 'waiting') : 'short');
    setAnswer('');
    setError('');
    setAction('');
    setActionDone(false);
  }, [visit.visitId, visit.actionAcceptedAt, isUnlocked]);

  useEffect(() => {
    if (stage !== 'waiting') return;
    const interval = window.setInterval(() => setTimestamp(getNow().getTime()), 1_000);
    return () => window.clearInterval(interval);
  }, [stage]);

  useEffect(() => {
    if (stage === 'waiting' && timestamp >= new Date(visit.unlockAt).getTime()) {
      setStage('final');
      setAnswer('');
    }
  }, [stage, timestamp, visit.unlockAt]);

  const primaryQuestion = useMemo(() => getQuestion(cell, visit), [cell, visit]);
  const initialReflection = getInitialReflection(visit.visitId);
  const cellImage = getCellImagePath(cell.id);
  const cellImageUrl = cellImage ? getPublicUrl(cellImage) : null;
  const cellIcon = getCellIconPath(cell.id);
  const cellIcon2x = getCellIconPath(cell.id, true);
  const cellIconUrl = cellIcon ? getPublicUrl(cellIcon) : null;
  const cellIcon2xUrl = cellIcon2x ? getPublicUrl(cellIcon2x) : null;
  const visitLabel = visit.visitMode === 'introduction'
    ? 'Знакомство'
    : visit.visitMode === 'return' ? 'Возврат' : 'Узел';

  const submitInitial = () => {
    if (!answer.trim()) {
      setError('Запиши первичное наблюдение, чтобы начать проживание клетки.');
      return;
    }
    if (isPlaytest && !action.trim()) { setError('Запиши выбранное действие.'); return; }
    try {
      onBeginExperience(
        `cell-${cell.id}-${visit.visitMode}-initial`,
        primaryQuestion,
        isPlaytest ? action.trim() : challenge,
        answer,
      );
    } catch {
      setError('Не удалось сохранить ответ. Попробуй ещё раз.');
    }
  };

  const submitFinal = () => {
    if (isPlaytest && !actionDone) { setError('Подтверди, что выполнил выбранное действие.'); return; }
    if (!answer.trim()) {
      setError('Запиши итоговую рефлексию, чтобы завершить клетку.');
      return;
    }
    try {
      onComplete(
        `cell-${cell.id}-${visit.visitMode}-final`,
        finalQuestion,
        isPlaytest ? initialReflection?.challengeText || cell.challenge : cell.challenge,
        answer,
      );
    } catch {
      setError('Не удалось завершить клетку. Проверь время и попробуй ещё раз.');
    }
  };

  return (
    <section className="gameplay-screen min-h-[calc(100dvh-72px)] px-5 pb-7 pt-[calc(env(safe-area-inset-top)+26px)]">
      <header className="mb-5 flex items-center justify-between">
        <button onClick={onBack} className="gameplay-back">← Путь</button>
        <span className="gameplay-eyebrow">КЛЕТКА {cell.id} · {visitLabel.toUpperCase()}</span>
      </header>
      {isPlaytest && <p className="mb-4 text-xs text-muted">Проба без ожидания · рабочая редакция всех 72 клеток</p>}
      {previous.length > 0 && <aside className="gameplay-card mb-4">
        <h2>{previous.length === 1 ? 'Твой прошлый итог' : 'Твои прошлые итоги'}</h2>
        {previous.map((reflection, index) => <div key={reflection.reflectionId} className={index ? 'mt-4 border-t border-bronze/20 pt-4' : 'mt-3'}>
          <p className="text-xs text-muted">Попытка {index + 1}</p>
          <p className="mt-1 whitespace-pre-wrap">Действие: {reflection.challengeText}</p>
          <p className="mt-2 whitespace-pre-wrap">Итог: {reflection.answerText}</p>
        </div>)}
      </aside>}

      {stage === 'short' && (
        <div className="flex min-h-[680px] flex-col">
          <div>
            <h1 className="gameplay-title">{cell.kempName}</h1>
            {cell.subtitle && <p className="mt-1 text-sm text-muted">{cell.subtitle}</p>}
          </div>

          <div className={`cell-visual relative mt-5 flex min-h-[260px] items-center justify-center overflow-hidden${cellIconUrl ? ' cell-visual--icon' : ''}`}>
            {cellIconUrl ? (
              <img
                src={cellIconUrl}
                srcSet={cellIcon2xUrl ? `${cellIconUrl} 1x, ${cellIcon2xUrl} 2x` : undefined}
                alt=""
                className="cell-visual__icon"
              />
            ) : cellImageUrl ? (
              <img src={cellImageUrl} alt="" className="absolute inset-0 h-full w-full object-cover opacity-55" />
            ) : null}
            <span className={`cell-visual__number${cellIconUrl ? ' cell-visual__number--icon' : ' relative'}`}>{cell.id}</span>
          </div>

          <div
            className="mt-5 line-clamp-[8] text-[15px] leading-[1.55] text-bone/88"
            dangerouslySetInnerHTML={{ __html: toHtml(cell.shortText) }}
          />

          <div className="mt-auto pt-7">
            <button onClick={() => setStage('full')} className="gameplay-primary-button">Читать полностью</button>
            <button onClick={onBack} className="gameplay-secondary-button">Вернуться к пути</button>
          </div>
        </div>
      )}

      {stage === 'full' && (
        <div className="flex min-h-[680px] flex-col">
          <div>
            <h1 className="gameplay-title">{cell.kempName}</h1>
            <p className="mt-2 text-sm text-muted">Полное содержание клетки</p>
          </div>

          <div className="mt-5 space-y-3 pb-6">
            <article className="gameplay-card">
              <span className="gameplay-card__label">СМЫСЛ</span>
              <p className="mt-2 whitespace-pre-line text-[15px] leading-[1.58] text-bone/90">{cell.fullText}</p>
            </article>
            {cell.queryConnection && (
              <article className="gameplay-card">
                <span className="gameplay-card__label">СВЯЗЬ С ТВОИМ ЗАПРОСОМ</span>
                <p
                  className="mt-2 text-[15px] leading-[1.55] text-bone/88"
                  dangerouslySetInnerHTML={{ __html: toHtml(cell.queryConnection) }}
                />
              </article>
            )}
            <article className="gameplay-card">
              <span className="gameplay-card__label">ВОПРОС</span>
              <p className="mt-2 text-[15px] leading-[1.5] text-bone">{primaryQuestion}</p>
            </article>
            <article className="gameplay-card gameplay-card--accent">
              <span className="gameplay-card__label">{isPlaytest ? 'ДЕЙСТВИЕ ДЛЯ ПРОБЫ' : `ДЕЙСТВИЕ НА ${CELL_EXPERIENCE_HOURS} ЧАСОВ`}</span>
              <p className="mt-2 whitespace-pre-line text-[15px] leading-[1.55] text-bone">{challenge}</p>
            </article>
            {isPlaytest && cell.challengeAlternative && <article className="gameplay-card"><span className="gameplay-card__label">ЕСЛИ ДЕЙСТВИЕ НЕ ПОДХОДИТ</span><p className="mt-2 text-[15px] leading-[1.55]">{cell.challengeAlternative}</p></article>}
            {cell.formula && (
              <blockquote className="border-l border-bronze/70 py-1 pl-4 font-heading text-[16px] leading-[1.5] text-bronze">
                {cell.formula.replace(/\*\*/g, '')}
              </blockquote>
            )}
          </div>

          <div className="sticky bottom-0 mt-auto bg-gradient-to-t from-ink via-ink to-transparent pt-5">
            <button
              onClick={() => setStage(visit.actionAcceptedAt ? (isUnlocked ? 'final' : 'waiting') : 'initial')}
              className="gameplay-primary-button"
            >
              {visit.actionAcceptedAt ? 'Вернуться к проживанию' : 'Перейти к рефлексии'}
            </button>
          </div>
        </div>
      )}

      {stage === 'initial' && (
        <div className="flex min-h-[680px] flex-col">
          <div>
            <p className="gameplay-eyebrow">ПЕРВИЧНАЯ РЕФЛЕКСИЯ</p>
            <h1 className="gameplay-title mt-2">Запиши наблюдение</h1>
          </div>
          <article className="gameplay-card mt-5">
            <span className="gameplay-card__label">ВОПРОС</span>
            <p className="mt-2 text-[16px] leading-[1.5] text-bone">{primaryQuestion}</p>
          </article>
          <label className="mt-4 block">
            <span className="sr-only">Первичная рефлексия</span>
            <textarea
              value={answer}
              onChange={(event) => { setAnswer(event.target.value); setError(''); }}
              placeholder="Что ты видишь и понимаешь сейчас?"
              className="reflection-textarea min-h-[220px]"
            />
          </label>
          <article className="gameplay-card gameplay-card--accent mt-4">
            <span className="gameplay-card__label">{isPlaytest ? 'ТВОЁ ДЕЙСТВИЕ' : `ТВОЁ ДЕЙСТВИЕ НА ${CELL_EXPERIENCE_HOURS} ЧАСОВ`}</span>
            <p className="mt-2 whitespace-pre-line text-[15px] leading-[1.5] text-bone">{challenge}</p>
          </article>
          {isPlaytest && cell.challengeAlternative && <p className="mt-3 text-sm text-muted">{cell.challengeAlternative}</p>}
          {isPlaytest && <label className="mt-4 block">Какое действие ты выбираешь?<textarea aria-label="Выбранное действие" className="reflection-textarea" value={action} onChange={e => setAction(e.target.value)} /></label>}
          {error && <p role="alert" className="mt-3 text-sm text-[#d8887e]">{error}</p>}
          <div className="mt-auto pt-6">
            <button onClick={submitInitial} className="gameplay-primary-button">{isPlaytest ? 'Сохранить действие' : `Принять действие на ${CELL_EXPERIENCE_HOURS} часов`}</button>
            <button onClick={() => setStage('full')} className="gameplay-secondary-button">Назад к клетке</button>
          </div>
        </div>
      )}

      {stage === 'waiting' && (
        <div className="flex min-h-[680px] flex-col">
          <div>
            <p className="gameplay-eyebrow">КЛЕТКА ПРОЖИВАЕТСЯ</p>
            <h1 className="gameplay-title mt-2">{cell.kempName}</h1>
          </div>
          <div className="experience-timer mt-8 text-center">
            <span className="text-xs tracking-[0.16em] text-muted">ДО ИТОГОВОЙ РЕФЛЕКСИИ</span>
            <strong className="mt-3 block font-heading text-[42px] font-medium text-bone">
              {formatRemaining(visit.unlockAt, timestamp)}
            </strong>
            <span className="mt-1 block text-sm text-muted">часов · минут</span>
          </div>
          <article className="gameplay-card mt-6">
            <span className="gameplay-card__label">ПЕРВИЧНОЕ НАБЛЮДЕНИЕ</span>
            <p className="mt-2 whitespace-pre-line text-[15px] leading-[1.55] text-bone/90">{initialReflection?.answerText}</p>
          </article>
          <article className="gameplay-card gameplay-card--accent mt-3">
            <span className="gameplay-card__label">ДЕЙСТВИЕ НА {CELL_EXPERIENCE_HOURS} ЧАСОВ</span>
            <p className="mt-2 text-[15px] leading-[1.5] text-bone">{cell.challenge}</p>
          </article>
          <p className="mt-4 text-center text-sm leading-[1.5] text-muted">
            {reminderStatus === 'scheduled' && 'Напоминания включены: бот напишет через 6 часов, через 12 часов и повторно через сутки, если итог ещё не заполнен.'}
            {reminderStatus === 'unavailable' && 'Открой игру из Telegram, чтобы включить напоминания бота.'}
            {reminderStatus === 'error' && 'Не удалось включить Telegram-напоминания. Прогресс сохранён; попробуй снова, открыв игру из Telegram.'}
            {reminderStatus === 'unknown' && 'Подключаем Telegram-напоминания…'}
          </p>
          <div className="mt-auto pt-7">
            <button onClick={onBack} className="gameplay-primary-button">Вернуться на Путь</button>
            <button onClick={() => setStage('full')} className="gameplay-secondary-button">Читать клетку</button>
          </div>
        </div>
      )}

      {stage === 'final' && (
        <div className="flex min-h-[680px] flex-col">
          {isPlaytest && <article className="gameplay-card mb-4"><h2>Выбранное действие</h2><p>{initialReflection?.challengeText}</p><label className="mt-4 flex gap-3"><input type="checkbox" checked={actionDone} onChange={e=>setActionDone(e.target.checked)} />Я выполнил выбранное действие или письменную альтернативу</label></article>}
          <div>
            <p className="gameplay-eyebrow">ИТОГОВАЯ РЕФЛЕКСИЯ</p>
            <h1 className="gameplay-title mt-2">Заверши клетку</h1>
          </div>
          <article className="gameplay-card mt-5">
            <span className="gameplay-card__label">ТВОЁ ПЕРВОЕ НАБЛЮДЕНИЕ</span>
            <p className="mt-2 whitespace-pre-line text-[15px] leading-[1.55] text-bone/80">{initialReflection?.answerText}</p>
          </article>
          <article className="gameplay-card mt-3">
            <span className="gameplay-card__label">ИТОГОВЫЙ ВОПРОС</span>
            <p className="mt-2 text-[16px] leading-[1.5] text-bone">
              {finalQuestion}
            </p>
          </article>
          <label className="mt-4 block">
            <span className="sr-only">Итоговая рефлексия</span>
            <textarea
              value={answer}
              onChange={(event) => { setAnswer(event.target.value); setError(''); }}
              placeholder={isPlaytest ? 'Запиши результат действия...' : `Запиши, что произошло за эти ${CELL_EXPERIENCE_HOURS} часов...`}
              className="reflection-textarea min-h-[210px]"
            />
          </label>
          {error && <p role="alert" className="mt-3 text-sm text-[#d8887e]">{error}</p>}
          <div className="mt-auto pt-7">
            <button onClick={submitFinal} className="gameplay-primary-button">Завершить клетку</button>
          </div>
        </div>
      )}
    </section>
  );
}
