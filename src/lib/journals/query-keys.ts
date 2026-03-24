import type { JournalDateRangeFilter } from '@/lib/journals/types';

export type JournalListFilters = {
  readonly q: string;
  readonly range: JournalDateRangeFilter;
};

export const journalQueryKeys = {
  all: ['journals'] as const,
  lists: (): readonly ['journals', 'list'] => [...journalQueryKeys.all, 'list'] as const,
  list: (filters: JournalListFilters): readonly ['journals', 'list', JournalListFilters] => [
    ...journalQueryKeys.all,
    'list',
    filters
  ],
  details: (): readonly ['journals', 'detail'] => [...journalQueryKeys.all, 'detail'] as const,
  detail: (id: string): readonly ['journals', 'detail', string] => [
    ...journalQueryKeys.all,
    'detail',
    id
  ]
};
