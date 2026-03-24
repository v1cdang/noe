import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/serverClient';
import { getTodayIsoDate } from '@/lib/date/getTodayIsoDate';
import type { SubmitMoodResponse, MoodScore } from '@/lib/journaling/types';
import { parseMoodScore } from '@/lib/journaling/validateMoodScore';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type SubmitMoodRequest = {
  promptId: string;
  moodScore: number;
  optionalText?: string;
};

export async function POST(req: NextRequest): Promise<NextResponse<SubmitMoodResponse | { error: string }>> {
  const { supabase, applyCookieWrites } = await createSupabaseServerClient();

  const body: SubmitMoodRequest = (await req.json()) as SubmitMoodRequest;
  const promptId: string = body.promptId;
  const moodScoreValue: number = body.moodScore;
  const moodScore: MoodScore | null = parseMoodScore(moodScoreValue);
  const optionalText: string | null =
    typeof body.optionalText === 'string' && body.optionalText.trim().length > 0
      ? body.optionalText.trim()
      : null;

  if (!promptId || !moodScore) {
    const bad = NextResponse.json({ error: 'Invalid request payload.' }, { status: 400 });
    applyCookieWrites(bad);
    return bad;
  }

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    const unauth = NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    applyCookieWrites(unauth);
    return unauth;
  }

  const userId: string = userData.user.id;
  const todayIsoDate: string = getTodayIsoDate();

  // Enforce premium gating server-side.
  const { data: globalPrompt, error: globalPromptError } = await supabase
    .from('prompts')
    .select('id,is_premium_only')
    .eq('id', promptId)
    .maybeSingle();

  if (globalPromptError) {
    const dbError = NextResponse.json({ error: 'Database error.' }, { status: 500 });
    applyCookieWrites(dbError);
    return dbError;
  }

  if (!globalPrompt) {
    const { data: customPrompt, error: customPromptError } = await supabase
      .from('user_custom_prompts')
      .select('id')
      .eq('id', promptId)
      .eq('user_id', userId)
      .maybeSingle();

    if (customPromptError) {
      const dbError = NextResponse.json({ error: 'Database error.' }, { status: 500 });
      applyCookieWrites(dbError);
      return dbError;
    }

    if (!customPrompt) {
      const forbidden = NextResponse.json({ error: 'Unknown or locked prompt.' }, { status: 400 });
      applyCookieWrites(forbidden);
      return forbidden;
    }
  }

  const { data: inserted, error: insertError } = await supabase
    .from('mood_logs')
    .insert({
      user_id: userId,
      prompt_id: promptId,
      mood_score: moodScore,
      optional_text: optionalText,
      date: todayIsoDate
    })
    .select('id')
    .maybeSingle();

  if (insertError || !inserted?.id) {
    const dbError = NextResponse.json({ error: 'Failed to submit mood.' }, { status: 500 });
    applyCookieWrites(dbError);
    return dbError;
  }

  const payload: SubmitMoodResponse = { ok: true, logId: inserted.id };
  const okResponse = NextResponse.json(payload);
  applyCookieWrites(okResponse);
  return okResponse;
}

