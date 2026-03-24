import type { MoodHistoryPoint } from '@/lib/journaling/types';

type MoodLogRow = {
  date: string;
  mood_score: number;
};

export function aggregateMoodHistoryPoints(logRows: MoodLogRow[]): MoodHistoryPoint[] {
  type Acc = { sum: number; count: number };
  const accumulator: Record<string, Acc> = {};

  logRows.forEach((logRow: MoodLogRow) => {
    const logDate: string = logRow.date;
    const current: Acc | undefined = accumulator[logDate];
    const next: Acc = current
      ? { sum: current.sum + logRow.mood_score, count: current.count + 1 }
      : { sum: logRow.mood_score, count: 1 };
    accumulator[logDate] = next;
  });

  return Object.keys(accumulator)
    .sort()
    .map((date: string) => {
      const item: Acc = accumulator[date];
      return { date, averageScore: item.sum / item.count };
    });
}

