/**
 * SkillDuels Socket Event Payload Types & Game Error Codes
 */

export const QUESTIONS_PER_MATCH = 5;
export const REMATCH_TTL_MS = 15000;
export const MAX_REMATCHES_PER_PAIR_PER_DAY = 5;

export type MatchErrorCode = 'CATEGORY_HAS_NO_QUESTIONS' | 'CATEGORY_NOT_ENOUGH_QUESTIONS';

export interface MatchErrorPayload {
  code: MatchErrorCode;
  message: string;
  category: string;
  available?: number;
  required?: number;
}

export interface FindOpponentPayload {
  category: string;
}

export interface SanitizedQuestion {
  id: string;
  questionNumber: number;
  totalQuestions: number;
  category: string;
  prompt: string;
  options: string[];
  timeLimit: number;
  points: number;
}

export interface MatchOpponent {
  userId: string;
  username: string;
}

export interface MatchFoundPayload {
  matchId: string;
  category: string;
  totalQuestions: number;
  opponent: MatchOpponent;
  questions?: SanitizedQuestion[];
}

export interface CategoryItem {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  questionCount: number;
  playable: boolean;
  isActive?: boolean;
}

export interface RematchOfferedPayload {
  matchId: string;
  from: string;
  expiresInMs: number;
}

export interface RematchWaitingPayload {
  matchId: string;
}

export type RematchCancelReason = 'declined' | 'expired' | 'left' | 'limit' | 'unavailable';

export interface RematchCancelledPayload {
  matchId: string;
  reason: RematchCancelReason;
}

export interface RematchRequestPayload {
  matchId: string;
}

export interface RematchDeclinePayload {
  matchId: string;
}

export interface ServerToClientEvents {
  matchFound: (data: MatchFoundPayload) => void;
  match_start: (data: MatchFoundPayload) => void;
  matchError: (data: MatchErrorPayload) => void;
  queue_error: (data: MatchErrorPayload) => void;
  rematchOffered: (data: RematchOfferedPayload) => void;
  rematchWaiting: (data: RematchWaitingPayload) => void;
  rematchCancelled: (data: RematchCancelledPayload) => void;
}

export interface ClientToServerEvents {
  findOpponent: (data: FindOpponentPayload) => void;
  rematchRequest: (data: RematchRequestPayload) => void;
  rematchDecline: (data: RematchDeclinePayload) => void;
}
