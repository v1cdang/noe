export type MoodScore = 1 | 2 | 3 | 4 | 5;

export type PromptSource = 'global' | 'custom';

export type PromptDto = {
  id: string;
  promptText: string;
  category: string | null;
  source: PromptSource;
};

export type TodayPromptResponse = {
  userIsPremium: boolean;
  prompts: PromptDto[];
};

export type SubmitMoodResponse = {
  ok: true;
  logId: string;
};

export type MoodHistoryPoint = {
  date: string; // YYYY-MM-DD
  averageScore: number;
};

export type MoodHistoryResponse = {
  points: MoodHistoryPoint[];
};

export type UpgradeResponse = {
  ok: true;
};

