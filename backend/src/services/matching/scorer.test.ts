import { describe, expect, it } from 'vitest';
import {
  DEFAULT_WEIGHTS,
  proximityScore,
  scoreCandidate,
  urgencyScore,
} from './scorer.js';

describe('proximityScore', () => {
  it('is 1 at the origin and 0 at the radius edge', () => {
    expect(proximityScore(0, 10)).toBe(1);
    expect(proximityScore(10_000, 10)).toBe(0);
  });

  it('is linear in between', () => {
    expect(proximityScore(5_000, 10)).toBeCloseTo(0.5, 5);
  });

  it('clamps beyond the radius to 0', () => {
    expect(proximityScore(20_000, 10)).toBe(0);
  });

  it('guards against a non-positive radius', () => {
    expect(proximityScore(1_000, 0)).toBe(0);
    expect(proximityScore(1_000, -5)).toBe(0);
  });
});

describe('urgencyScore', () => {
  const now = new Date('2026-07-07T00:00:00Z');

  it('is 0 without a deadline', () => {
    expect(urgencyScore(null, now)).toBe(0);
  });

  it('is 1 once the deadline has passed', () => {
    expect(urgencyScore(new Date('2026-07-06T00:00:00Z'), now)).toBe(1);
  });

  it('ramps up as the deadline nears', () => {
    const sevenDays = new Date('2026-07-14T00:00:00Z');
    expect(urgencyScore(sevenDays, now)).toBeCloseTo(0.5, 5);
  });

  it('is ~0 for deadlines beyond the window', () => {
    const farOff = new Date('2026-08-30T00:00:00Z');
    expect(urgencyScore(farOff, now)).toBe(0);
  });
});

describe('scoreCandidate', () => {
  const now = new Date('2026-07-07T00:00:00Z');

  it('combines components as a weighted sum', () => {
    const scores = scoreCandidate(
      { distanceMetres: 0, maxDistanceKm: 10, keywordRank: 1, trustScore: 1 },
      null,
      DEFAULT_WEIGHTS,
      now,
    );
    // proximity 1, keyword 1, trust 1, urgency 0 -> 0.4+0.3+0.2 = 0.9
    expect(scores.compositeScore).toBeCloseTo(0.9, 5);
  });

  it('clamps keyword and trust into [0,1]', () => {
    const scores = scoreCandidate(
      { distanceMetres: 0, maxDistanceKm: 10, keywordRank: 5, trustScore: 2 },
      null,
      DEFAULT_WEIGHTS,
      now,
    );
    expect(scores.keywordScore).toBe(1);
    expect(scores.trustScoreAtMatch).toBe(1);
  });

  it('includes urgency when a deadline is set', () => {
    const scores = scoreCandidate(
      { distanceMetres: 10_000, maxDistanceKm: 10, keywordRank: 0, trustScore: 0 },
      new Date('2026-07-06T00:00:00Z'), // passed -> urgency 1
      DEFAULT_WEIGHTS,
      now,
    );
    expect(scores.urgencyScore).toBe(1);
    expect(scores.compositeScore).toBeCloseTo(0.1, 5);
  });
});
