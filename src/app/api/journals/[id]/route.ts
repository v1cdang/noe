import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/serverClient';
import type { JournalDetailResponse, JournalPatchBody, JournalRow } from '@/lib/journals/types';
import { buildJournalDbErrorResponse } from '@/lib/journals/journal-db-error';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const UUID_RE: RegExp =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidUuid(id: string): boolean {
  return UUID_RE.test(id);
}

export async function GET(
  _req: NextRequest,
  context: Readonly<{ params: Promise<{ id: string }> }>
): Promise<NextResponse<JournalDetailResponse | { error: string }>> {
  const { supabase, applyCookieWrites } = await createSupabaseServerClient();
  const { id: journalId } = await context.params;

  if (!isValidUuid(journalId)) {
    const bad = NextResponse.json({ error: 'Not found.' }, { status: 404 });
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
  const { data: row, error: fetchError } = await supabase
    .from('journals')
    .select('id,user_id,content,prompt,mood,is_pinned,created_at,updated_at')
    .eq('id', journalId)
    .eq('user_id', userId)
    .maybeSingle();

  if (fetchError) {
    const { status, body } = buildJournalDbErrorResponse(
      fetchError,
      'Failed to load journal.',
      'api/journals/[id] GET'
    );
    const dbError = NextResponse.json(body, { status });
    applyCookieWrites(dbError);
    return dbError;
  }

  if (!row) {
    const missing = NextResponse.json({ error: 'Not found.' }, { status: 404 });
    applyCookieWrites(missing);
    return missing;
  }

  const payload: JournalDetailResponse = { journal: row as JournalRow };
  const ok = NextResponse.json(payload);
  applyCookieWrites(ok);
  return ok;
}

export async function PATCH(
  req: NextRequest,
  context: Readonly<{ params: Promise<{ id: string }> }>
): Promise<NextResponse<{ ok: true } | { error: string }>> {
  const { supabase, applyCookieWrites } = await createSupabaseServerClient();
  const { id: journalId } = await context.params;

  if (!isValidUuid(journalId)) {
    const bad = NextResponse.json({ error: 'Not found.' }, { status: 404 });
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
  const body: JournalPatchBody = (await req.json()) as JournalPatchBody;
  const patch: Record<string, unknown> = {};

  if (typeof body.content === 'string') {
    patch.content = body.content;
  }
  if (typeof body.prompt === 'string') {
    patch.prompt = body.prompt;
  }
  if (body.mood === null || typeof body.mood === 'string') {
    patch.mood = body.mood;
  }
  if (typeof body.is_pinned === 'boolean') {
    patch.is_pinned = body.is_pinned;
  }

  if (Object.keys(patch).length === 0) {
    const bad = NextResponse.json({ error: 'No valid fields to update.' }, { status: 400 });
    applyCookieWrites(bad);
    return bad;
  }

  const { data: updated, error: updateError } = await supabase
    .from('journals')
    .update(patch)
    .eq('id', journalId)
    .eq('user_id', userId)
    .select('id')
    .maybeSingle();

  if (updateError) {
    const { status, body } = buildJournalDbErrorResponse(
      updateError,
      'Failed to update journal.',
      'api/journals/[id] PATCH'
    );
    const dbError = NextResponse.json(body, { status });
    applyCookieWrites(dbError);
    return dbError;
  }

  if (!updated) {
    const missing = NextResponse.json({ error: 'Not found.' }, { status: 404 });
    applyCookieWrites(missing);
    return missing;
  }

  const ok = NextResponse.json({ ok: true } as const);
  applyCookieWrites(ok);
  return ok;
}

export async function DELETE(
  _req: NextRequest,
  context: Readonly<{ params: Promise<{ id: string }> }>
): Promise<NextResponse<{ ok: true } | { error: string }>> {
  const { supabase, applyCookieWrites } = await createSupabaseServerClient();
  const { id: journalId } = await context.params;

  if (!isValidUuid(journalId)) {
    const bad = NextResponse.json({ error: 'Not found.' }, { status: 404 });
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
  const { data: deletedRows, error: deleteError } = await supabase
    .from('journals')
    .delete()
    .eq('id', journalId)
    .eq('user_id', userId)
    .select('id');

  if (deleteError) {
    const { status, body } = buildJournalDbErrorResponse(
      deleteError,
      'Failed to delete journal.',
      'api/journals/[id] DELETE'
    );
    const dbError = NextResponse.json(body, { status });
    applyCookieWrites(dbError);
    return dbError;
  }

  if (!deletedRows || deletedRows.length === 0) {
    const missing = NextResponse.json({ error: 'Not found.' }, { status: 404 });
    applyCookieWrites(missing);
    return missing;
  }

  const ok = NextResponse.json({ ok: true } as const);
  applyCookieWrites(ok);
  return ok;
}
