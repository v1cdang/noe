import { parseMoodScore } from '@/lib/journaling/validateMoodScore';

describe('validateMoodScore', () => {
  it('parses valid integer mood scores', () => {
    expect(parseMoodScore(1)).toBe(1);
    expect(parseMoodScore(3)).toBe(3);
    expect(parseMoodScore(5)).toBe(5);
  });

  it('rejects out of range scores', () => {
    expect(parseMoodScore(0)).toBeNull();
    expect(parseMoodScore(6)).toBeNull();
    expect(parseMoodScore(-2)).toBeNull();
  });

  it('rejects non-integers and non-numbers', () => {
    expect(parseMoodScore(2.5)).toBeNull();
    expect(parseMoodScore(NaN)).toBeNull();
    expect(parseMoodScore('3')).toBeNull();
    expect(parseMoodScore(undefined)).toBeNull();
  });
});

