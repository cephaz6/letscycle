import { describe, expect, it } from 'vitest';
import {
  TRUST_BASE,
  TRUST_IMPACT,
  computeTrustScore,
  reviewEventType,
} from './scorer.js';

describe('computeTrustScore', () => {
  it('is the neutral base with no events', () => {
    const result = computeTrustScore([]);
    expect(result.currentScore).toBe(TRUST_BASE);
    expect(result.scoreComponents).toEqual({ base: TRUST_BASE });
  });

  it('adds positive impacts and breaks them down by factor', () => {
    const result = computeTrustScore([
      { eventType: 'successfulTransaction', impact: TRUST_IMPACT.successfulTransaction },
      { eventType: 'successfulTransaction', impact: TRUST_IMPACT.successfulTransaction },
      { eventType: 'positiveReview', impact: TRUST_IMPACT.positiveReview },
    ]);
    expect(result.currentScore).toBeCloseTo(0.5 + 0.05 + 0.05 + 0.04, 6);
    expect(result.scoreComponents.successfulTransaction).toBeCloseTo(0.1, 6);
    expect(result.scoreComponents.positiveReview).toBeCloseTo(0.04, 6);
  });

  it('applies negative impacts', () => {
    const result = computeTrustScore([
      { eventType: 'negativeReview', impact: TRUST_IMPACT.negativeReview },
      { eventType: 'disputeLost', impact: TRUST_IMPACT.disputeLost },
    ]);
    expect(result.currentScore).toBeCloseTo(0.5 - 0.08 - 0.2, 6);
  });

  it('clamps to [0,1]', () => {
    const many = Array.from({ length: 20 }, () => ({
      eventType: 'successfulTransaction' as const,
      impact: TRUST_IMPACT.successfulTransaction,
    }));
    expect(computeTrustScore(many).currentScore).toBe(1);

    const badly = Array.from({ length: 10 }, () => ({
      eventType: 'disputeLost' as const,
      impact: TRUST_IMPACT.disputeLost,
    }));
    expect(computeTrustScore(badly).currentScore).toBe(0);
  });
});

describe('reviewEventType', () => {
  it('maps ratings to review event types', () => {
    expect(reviewEventType(5)).toBe('positiveReview');
    expect(reviewEventType(4)).toBe('positiveReview');
    expect(reviewEventType(3)).toBeNull();
    expect(reviewEventType(2)).toBe('negativeReview');
    expect(reviewEventType(1)).toBe('negativeReview');
  });
});
