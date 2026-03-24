import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/serverClient';
import type { UpgradeResponse } from '@/lib/journaling/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type UpgradeResult = UpgradeResponse;

export async function POST(_req: NextRequest): Promise<NextResponse<UpgradeResult | { error: string }>> {
  const { supabase, applyCookieWrites } = await createSupabaseServerClient();

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    const unauth = NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    applyCookieWrites(unauth);
    return unauth;
  }

  const userId: string = userData.user.id;

  const { error: updateError } = await supabase
    .from('profiles')
    .update({ is_premium: true })
    .eq('id', userId);

  if (updateError) {
    const dbError = NextResponse.json({ error: 'Failed to upgrade.' }, { status: 500 });
    applyCookieWrites(dbError);
    return dbError;
  }

  const payload: UpgradeResult = { ok: true };
  const okResponse = NextResponse.json(payload);
  applyCookieWrites(okResponse);
  return okResponse;
}

