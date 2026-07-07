// Pure scoring functions for the matching engine (backend-prd.md "Matching
// algorithm — v1"). No I/O — fully unit-testable, target 100% coverage.
// The AI extension point (semanticScore) slots in as another weighted term
// without changing this interface.

export interface MatchWeights {
  proximity: number;
  keyword: number;
  trust: number;
  urgency: number;
}

export const DEFAULT_WEIGHTS: MatchWeights = {
  proximity: 0.4,
  keyword: 0.3,
  trust: 0.2,
  urgency: 0.1,
};

// Deadlines within this window ramp urgency from 0 up to 1.
export const URGENCY_WINDOW_DAYS = 14;

export interface RawCandidate {
  distanceMetres: number;
  maxDistanceKm: number;
  keywordRank: number;
  trustScore: number;
}

export interface CandidateScores {
  proximityScore: number;
  keywordScore: number;
  trustScoreAtMatch: number;
  urgencyScore: number;
  compositeScore: number;
}

function clamp01(value: number): number {
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

// Closer is better: 1 at the origin, 0 at the edge of the buyer's radius.
export function proximityScore(distanceMetres: number, maxDistanceKm: number): number {
  if (maxDistanceKm <= 0) return 0;
  const distanceKm = distanceMetres / 1000;
  return clamp01(1 - distanceKm / maxDistanceKm);
}

// 0 without a deadline; ramps to 1 as the deadline approaches (and stays 1
// once passed).
export function urgencyScore(
  deadlineAt: Date | null,
  now: Date,
  windowDays: number = URGENCY_WINDOW_DAYS,
): number {
  if (!deadlineAt) return 0;
  const daysUntil = (deadlineAt.getTime() - now.getTime()) / 86_400_000;
  if (daysUntil <= 0) return 1;
  return clamp01(1 - daysUntil / windowDays);
}

export function scoreCandidate(
  candidate: RawCandidate,
  deadlineAt: Date | null,
  weights: MatchWeights,
  now: Date = new Date(),
): CandidateScores {
  const proximity = proximityScore(candidate.distanceMetres, candidate.maxDistanceKm);
  // ts_rank is unbounded-ish but small; clamp so it can't dominate the sum.
  const keyword = clamp01(candidate.keywordRank);
  const trust = clamp01(candidate.trustScore);
  const urgency = urgencyScore(deadlineAt, now);

  const composite =
    weights.proximity * proximity +
    weights.keyword * keyword +
    weights.trust * trust +
    weights.urgency * urgency;

  return {
    proximityScore: proximity,
    keywordScore: keyword,
    trustScoreAtMatch: trust,
    urgencyScore: urgency,
    compositeScore: composite,
  };
}
