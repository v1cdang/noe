'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabase/browserClient';

export default function AuthGate({
  children
}: Readonly<{ children: React.ReactNode }>): React.ReactElement {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasSession, setHasSession] = useState<boolean>(false);

  useEffect(() => {
    let isMounted: boolean = true;
    const supabase = getSupabaseBrowserClient();

    const loadSession = async (): Promise<void> => {
      const { data } = await supabase.auth.getSession();
      if (!isMounted) {
        return;
      }
      setHasSession(!!data.session);
      setIsLoading(false);
    };

    void loadSession();

    const { data: subscription } = supabase.auth.onAuthStateChange(() => {
      void loadSession();
    });

    return () => {
      isMounted = false;
      subscription?.subscription.unsubscribe();
    };
  }, [router]);

  useEffect(() => {
    if (isLoading) {
      return;
    }
    if (!hasSession) {
      router.replace('/auth');
    }
  }, [hasSession, isLoading, router]);

  if (isLoading) {
    return (
      <section className="page">
        <p>Loading...</p>
      </section>
    );
  }

  if (!hasSession) {
    return (
      <section className="page">
        <p>Redirecting...</p>
      </section>
    );
  }

  return <>{children}</>;
}

