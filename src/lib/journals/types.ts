export type JournalDateRangeFilter = '7d' | '30d' | 'all';

export type JournalRow = {
  id: string;
  user_id: string;
  content: string;
  prompt: string;
  mood: string | null;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
};

export type JournalListItemDto = Pick<
  JournalRow,
  'id' | 'content' | 'prompt' | 'mood' | 'is_pinned' | 'created_at' | 'updated_at'
>;

export type JournalListResponse = {
  items: JournalListItemDto[];
  hasMore: boolean;
  nextOffset: number;
};

export type JournalDetailResponse = {
  journal: JournalRow;
};

export type JournalPatchBody = {
  content?: string;
  prompt?: string;
  mood?: string | null;
  is_pinned?: boolean;
};
