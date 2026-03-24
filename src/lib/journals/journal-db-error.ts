import type { PostgrestError } from '@supabase/supabase-js';

export type JournalDbErrorBody = {
  error: string;
  code: string;
  details: string;
};

/**
 * Maps Supabase/PostgREST errors to an HTTP status and JSON body for journal routes.
 */
export function buildJournalDbErrorResponse(
  dbError: PostgrestError,
  fallbackMessage: string,
  logLabel: string
): { status: number; body: JournalDbErrorBody } {
  const code: string = dbError.code ?? 'unknown';
  const details: string = dbError.message ?? 'Unknown database error.';
  console.error(`[${logLabel}]`, code, details);
  const isMissingTable: boolean = code === 'PGRST205' || /could not find the table/i.test(details);
  const status: number = isMissingTable ? 503 : 500;
  const error: string = isMissingTable
    ? 'Journal storage is not set up yet. Apply the Supabase journals migration.'
    : fallbackMessage;
  return { status, body: { error, code, details } };
}
