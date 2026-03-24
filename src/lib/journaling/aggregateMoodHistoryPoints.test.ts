import { aggregateMoodHistoryPoints } from '@/lib/journaling/aggregateMoodHistoryPoints';

describe('aggregateMoodHistoryPoints', () => {
  it('groups by date and computes daily average', () => {
    const points = aggregateMoodHistoryPoints([
      { date: '2026-03-22', mood_score: 2 },
      { date: '2026-03-21', mood_score: 4 },
      { date: '2026-03-21', mood_score: 2 }
    ]);

    expect(points).toEqual([
      { date: '2026-03-21', averageScore: 3 },
      { date: '2026-03-22', averageScore: 2 }
    ]);
  });

  it('returns an empty list when there are no logs', () => {
    const points = aggregateMoodHistoryPoints([]);
    expect(points).toEqual([]);
  });
});

