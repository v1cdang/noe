import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/serverClient';
import { getTodayIsoDate } from '@/lib/date/getTodayIsoDate';
import type { SubmitMoodResponse, MoodScore } from '@/lib/journaling/types';
import { parseMoodScore } from '@/lib/journaling/validateMoodScore';
import { getMoodEmojiForScore } from '@/lib/journals/mood-for-journal';

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

  // Enforce premium gating server-side and resolve prompt text for journal history.
  const { data: globalPrompt, error: globalPromptError } = await supabase
    .from('prompts')
    .select('id,is_premium_only,prompt_text')
    .eq('id', promptId)
    .maybeSingle();

  if (globalPromptError) {
    const dbError = NextResponse.json({ error: 'Database error.' }, { status: 500 });
    applyCookieWrites(dbError);
    return dbError;
  }

  let resolvedPromptText: string | null = null;

  if (globalPrompt) {
    resolvedPromptText = globalPrompt.prompt_text;
  } else {
    const { data: customPrompt, error: customPromptError } = await supabase
      .from('user_custom_prompts')
      .select('id,prompt_text')
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

    resolvedPromptText = customPrompt.prompt_text;
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

  const journalContent: string = optionalText ?? '';
  const promptForJournal: string = resolvedPromptText?.trim().length ? resolvedPromptText.trim() : 'Journal entry';

  const { error: journalError } = await supabase.from('journals').insert({
    user_id: userId,
    content: journalContent,
    prompt: promptForJournal,
    mood: getMoodEmojiForScore(moodScore),
    is_pinned: false
  });

  if (journalError) {
    await supabase.from('mood_logs').delete().eq('id', inserted.id);
    const dbError = NextResponse.json({ error: 'Failed to save journal entry.' }, { status: 500 });
    applyCookieWrites(dbError);
    return dbError;
  }

  const payload: SubmitMoodResponse = { ok: true, logId: inserted.id };
  const okResponse = NextResponse.json(payload);
  applyCookieWrites(okResponse);
  return okResponse;
}

