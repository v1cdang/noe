import type { SupabaseClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies as nextCookies } from 'next/headers';
import { NextResponse } from 'next/server';

export type SupabaseEnv = {
  supabaseUrl: string;
  supabaseAnonKey: string;
};

export function getSupabaseEnv(): SupabaseEnv {
  const supabaseUrl: string | undefined = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey: string | undefined = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Supabase environment variables are required: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.',
    );
  }

  return { supabaseUrl, supabaseAnonKey };
}

export type CookieWrite = {
  name: string;
  value: string | undefined;
  options: any;
};

export async function createSupabaseServerClient(): Promise<{
  supabase: SupabaseClient;
  applyCookieWrites: (response: NextResponse) => void;
}> {
  const { supabaseUrl, supabaseAnonKey } = getSupabaseEnv();
  const cookieStore = await nextCookies();
  const bufferedCookieWrites: CookieWrite[] = [];

  const getAll = async (): Promise<Array<{ name: string; value: string }> | null> => {
    return cookieStore.getAll().map((cookie) => ({ name: cookie.name, value: cookie.value }));
  };

  const setAll = async (setCookies: Array<{ name: string; value: string | undefined; options: unknown }>): Promise<void> => {
    bufferedCookieWrites.push(...setCookies);
  };

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: { getAll, setAll },
  });

  const applyCookieWrites = (response: NextResponse): void => {
    for (let i: number = 0; i < bufferedCookieWrites.length; i += 1) {
      const { name, value, options } = bufferedCookieWrites[i];
      if (typeof value === 'string') {
        response.cookies.set(name, value, options as any);
      } else {
        // NextResponse.cookies().delete does not accept options in types.
        response.cookies.delete(name);
      }
    }
  };

  return { supabase, applyCookieWrites };
}

