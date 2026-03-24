'use client';

import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData
} from '@tanstack/react-query';
import type {
  JournalDateRangeFilter,
  JournalDetailResponse,
  JournalListResponse,
  JournalPatchBody
} from '@/lib/journals/types';
import { journalQueryKeys, type JournalListFilters } from '@/lib/journals/query-keys';

const PAGE_SIZE: number = 15;

const UUID_RE: RegExp =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidJournalId(id: string): boolean {
  return UUID_RE.test(id);
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res: Response = await fetch(url, init);
  if (!res.ok) {
    const errBody: { error?: string; details?: string; code?: string } = (await res
      .json()
      .catch(() => ({}))) as { error?: string; details?: string; code?: string };
    const base: string = errBody.error ?? `Request failed (${res.status}).`;
    const suffix: string =
      errBody.details && errBody.details !== base ? ` — ${errBody.details}` : '';
    throw new Error(`${base}${suffix}`);
  }
  return (await res.json()) as T;
}

/**
 * Infinite list of journals with server-side search and date range filters.
 */
export function useJournalListInfinite(filters: JournalListFilters) {
  return useInfiniteQuery({
    queryKey: journalQueryKeys.list(filters),
    initialPageParam: 0,
    queryFn: async ({ pageParam }: { pageParam: number }): Promise<JournalListResponse> => {
      const params: URLSearchParams = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String(pageParam),
        range: filters.range
      });
      if (filters.q.trim().length > 0) {
        params.set('q', filters.q.trim());
      }
      return fetchJson<JournalListResponse>(`/api/journals?${params.toString()}`);
    },
    getNextPageParam: (lastPage: JournalListResponse): number | undefined =>
      lastPage.hasMore ? lastPage.nextOffset : undefined
  });
}

/**
 * Single journal for the detail screen.
 */
export function useJournalDetail(journalId: string) {
  return useQuery({
    queryKey: journalQueryKeys.detail(journalId),
    queryFn: async (): Promise<JournalDetailResponse> =>
      fetchJson<JournalDetailResponse>(`/api/journals/${journalId}`),
    enabled: isValidJournalId(journalId)
  });
}

function updateInfiniteCaches(
  queryClient: ReturnType<typeof useQueryClient>,
  updater: (page: JournalListResponse) => JournalListResponse
): void {
  queryClient.setQueriesData<InfiniteData<JournalListResponse, number>>(
    { queryKey: journalQueryKeys.lists() },
    (old: InfiniteData<JournalListResponse, number> | undefined) => {
      if (!old) {
        return old;
      }
      return {
        ...old,
        pages: old.pages.map((page) => updater(page))
      };
    }
  );
}

/**
 * Updates a journal with optimistic cache updates for list and detail.
 */
export function useUpdateJournal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; body: JournalPatchBody }): Promise<void> => {
      await fetchJson<{ ok: true }>(`/api/journals/${input.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input.body)
      });
    },
    onMutate: async (input: { id: string; body: JournalPatchBody }) => {
      await queryClient.cancelQueries({ queryKey: journalQueryKeys.detail(input.id) });
      await queryClient.cancelQueries({ queryKey: journalQueryKeys.lists() });
      const previousDetail: JournalDetailResponse | undefined = queryClient.getQueryData(
        journalQueryKeys.detail(input.id)
      );
      if (previousDetail) {
        const nextJournal = { ...previousDetail.journal };
        if (typeof input.body.content === 'string') {
          nextJournal.content = input.body.content;
        }
        if (typeof input.body.prompt === 'string') {
          nextJournal.prompt = input.body.prompt;
        }
        if (input.body.mood === null || typeof input.body.mood === 'string') {
          nextJournal.mood = input.body.mood;
        }
        if (typeof input.body.is_pinned === 'boolean') {
          nextJournal.is_pinned = input.body.is_pinned;
        }
        queryClient.setQueryData<JournalDetailResponse>(journalQueryKeys.detail(input.id), {
          journal: nextJournal
        });
      }
      updateInfiniteCaches(queryClient, (page) => ({
        ...page,
        items: page.items.map((row) => {
          if (row.id !== input.id) {
            return row;
          }
          const next = { ...row };
          if (typeof input.body.content === 'string') {
            next.content = input.body.content;
          }
          if (typeof input.body.prompt === 'string') {
            next.prompt = input.body.prompt;
          }
          if (input.body.mood === null || typeof input.body.mood === 'string') {
            next.mood = input.body.mood;
          }
          if (typeof input.body.is_pinned === 'boolean') {
            next.is_pinned = input.body.is_pinned;
          }
          return next;
        })
      }));
      return { previousDetail };
    },
    onError: (_err, input, context) => {
      if (context?.previousDetail) {
        queryClient.setQueryData(journalQueryKeys.detail(input.id), context.previousDetail);
      }
      void queryClient.invalidateQueries({ queryKey: journalQueryKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: journalQueryKeys.detail(input.id) });
    },
    onSettled: (_data, _err, input) => {
      void queryClient.invalidateQueries({ queryKey: journalQueryKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: journalQueryKeys.detail(input.id) });
    }
  });
}

/**
 * Deletes a journal with optimistic list removal.
 */
export function useDeleteJournal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      await fetchJson<{ ok: true }>(`/api/journals/${id}`, { method: 'DELETE' });
    },
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: journalQueryKeys.lists() });
      const previousLists = queryClient.getQueriesData<InfiniteData<JournalListResponse, number>>({
        queryKey: journalQueryKeys.lists()
      });
      updateInfiniteCaches(queryClient, (page) => ({
        ...page,
        items: page.items.filter((row) => row.id !== id)
      }));
      queryClient.removeQueries({ queryKey: journalQueryKeys.detail(id) });
      return { previousLists };
    },
    onError: (_err, _id, context) => {
      if (context?.previousLists) {
        for (const [key, data] of context.previousLists) {
          queryClient.setQueryData(key, data);
        }
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: journalQueryKeys.lists() });
    }
  });
}

export type { JournalDateRangeFilter };
