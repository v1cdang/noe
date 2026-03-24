'use client';

import { useEffect, useState } from 'react';
import AuthGate from '@/components/auth/AuthGate';
import { getSupabaseBrowserClient } from '@/lib/supabase/browserClient';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type UpgradeResult = { ok?: boolean; error?: string };

export default function PremiumPage(): React.ReactElement {
  return (
    <AuthGate>
      <PremiumView />
    </AuthGate>
  );
}

function PremiumView(): React.ReactElement {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [userIsPremium, setUserIsPremium] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isUpgrading, setIsUpgrading] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;

    const load = async (): Promise<void> => {
      setErrorMessage(null);
      setIsLoading(true);
      const supabase = getSupabaseBrowserClient();
      const { data: sessionData } = await supabase.auth.getSession();
      const userId: string | undefined = sessionData.session?.user.id;
      if (!userId) {
        if (!isMounted) return;
        setIsLoading(false);
        return;
      }

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('is_premium')
        .eq('id', userId)
        .single();

      if (profileError) {
        if (!isMounted) return;
        setErrorMessage(profileError.message);
        setIsLoading(false);
        return;
      }

      if (!isMounted) return;
      setUserIsPremium(profileData?.is_premium === true);
      setIsLoading(false);
    };

    void load();
    return () => {
      isMounted = false;
    };
  }, []);

  const onUpgrade = async (): Promise<void> => {
    if (userIsPremium || isUpgrading) {
      return;
    }
    setIsUpgrading(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/premium/upgrade', { method: 'POST' });
      const payload: UpgradeResult = (await res.json()) as UpgradeResult;
      if (!res.ok || !payload.ok) {
        const message: string = payload.error ?? 'Upgrade failed.';
        setErrorMessage(message);
        return;
      }
      setUserIsPremium(true);
      router.replace('/dashboard');
    } catch (error: unknown) {
      const message: string = error instanceof Error ? error.message : 'Upgrade failed.';
      setErrorMessage(message);
    } finally {
      setIsUpgrading(false);
    }
  };

  return (
    <section className="page">
      <div className="rowBetween">
        <h1 className="title">Premium upgrade</h1>
        <Link className="navLink" href="/dashboard">
          Back
        </Link>
      </div>

      <p className="subtitle">Unlock more prompts and extended mood trends.</p>

      {isLoading ? (
        <div className="cardBlock">
          <p className="mutedText">Checking your plan…</p>
        </div>
      ) : null}

      {errorMessage ? <p className="errorText">{errorMessage}</p> : null}

      <div className="cardBlock">
        <h2 className="sectionTitle">What you get</h2>
        <div className="featureList">
          <div className="featureRow">
            <div className="featureTitle">Multiple prompts per day</div>
            <div className="featureSub mutedText">Choose from more than one prompt daily.</div>
          </div>
          <div className="featureRow">
            <div className="featureTitle">Custom prompts</div>
            <div className="featureSub mutedText">Add prompts that match your style.</div>
          </div>
          <div className="featureRow">
            <div className="featureTitle">Extended mood trends</div>
            <div className="featureSub mutedText">Track a longer history (up to 30 days).</div>
          </div>
          <div className="featureRow">
            <div className="featureTitle">Optional reminders</div>
            <div className="featureSub mutedText">Enable gentle daily prompts (optional).</div>
          </div>
        </div>

        <div className="divider" />

        {userIsPremium ? (
          <p className="successText">You’re already on Premium.</p>
        ) : (
          <button className="primaryButton" type="button" onClick={() => void onUpgrade()} disabled={isUpgrading}>
            {isUpgrading ? 'Upgrading…' : 'Unlock Premium'}
          </button>
        )}
      </div>
    </section>
  );
}

