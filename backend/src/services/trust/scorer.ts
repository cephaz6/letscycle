import type { TrustEventType } from './trust.types.js';

// Pure trust scoring (backend-prd.md: "Trust score computed from verified
// events"). New users start neutral; each verified event nudges the score.
// No I/O — fully unit-testable, target 100% coverage.

export const TRUST_BASE = 0.5;

// Default score impact per event type, applied when the event is recorded.
export const TRUST_IMPACT: Record<TrustEventType, number> = {
  successfulTransaction: 0.05,
  positiveReview: 0.04,
  negativeReview: -0.08,
  idVerified: 0.1,
  noShow: -0.15,
  disputeLost: -0.2,
  flagged: -0.1,
};

function clamp01(value: number): number {
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

// Avoids floating-point drift when summing many small impacts.
function round(value: number): number {
  return Math.round(value * 1e6) / 1e6;
}

export interface ScoredTrust {
  currentScore: number;
  scoreComponents: Record<string, number>;
}

// Aggregates the stored impacts of a user's trust events into a 0-1 score and
// a per-factor breakdown (starting from the neutral base).
export function computeTrustScore(
  events: { eventType: TrustEventType; impact: number }[],
): ScoredTrust {
  const scoreComponents: Record<string, number> = { base: TRUST_BASE };
  let total = TRUST_BASE;

  for (const event of events) {
    scoreComponents[event.eventType] = round(
      (scoreComponents[event.eventType] ?? 0) + event.impact,
    );
    total = round(total + event.impact);
  }

  return { currentScore: clamp01(total), scoreComponents };
}

// The default impact for a review depends on its rating: 4-5 positive, 1-2
// negative, 3 neutral (no event recorded).
export function reviewEventType(rating: number): TrustEventType | null {
  if (rating >= 4) return 'positiveReview';
  if (rating <= 2) return 'negativeReview';
  return null;
}
