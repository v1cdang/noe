'use client';

import { useEffect, useState } from 'react';
import AuthGate from '@/components/auth/AuthGate';
import MoodTrendChart from '@/components/charts/MoodTrendChart';
import type { MoodHistoryResponse, TodayPromptResponse } from '@/lib/journaling/types';
import Link from 'next/link';

export default function MoodPage(): React.ReactElement {
  return (
    <AuthGate>
      <MoodView />
    </AuthGate>
  );
}

function MoodView(): React.ReactElement {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [history, setHistory] = useState<MoodHistoryResponse | null>(null);
  const [todayPrompt, setTodayPrompt] = useState<TodayPromptResponse | null>(null);

  useEffect(() => {
    let isMounted = true;

    const load = async (): Promise<void> => {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const [historyRes, todayRes] = await Promise.all([
          fetch('/api/mood/history'),
          fetch('/api/today-prompt')
        ]);

        if (!historyRes.ok) {
          throw new Error(`Failed to load mood history (${historyRes.status}).`);
        }

        const historyPayload: MoodHistoryResponse = (await historyRes.json()) as MoodHistoryResponse;
        const todayPayload: TodayPromptResponse = (await todayRes.json()) as TodayPromptResponse;

        if (!isMounted) {
          return;
        }

        setHistory(historyPayload);
        setTodayPrompt(todayPayload);
      } catch (error: unknown) {
        const message: string = error instanceof Error ? error.message : 'Failed to load mood history.';
        if (!isMounted) {
          return;
        }
        setErrorMessage(message);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void load();
    return () => {
      isMounted = false;
    };
  }, []);

  const userIsPremium: boolean = todayPrompt?.userIsPremium === true;
  const rangeLabel: string = userIsPremium ? 'Last 30 days' : 'Last 7 days';

  return (
    <section className="page">
      <div className="rowBetween">
        <h1 className="title">Mood visualization</h1>
        <Link className="navLink" href="/dashboard">
          Back to dashboard
        </Link>
      </div>
      <p className="subtitle">{isLoading ? 'Loading…' : rangeLabel}</p>

      {errorMessage ? <p className="errorText">{errorMessage}</p> : null}

      {isLoading ? (
        <div className="cardBlock">
          <p className="mutedText">Loading your mood trend…</p>
        </div>
      ) : history ? (
        <MoodTrendChart points={history.points} />
      ) : null}

      {todayPrompt && !todayPrompt.userIsPremium ? (
        <div className="cardBlock premiumUpsell">
          <p className="mutedText">Premium unlocks extended trend analysis.</p>
          <Link className="secondaryButton" href="/premium">
            Upgrade to Premium
          </Link>
        </div>
      ) : null}
    </section>
  );
}

