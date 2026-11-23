export type GameStatus =
  | 'draft'
  | 'waiting_birth'
  | 'active_cell'
  | 'awaiting_completion'
  | 'ready_to_roll'
  | 'ready_bonus_roll'
  | 'transition_pending'
  | 'waiting_roll'
  | 'paused'
  | 'finished'
  | 'archived';

export type VisitMode = 'introduction' | 'return' | 'node';
export type VisitStatus = 'active' | 'eligible' | 'correction' | 'completed';
export type ChallengeStatus = 'pending' | 'completed' | 'alternative' | 'failed';
export type TransitionType = 'none' | 'support' | 'breakdown';
export type RollType = 'birth' | 'normal' | 'bonus';
export type RollResultType = 'move' | 'no_move' | 'birth_failed' | 'birth_success';
export type VisitSource = 'birth' | 'dice' | 'bonus' | 'support' | 'breakdown';

export interface Cell {
  id: number;
  classicName: string;
  kempName: string;
  subtitle: string;
  shortText: string;
  fullText: string;
  persona: string;
  shadow: string;
  support: string;
  queryConnection: string;
  questions: string[];
  repeatQuestions?: string[];
  nodeQuestions?: string[];
  challenge: string;
  challengeAlternative?: string;
  finalQuestion?: string;
  contentVersion?: string;
  formula: string;
  tags?: string[];
  transitionType: TransitionType;
  transitionTarget: number | null;
  transitionExplanation?: string;
}

export interface Visit {
  visitId: string;
  gameId: string;
  cellId: number;
  source: VisitSource;
  previousVisitId?: string;
  previousCellId?: number;
  rollId?: string;
  gameVisitCount: number;
  lifetimeVisitCount: number;
  visitMode: VisitMode;
  startedAt: string;
  unlockAt: string;
  fullTextOpenedAt?: string;
  status: VisitStatus;
  challengeStatus: ChallengeStatus;
  challengeNote?: string;
  correctionAction?: string;
  correctionUnlockAt?: string;
  completedAt?: string;
  reflections: Reflection[];
}

export interface Reflection {
  reflectionId: string;
  visitId: string;
  questionId: string;
  answerText: string;
  visibility: 'private' | 'shared_captain' | 'shared_leader';
  createdAt: string;
  updatedAt: string;
  lockedAt?: string;
}

export interface Roll {
  rollId: string;
  gameId: string;
  fromCell?: number;
  dieValue: number;
  rollType: RollType;
  resultType: RollResultType;
  landedCell?: number;
  bonusGenerated: boolean;
  idempotencyKey: string;
  createdAt: string;
}

export interface Transition {
  transitionId: string;
  gameId: string;
  sourceVisitId: string;
  fromCell: number;
  toCell: number;
  type: 'support' | 'breakdown';
  acceptedAt?: string;
  createdAt: string;
}

export interface Game {
  gameId: string;
  userId: string;
  initialQuery: string;
  queryConfirmedAt?: string;
  status: GameStatus;
  currentCellId: number;
  activeVisitId?: string;
  bonusRollCredits: number;
  nextRollAt?: string;
  holdingReason?: 'no_move' | null;
  startedAt?: string;
  pausedAt?: string;
  totalPausedSeconds: number;
  finishedAt?: string;
  createdAt: string;
}
