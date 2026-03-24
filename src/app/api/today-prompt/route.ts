import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/serverClient';
import { getTodayIsoDate } from '@/lib/date/getTodayIsoDate';
import {
  pickDeterministicDistinctIndices
} from '@/lib/journaling/deterministicPromptPicker';
import type { TodayPromptResponse, PromptDto } from '@/lib/journaling/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type GetTodayPromptResult = TodayPromptResponse;

const DEFAULT_PREMIUM_PROMPT_COUNT: number = (() => {
  const raw: string | undefined = process.env.PREMIUM_DEFAULT_PROMPT_COUNT;
  const parsed: number = raw ? Number(raw) : 3;
  if (Number.isNaN(parsed) || parsed < 1) {
    return 3;
  }
  return Math.floor(parsed);
})();

const FREE_PROMPT_COUNT: number = 1;

function toPromptDtoFromGlobalPrompt(globalPrompt: {
  id: string;
  prompt_text: string;
  category: string;
  is_premium_only: boolean;
}): PromptDto {
  return {
    id: globalPrompt.id,
    promptText: globalPrompt.prompt_text,
    category: globalPrompt.category,
    source: 'global'
  };
}

function toPromptDtoFromCustomPrompt(customPrompt: {
  id: string;
  prompt_text: string;
  category: string | null;
}): PromptDto {
  return {
    id: customPrompt.id,
    promptText: customPrompt.prompt_text,
    category: customPrompt.category,
    source: 'custom'
  };
}

export async function GET(_req: NextRequest): Promise<NextResponse<GetTodayPromptResult>> {
  const { supabase, applyCookieWrites } = await createSupabaseServerClient();

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    const unauth = NextResponse.json(
      { userIsPremium: false, prompts: [] } satisfies GetTodayPromptResult,
      { status: 401 },
    );
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

  if (profileError) {
    const errorResponse = NextResponse.json(
      {
        error: `Failed to load profile. Ensure Supabase migration was applied. (${profileError.message})`,
        userIsPremium: false,
        prompts: []
      } satisfies GetTodayPromptResult & { error: string },
      { status: 500 },
    );
    applyCookieWrites(errorResponse);
    return errorResponse;
  }

  if (!profile) {
    const errorResponse = NextResponse.json(
      {
        error:
          'Profile row not found. Ensure the migration trigger on auth.users was created, or create a row in public.profiles for this user.',
        userIsPremium: false,
        prompts: []
      } satisfies GetTodayPromptResult & { error: string },
      { status: 409 },
    );
    applyCookieWrites(errorResponse);
    return errorResponse;
  }

  const userIsPremium: boolean = profile.is_premium === true;

  if (!userIsPremium) {
    const { data: freeGlobalPrompts, error: freePromptError } = await supabase
      .from('prompts')
      .select('id,prompt_text,category,is_premium_only')
      .eq('is_premium_only', false)
      .order('id', { ascending: true });

    if (freePromptError || !freeGlobalPrompts || freeGlobalPrompts.length === 0) {
      const empty = NextResponse.json(
        {
          error: freePromptError
            ? `Failed to query prompts. Ensure migration exists. (${freePromptError.message})`
            : 'No free prompts found. Seed prompts table first.',
          userIsPremium: false,
          prompts: []
        } satisfies GetTodayPromptResult & { error: string },
        { status: freePromptError ? 500 : 404 },
      );
      applyCookieWrites(empty);
      return empty;
    }

    const indices: number[] = pickDeterministicDistinctIndices(
      freeGlobalPrompts.length,
      FREE_PROMPT_COUNT,
      `free-${userId}-${todayIsoDate}`,
    );

    const pickedGlobal = indices.map((idx) => toPromptDtoFromGlobalPrompt(freeGlobalPrompts[idx]));

    const payload: GetTodayPromptResult = {
      userIsPremium: false,
      prompts: pickedGlobal
    };

    const finalResponse = NextResponse.json(payload);
    applyCookieWrites(finalResponse);
    return finalResponse;
  }

  const premiumPromptCount: number = Math.max(DEFAULT_PREMIUM_PROMPT_COUNT, 1);

  const { data: premiumGlobalPrompts, error: premiumPromptError } = await supabase
    .from('prompts')
    .select('id,prompt_text,category,is_premium_only')
    .order('id', { ascending: true });

  if (premiumPromptError || !premiumGlobalPrompts) {
    const empty = NextResponse.json(
      {
        error: premiumPromptError
          ? `Failed to query prompts. Ensure migration exists. (${premiumPromptError.message})`
          : 'No prompts found.',
        userIsPremium: true,
        prompts: []
      } satisfies GetTodayPromptResult & { error: string },
      { status: 500 },
    );
    applyCookieWrites(empty);
    return empty;
  }

  const customPromptSeed: string = `custom-${userId}-${todayIsoDate}`;
  const { data: customPrompts, error: customPromptError } = await supabase
    .from('user_custom_prompts')
    .select('id,prompt_text,category')
    .order('created_at', { ascending: true });

  if (customPromptError || !customPrompts) {
    const empty = NextResponse.json(
      {
        error: customPromptError
          ? `Failed to query custom prompts. Ensure migration exists. (${customPromptError.message})`
          : 'Failed to load custom prompts.',
        userIsPremium: true,
        prompts: []
      } satisfies GetTodayPromptResult & { error: string },
      { status: 500 },
    );
    applyCookieWrites(empty);
    return empty;
  }

  const indices: number[] = pickDeterministicDistinctIndices(
    premiumGlobalPrompts.length,
    premiumPromptCount,
    `premium-global-${userId}-${todayIsoDate}-${customPromptSeed}`,
  );

  const pickedGlobal: PromptDto[] = indices.map((idx) =>
    toPromptDtoFromGlobalPrompt(premiumGlobalPrompts[idx]),
  );
  const pickedCustom: PromptDto[] = customPrompts.map((p) => toPromptDtoFromCustomPrompt(p));

  const payload: GetTodayPromptResult = {
    userIsPremium: true,
    prompts: [...pickedGlobal, ...pickedCustom]
  };

  const finalResponse = NextResponse.json(payload);
  applyCookieWrites(finalResponse);
  return finalResponse;
}

