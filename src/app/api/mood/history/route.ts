import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/serverClient';
import { getTodayIsoDate } from '@/lib/date/getTodayIsoDate';
import type { MoodHistoryResponse } from '@/lib/journaling/types';
import { aggregateMoodHistoryPoints } from '@/lib/journaling/aggregateMoodHistoryPoints';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type RangeQuery = {
  rangeDays?: string | null;
};

const DEFAULT_PREMIUM_TREND_RANGE_DAYS: number = (() => {
  const raw: string | undefined = process.env.PREMIUM_TREND_RANGE_DAYS;
  const parsed: number = raw ? Number(raw) : 30;
  if (Number.isNaN(parsed) || parsed < 1) {
    return 30;
  }
  return Math.floor(parsed);
})();

function parseRangeDays(rangeDaysRaw: string | null | undefined): number | null {
  if (!rangeDaysRaw) {
    return null;
  }
  const parsed: number = Number(rangeDaysRaw);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return null;
  }
  return Math.floor(parsed);
}

export async function GET(req: NextRequest): Promise<NextResponse<MoodHistoryResponse | { error: string }>> {
  const { supabase, applyCookieWrites } = await createSupabaseServerClient();
  const url = new URL(req.url);
  const rangeDaysQuery: RangeQuery = {
    rangeDays: url.searchParams.get('rangeDays')
  };

  const requestedRangeDays: number | null = parseRangeDays(rangeDaysQuery.rangeDays);

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    const unauth = NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    applyCookieWrites(unauth);
    return unauth;
  }

  const userId: string = userData.user.id;
  const todayIsoDate: string = getTodayIsoDate();

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('is_premium')
    .eq('id', userId)
    .maybeSingle();

  if (profileError || !profile) {
    const errorResponse = NextResponse.json({ error: 'Failed to load profile.' }, { status: 500 });
    applyCookieWrites(errorResponse);
    return errorResponse;
  }

  const userIsPremium: boolean = profile.is_premium === true;
  const defaultRangeDays: number = userIsPremium ? DEFAULT_PREMIUM_TREND_RANGE_DAYS : 7;
  const maxRangeDays: number = userIsPremium ? 60 : 7;

  const rangeDays: number = (() => {
    const fromRequest: number | null = requestedRangeDays;
    const raw: number = fromRequest ?? defaultRangeDays;
    const clamped: number = Math.min(Math.max(raw, 1), maxRangeDays);
    return clamped;
  })();

  const startDate: string = (() => {
    const now = new Date(`${todayIsoDate}T00:00:00.000Z`);
    const start = new Date(now.getTime() - (rangeDays - 1) * 24 * 60 * 60 * 1000);
    return start.toISOString().slice(0, 10);
  })();

  const { data: logs, error: logsError } = await supabase
    .from('mood_logs')
    .select('date,mood_score')
    .eq('user_id', userId)
    .gte('date', startDate)
    .lte('date', todayIsoDate)
    .order('date', { ascending: true });

  if (logsError || !logs) {
    const errorResponse = NextResponse.json({ error: 'Failed to load mood history.' }, { status: 500 });
    applyCookieWrites(errorResponse);
    return errorResponse;
  }

  const points = aggregateMoodHistoryPoints(logs as Array<{ date: string; mood_score: number }>);

  const payload: MoodHistoryResponse = { points };
  const okResponse = NextResponse.json(payload);
  applyCookieWrites(okResponse);
  return okResponse;
}

