import type {
  GameStatus,
  VisitMode,
  VisitStatus,
  VisitSource,
  RollType,
  RollResultType,
} from '../types';
import { CELLS } from './cells';
import { isPlaytest } from './playtest';

// Отдельные ключи для предпросмотра в кабинете — не пересекаются с данными кабинета
const STORAGE_KEY = 'preview-men-path-state';
const STORAGE_VISITS = 'preview-men-path-visits';
const STORAGE_ROLLS = 'preview-men-path-rolls';
const STORAGE_REFLECTIONS = 'preview-men-path-reflections';
const STORAGE_CLOCK_OFFSET = 'preview-men-path-clock-offset';

export const CELL_EXPERIENCE_HOURS = 12;

export function getClockOffset(): number {
  if (typeof window === 'undefined') return 0;
  const raw = localStorage.getItem(STORAGE_CLOCK_OFFSET);
  return raw ? Number(raw) || 0 : 0;
}

export function setClockOffset(ms: number): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_CLOCK_OFFSET, String(ms));
}

export function getNow(): Date {
  return new Date(Date.now() + getClockOffset());
}

export interface GameState {
  gameId: string;
  status: GameStatus;
  initialQuery: string;
  currentCellId: number;
  bonusRollCredits: number;
  nextRollAt: string | null;
  holdingReason: 'no_move' | null;
  startedAt: string;
  queryConfirmedAt: string | null;
}

export interface VisitRecord {
  visitId: string;
  cellId: number;
  source: VisitSource;
  startedAt: string;
  unlockAt: string;
  completedAt: string | null;
  status: VisitStatus;
  visitMode: VisitMode;
  gameVisitCount: number;
  actionAcceptedAt: string | null;
  actionCompletedAt: string | null;
  notificationSentAt: string | null;
}

export type ReflectionPhase = 'initial' | 'final';

export interface ReflectionRecord {
  contentVersion?: string;
  reflectionId: string;
  gameId: string;
  visitId: string;
  cellId: number;
  questionId: string;
  questionText: string;
  challengeText: string;
  phase: ReflectionPhase;
  answerText: string;
  createdAt: string;
  lockedAt: string;
}

export interface RollRecord {
  rollId: string;
  dieValue: number;
  rollType: RollType;
  resultType: RollResultType;
  landedCell: number | null;
  bonusGenerated: boolean;
  createdAt: string;
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
}

function now(): string {
  return getNow().toISOString();
}

function addHours(dateStr: string, hours: number): string {
  if (isPlaytest) return dateStr;
  const d = new Date(dateStr);
  d.setHours(d.getHours() + hours);
  return d.toISOString();
}

// --- Persistence ---

export function getGame(): GameState | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function saveGame(game: GameState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(game));
}

export function getVisits(): VisitRecord[] {
  const raw = localStorage.getItem(STORAGE_VISITS);
  const visits: VisitRecord[] = raw ? JSON.parse(raw) : [];
  return visits.map((visit) => ({
    ...visit,
    actionAcceptedAt: visit.actionAcceptedAt ?? null,
    actionCompletedAt: visit.actionCompletedAt ?? null,
    notificationSentAt: visit.notificationSentAt ?? null,
  }));
}

export function saveVisits(visits: VisitRecord[]): void {
  localStorage.setItem(STORAGE_VISITS, JSON.stringify(visits));
}

export function getRolls(): RollRecord[] {
  const raw = localStorage.getItem(STORAGE_ROLLS);
  return raw ? JSON.parse(raw) : [];
}

export function saveRolls(rolls: RollRecord[]): void {
  localStorage.setItem(STORAGE_ROLLS, JSON.stringify(rolls));
}

export function getReflections(): ReflectionRecord[] {
  const raw = localStorage.getItem(STORAGE_REFLECTIONS);
  const reflections: ReflectionRecord[] = raw ? JSON.parse(raw) : [];
  return reflections.map((reflection) => ({
    ...reflection,
    questionText: reflection.questionText ?? '',
    challengeText: reflection.challengeText ?? '',
  }));
}

function saveReflections(reflections: ReflectionRecord[]): void {
  localStorage.setItem(STORAGE_REFLECTIONS, JSON.stringify(reflections));
}

export function devMoveToCell(targetCellId: number): void {
  const game = getGame();
  if (!game) return;
  const visits = getVisits();
  const visit: VisitRecord = {
    visitId: generateId(),
    cellId: targetCellId,
    source: 'dice',
    startedAt: now(),
    unlockAt: addHours(now(), CELL_EXPERIENCE_HOURS),
    completedAt: null,
    status: 'active',
    visitMode: 'introduction',
    gameVisitCount: 1,
    actionAcceptedAt: null,
    actionCompletedAt: null,
    notificationSentAt: null,
  };
  visits.push(visit);
  saveVisits(visits);
  game.currentCellId = targetCellId;
  game.status = 'active_cell';
  saveGame(game);
}

export function clearGame(): void {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(STORAGE_VISITS);
  localStorage.removeItem(STORAGE_ROLLS);
  localStorage.removeItem(STORAGE_REFLECTIONS);
}

// --- Game Lifecycle ---

export function createGame(initialQuery: string): GameState {
  const game: GameState = {
    gameId: generateId(),
    status: 'waiting_birth',
    initialQuery,
    currentCellId: 0,
    bonusRollCredits: 0,
    nextRollAt: null,
    holdingReason: null,
    startedAt: now(),
    queryConfirmedAt: now(),
  };
  saveGame(game);
  saveVisits([]);
  saveRolls([]);
  saveReflections([]);
  return game;
}

// --- Dice Logic ---

function randomDie(): number {
  return Math.floor(Math.random() * 6) + 1;
}

/**
 * Opening the Path should still feel like a roll, without making a new player
 * repeat the same screen for an arbitrary amount of time. The chance of a six
 * grows after every failed birth roll and the fourth attempt is guaranteed.
 */
function randomBirthDie(previousBirthRolls: number): number {
  const sixChances = [0.4, 0.6, 0.8, 1];
  const sixChance = sixChances[Math.min(previousBirthRolls, sixChances.length - 1)];

  if (Math.random() < sixChance) return 6;
  return Math.floor(Math.random() * 5) + 1;
}

export interface RollResult {
  dieValue: number;
  resultType: RollResultType;
  landedCell: number | null;
  bonusGenerated: boolean;
  newStatus: GameStatus;
  message?: string;
}

export function rollBirthDice(): RollResult {
  const game = getGame();
  if (!game || game.status !== 'waiting_birth') {
    throw new Error('Game not in waiting_birth state');
  }

  const rolls = getRolls();
  const previousBirthRolls = rolls.filter((roll) => roll.rollType === 'birth').length;
  const dieValue = randomBirthDie(previousBirthRolls);
  const roll: RollRecord = {
    rollId: generateId(),
    dieValue,
    rollType: 'birth',
    resultType: dieValue === 6 ? 'birth_success' : 'birth_failed',
    landedCell: dieValue === 6 ? 1 : null,
    bonusGenerated: false,
    createdAt: now(),
  };

  rolls.push(roll);
  saveRolls(rolls);

  if (dieValue === 6) {
    const visit: VisitRecord = {
      visitId: generateId(),
      cellId: 1,
      source: 'birth',
      startedAt: now(),
      unlockAt: addHours(now(), CELL_EXPERIENCE_HOURS),
      completedAt: null,
      status: 'active',
      visitMode: 'introduction',
      gameVisitCount: 1,
      actionAcceptedAt: null,
      actionCompletedAt: null,
      notificationSentAt: null,
    };
    saveVisits([visit]);

    game.status = 'active_cell';
    game.currentCellId = 1;
    game.startedAt = now();
    saveGame(game);

    return {
      dieValue,
      resultType: 'birth_success',
      landedCell: 1,
      bonusGenerated: false,
      newStatus: 'active_cell',
      message: 'Путь открыт. Ты на клетке 1 — Рождение.',
    };
  }

  return {
    dieValue,
    resultType: 'birth_failed',
    landedCell: null,
    bonusGenerated: false,
    newStatus: 'waiting_birth',
    message: 'Путь ещё не открыт. Брось снова.',
  };
}

export function rollDice(): RollResult {
  const game = getGame();
  if (!game) throw new Error('No active game');

  if (!canRoll(game)) {
    throw new Error('Cannot roll now');
  }

  const isBonus = game.status === 'ready_bonus_roll';
  const dieValue = randomDie();
  const current = game.currentCellId;
  const candidate = current + dieValue;

  if (isBonus) {
    game.bonusRollCredits = 0;
  }

  if (candidate > 72) {
    const roll: RollRecord = {
      rollId: generateId(),
      dieValue,
      rollType: isBonus ? 'bonus' : 'normal',
      resultType: 'no_move',
      landedCell: null,
      bonusGenerated: false,
      createdAt: now(),
    };
    const rolls = getRolls();
    rolls.push(roll);
    saveRolls(rolls);

    game.nextRollAt = addHours(now(), CELL_EXPERIENCE_HOURS);
    game.holdingReason = 'no_move';
    game.status = 'waiting_roll';
    saveGame(game);

    return {
      dieValue,
      resultType: 'no_move',
      landedCell: null,
      bonusGenerated: false,
      newStatus: 'waiting_roll',
      message: 'Ты остаёшься здесь ещё на один цикл.',
    };
  }

  const bonusGenerated = dieValue === 6;
  if (bonusGenerated) {
    game.bonusRollCredits = 1;
  }

  const roll: RollRecord = {
    rollId: generateId(),
    dieValue,
    rollType: isBonus ? 'bonus' : 'normal',
    resultType: 'move',
    landedCell: candidate,
    bonusGenerated,
    createdAt: now(),
  };
  const rolls = getRolls();
  rolls.push(roll);
  saveRolls(rolls);

  const visits = getVisits();
  const cellVisits = visits.filter(v => v.cellId === candidate);
  let visitMode: VisitMode = 'introduction';
  if (cellVisits.length === 1) visitMode = 'return';
  else if (cellVisits.length >= 2) visitMode = 'node';

  const visit: VisitRecord = {
    visitId: generateId(),
    cellId: candidate,
    source: isBonus ? 'bonus' : 'dice',
    startedAt: now(),
    unlockAt: addHours(now(), CELL_EXPERIENCE_HOURS),
    completedAt: null,
    status: 'active',
    visitMode,
    gameVisitCount: cellVisits.length + 1,
    actionAcceptedAt: null,
    actionCompletedAt: null,
    notificationSentAt: null,
  };
  visits.push(visit);
  saveVisits(visits);

  game.currentCellId = candidate;
  game.status = 'active_cell';
  game.nextRollAt = null;
  game.holdingReason = null;
  saveGame(game);

  return {
    dieValue,
    resultType: 'move',
    landedCell: candidate,
    bonusGenerated,
    newStatus: 'active_cell',
    message: `Переход на клетку ${candidate}.`,
  };
}

// --- Visit Experience ---

export function getVisitReflections(visitId: string): ReflectionRecord[] {
  return getReflections().filter((reflection) => reflection.visitId === visitId);
}

export function beginVisitExperience(
  visitId: string,
  questionId: string,
  questionText: string,
  challengeText: string,
  answerText: string,
): VisitRecord {
  const game = getGame();
  if (!game) throw new Error('No active game');

  const answer = answerText.trim();
  if (!answer) throw new Error('Initial reflection is required');

  const visits = getVisits();
  const visit = visits.find((item) => item.visitId === visitId);
  if (!visit) throw new Error('Visit not found');
  if (visit.completedAt) throw new Error('Visit already completed');
  if (visit.actionAcceptedAt) throw new Error('Visit experience already started');

  const reflections = getReflections();
  const duplicate = reflections.some(
    (reflection) => reflection.visitId === visitId && reflection.phase === 'initial',
  );
  if (duplicate) throw new Error('Initial reflection already exists');

  const acceptedAt = now();
  reflections.push({
    reflectionId: generateId(),
    gameId: game.gameId,
    visitId,
    cellId: visit.cellId,
    questionId,
    questionText,
    challengeText,
    phase: 'initial',
    contentVersion: CELLS.find(c => c.id === visit.cellId)?.contentVersion,
    answerText: answer,
    createdAt: acceptedAt,
    lockedAt: acceptedAt,
  });
  saveReflections(reflections);

  visit.actionAcceptedAt = acceptedAt;
  visit.unlockAt = addHours(acceptedAt, CELL_EXPERIENCE_HOURS);
  visit.status = 'active';
  saveVisits(visits);

  return visit;
}

export function getInitialReflection(visitId: string): ReflectionRecord | null {
  return getVisitReflections(visitId).find((reflection) => reflection.phase === 'initial') ?? null;
}

export function getFinalReflection(visitId: string): ReflectionRecord | null {
  return getVisitReflections(visitId).find((reflection) => reflection.phase === 'final') ?? null;
}

// --- Visit Completion ---

export function completeVisit(
  visitId: string,
  questionId: string,
  questionText: string,
  challengeText: string,
  finalAnswerText: string,
): { success: boolean; transition?: { type: 'support' | 'breakdown'; from: number; to: number }; message: string } {
  const game = getGame();
  if (!game) throw new Error('No active game');

  const finalAnswer = finalAnswerText.trim();
  if (!finalAnswer) throw new Error('Final reflection is required');

  const visits = getVisits();
  const visit = visits.find(v => v.visitId === visitId);
  if (!visit) throw new Error('Visit not found');
  if (visit.status !== 'active' && visit.status !== 'eligible') {
    throw new Error('Visit not completable');
  }
  if (!visit.actionAcceptedAt || !getInitialReflection(visitId)) {
    throw new Error('Initial reflection is required');
  }

  const nowStr = now();
  if (new Date(nowStr) < new Date(visit.unlockAt)) {
    throw new Error(`${CELL_EXPERIENCE_HOURS} hours not passed`);
  }

  const reflections = getReflections();
  const duplicate = reflections.some(
    (reflection) => reflection.visitId === visitId && reflection.phase === 'final',
  );
  if (duplicate) throw new Error('Final reflection already exists');

  reflections.push({
    reflectionId: generateId(),
    gameId: game.gameId,
    visitId,
    cellId: visit.cellId,
    questionId,
    questionText,
    challengeText,
    phase: 'final',
    contentVersion: getInitialReflection(visitId)?.contentVersion ?? CELLS.find(c => c.id === visit.cellId)?.contentVersion,
    answerText: finalAnswer,
    createdAt: nowStr,
    lockedAt: nowStr,
  });
  saveReflections(reflections);

  visit.status = 'completed';
  visit.actionCompletedAt = nowStr;
  visit.completedAt = nowStr;
  saveVisits(visits);

  const cell = CELLS.find((c: any) => c.id === visit.cellId);

  if (cell && cell.transitionType !== 'none' && cell.transitionTarget) {
    game.status = 'transition_pending';
    saveGame(game);
    return {
      success: true,
      transition: {
        type: cell.transitionType as 'support' | 'breakdown',
        from: visit.cellId,
        to: cell.transitionTarget,
      },
      message: cell.transitionType === 'support' ? 'Опора обнаружена.' : 'Срыв.',
    };
  }

  if (visit.cellId === 68) {
    game.status = 'finished';
    saveGame(game);
    return {
      success: true,
      message: 'Путь завершён. Опора достигнута.',
    };
  }

  if (game.bonusRollCredits > 0) {
    game.status = 'ready_bonus_roll';
  } else {
    game.status = 'ready_to_roll';
  }
  saveGame(game);

  return {
    success: true,
    message: 'Клетка прожита. Готов к следующему броску.',
  };
}

// --- Transition Acceptance ---

export function acceptTransition(fromCellId: number): void {
  const game = getGame();
  if (!game || game.status !== 'transition_pending') {
    throw new Error('No pending transition');
  }

  const cell = CELLS.find((c: any) => c.id === fromCellId);
  if (!cell || cell.transitionType === 'none' || !cell.transitionTarget) {
    throw new Error('No transition defined for this cell');
  }

  const targetCellId = cell.transitionTarget;
  const visits = getVisits();
  const cellVisits = visits.filter(v => v.cellId === targetCellId);
  let visitMode: VisitMode = 'introduction';
  if (cellVisits.length === 1) visitMode = 'return';
  else if (cellVisits.length >= 2) visitMode = 'node';

  const visit: VisitRecord = {
    visitId: generateId(),
    cellId: targetCellId,
    source: cell.transitionType === 'support' ? 'support' : 'breakdown',
    startedAt: now(),
    unlockAt: addHours(now(), CELL_EXPERIENCE_HOURS),
    completedAt: null,
    status: 'active',
    visitMode,
    gameVisitCount: cellVisits.length + 1,
    actionAcceptedAt: null,
    actionCompletedAt: null,
    notificationSentAt: null,
  };
  visits.push(visit);
  saveVisits(visits);

  game.currentCellId = targetCellId;
  game.status = 'active_cell';
  saveGame(game);
}

// --- Queries ---

export function canRoll(game: GameState): boolean {
  if (game.status === 'waiting_roll' && game.nextRollAt) {
    return getNow() >= new Date(game.nextRollAt);
  }
  return ['ready_to_roll', 'ready_bonus_roll', 'waiting_birth'].includes(game.status);
}

export function getCurrentVisit(): VisitRecord | null {
  const visits = getVisits();
  return visits.length > 0 ? visits[visits.length - 1] : null;
}

export function getVisitCount(cellId: number): number {
  return getVisits().filter(v => v.cellId === cellId).length;
}

export function isVisitUnlocked(visit: VisitRecord): boolean {
  return getNow() >= new Date(visit.unlockAt);
}

export function getGameStats() {
  const game = getGame();
  const visits = getVisits();
  const rolls = getRolls();
  if (!game) return null;

  const uniqueCells = new Set(visits.map(v => v.cellId)).size;
  const supports = visits.filter(v => v.source === 'support').length;
  const breakdowns = visits.filter(v => v.source === 'breakdown').length;
  const nodes = visits.filter(v => v.visitMode === 'node').length;

  return {
    currentCell: game.currentCellId,
    status: game.status,
    daysInPath: Math.floor((Date.now() - new Date(game.startedAt).getTime()) / (1000 * 60 * 60 * 24)),
    totalVisits: visits.length,
    uniqueCells,
    totalRolls: rolls.length,
    supports,
    breakdowns,
    nodes,
    bonusCredits: game.bonusRollCredits,
  };
}
