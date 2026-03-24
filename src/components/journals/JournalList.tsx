'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import JournalCard from '@/components/journals/JournalCard';
import JournalListSkeleton from '@/components/journals/JournalListSkeleton';
import type { JournalDateRangeFilter } from '@/lib/journals/types';
import { useJournalListInfinite } from '@/lib/journals/use-journal-queries';

export default function JournalList(): React.ReactElement {
  const [searchInput, setSearchInput] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [dateRange, setDateRange] = useState<JournalDateRangeFilter>('all');
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handle: ReturnType<typeof setTimeout> = setTimeout(() => {
      setDebouncedSearch(searchInput);
    }, 300);
    return () => {
      clearTimeout(handle);
    };
  }, [searchInput]);

  const filters = useMemo(
    () => ({ q: debouncedSearch, range: dateRange }),
    [debouncedSearch, dateRange]
  );

  const { data, isLoading, isFetchingNextPage, fetchNextPage, hasNextPage, isError, error } =
    useJournalListInfinite(filters);

  const items = useMemo(() => data?.pages.flatMap((p) => p.items) ?? [], [data]);

  const onIntersect = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries;
      if (!entry?.isIntersecting || !hasNextPage || isFetchingNextPage) {
        return;
      }
      void fetchNextPage();
    },
    [fetchNextPage, hasNextPage, isFetchingNextPage]
  );

  useEffect(() => {
    const node = loadMoreRef.current;
    if (!node) {
      return;
    }
    const observer = new IntersectionObserver(onIntersect, { rootMargin: '120px' });
    observer.observe(node);
    return () => {
      observer.disconnect();
    };
  }, [onIntersect]);

  return (
    <section className="page journalPage">
      <div className="rowBetween">
        <h1 className="title journalTitle">Your Journals</h1>
        <Link className="navLink" href="/dashboard">
          Today
        </Link>
      </div>
      <p className="subtitle journalSubtitle">Browse past entries, search, and filter by time.</p>

      <label className="journalSearchLabel">
        <span className="visuallyHidden">Search journals</span>
        <input
          className="journalSearchInput"
          type="search"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search in notes or prompts…"
          autoComplete="off"
        />
      </label>

      <div className="segmented journalRange" role="group" aria-label="Date range">
        {(
          [
            { value: '7d' as const, label: '7 days' },
            { value: '30d' as const, label: '30 days' },
            { value: 'all' as const, label: 'All' }
          ] as const
        ).map((opt) => (
          <button
            key={opt.value}
            type="button"
            className={`segmentButton ${dateRange === opt.value ? 'segmentButtonSelected' : ''}`}
            onClick={() => setDateRange(opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {isError ? (
        <p className="errorText" role="alert">
          {error instanceof Error ? error.message : 'Could not load journals.'}
        </p>
      ) : null}

      {isLoading ? <JournalListSkeleton /> : null}

      {!isLoading && items.length === 0 && !isError ? (
        <div className="journalEmpty cardBlock">
          <p className="journalEmptyTitle">No entries yet</p>
          <p className="mutedText">
            When you submit from the dashboard, entries appear here. Try a different filter or search.
          </p>
          <Link className="secondaryButton journalEmptyCta" href="/dashboard">
            Go to dashboard
          </Link>
        </div>
      ) : null}

      {!isLoading && items.length > 0 ? (
        <ul className="journalList">
          {items.map((journal) => (
            <li key={journal.id} className="journalListItem">
              <JournalCard journal={journal} />
            </li>
          ))}
        </ul>
      ) : null}

      <div ref={loadMoreRef} className="journalLoadSentinel" aria-hidden="true" />

      {isFetchingNextPage ? (
        <p className="mutedText journalLoadingMore">Loading more…</p>
      ) : null}
    </section>
  );
}
