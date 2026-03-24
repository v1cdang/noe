import type { MoodScore } from '@/lib/journaling/types';

const SCORE_TO_EMOJI: Record<MoodScore, string> = {
  1: '😞',
  2: '😕',
  3: '😐',
  4: '🙂',
  5: '😄'
};

/**
 * Maps a mood score to the same emoji used in the mood picker for journal storage.
 */
export function getMoodEmojiForScore(moodScore: MoodScore): string {
  return SCORE_TO_EMOJI[moodScore];
}
