import type { MoodScore } from '@/lib/journaling/types';

export function parseMoodScore(input: unknown): MoodScore | null {
  if (typeof input !== 'number' || !Number.isFinite(input)) {
    return null;
  }

  const asInteger: number = Math.floor(input);
  if (asInteger < 1 || asInteger > 5) {
    return null;
  }

  if (asInteger !== input) {
    return null;
  }

  return asInteger as MoodScore;
}

