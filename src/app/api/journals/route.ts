import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/serverClient';
import type { JournalDateRangeFilter, JournalListResponse } from '@/lib/journals/types';
import { escapeIlikePattern } from '@/lib/journals/escape-ilike-pattern';
import { buildJournalDbErrorResponse } from '@/lib/journals/journal-db-error';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const DEFAULT_PAGE_SIZE: number = 15;
const MAX_PAGE_SIZE: number = 50;

function parseLimit(raw: string | null): number {
  if (!raw) {
    return DEFAULT_PAGE_SIZE;
  }
  const n: number = Number(raw);
  if (!Number.isFinite(n) || n < 1) {
    return DEFAULT_PAGE_SIZE;
  }
  return Math.min(Math.floor(n), MAX_PAGE_SIZE);
}

function parseOffset(raw: string | null): number {
  if (!raw) {
    return 0;
  }
  const n: number = Number(raw);
  if (!Number.isFinite(n) || n < 0) {
    return 0;
  }
  return Math.floor(n);
}

function parseDateRange(raw: string | null): JournalDateRangeFilter {
  if (raw === '7d' || raw === '30d' || raw === 'all') {
    return raw;
  }
  return 'all';
}

function getRangeStartIso(range: JournalDateRangeFilter): string | null {
  if (range === 'all') {
    return null;
  }
  const days: number = range === '7d' ? 7 : 30;
  const start: Date = new Date();
  start.setUTCDate(start.getUTCDate() - days);
  return start.toISOString();
}

export async function GET(req: NextRequest): Promise<NextResponse<JournalListResponse | { error: string }>> {
  const { supabase, applyCookieWrites } = await createSupabaseServerClient();
  const url: URL = new URL(req.url);
  const limit: number = parseLimit(url.searchParams.get('limit'));
  const offset: number = parseOffset(url.searchParams.get('offset'));
  const qRaw: string | null = url.searchParams.get('q');
  const range: JournalDateRangeFilter = parseDateRange(url.searchParams.get('range'));

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    const unauth = NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    applyCookieWrites(unauth);
    return unauth;
  }

  const userId: string = userData.user.id;
  const rangeStart: string | null = getRangeStartIso(range);
  const searchTrimmed: string = typeof qRaw === 'string' ? qRaw.trim() : '';
  let listQuery = supabase
    .from('journals')
    .select('id,content,prompt,mood,is_pinned,created_at,updated_at')
    .eq('user_id', userId);

  if (rangeStart) {
    listQuery = listQuery.gte('created_at', rangeStart);
  }

  if (searchTrimmed.length > 0) {
    const escaped: string = escapeIlikePattern(searchTrimmed);
    listQuery = listQuery.or(`content.ilike.%${escaped}%,prompt.ilike.%${escaped}%`);
  }

  const fetchEnd: number = offset + limit;
  listQuery = listQuery
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false })
    .range(offset, fetchEnd);

  const { data: rows, error: listError } = await listQuery;

  if (listError) {
    const { status, body } = buildJournalDbErrorResponse(
      listError,
      'Failed to load journals.',
      'api/journals'
    );
    const dbError = NextResponse.json(body, { status });
    applyCookieWrites(dbError);
    return dbError;
  }

  const safeRows = rows ?? [];

  const hasMore: boolean = safeRows.length > limit;
  const items = hasMore ? safeRows.slice(0, limit) : safeRows;
  const nextOffset: number = offset + items.length;
  const payload: JournalListResponse = { items, hasMore, nextOffset };
  const ok = NextResponse.json(payload);
  applyCookieWrites(ok);
  return ok;
}
