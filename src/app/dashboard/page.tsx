'use client';

import { useEffect, useMemo, useState } from 'react';
import AuthGate from '@/components/auth/AuthGate';
import MoodPicker from '@/components/mood/MoodPicker';
import PromptCard from '@/components/prompt/PromptCard';
import type { MoodScore, TodayPromptResponse } from '@/lib/journaling/types';
import { getTodayIsoDate } from '@/lib/date/getTodayIsoDate';

type CachedTodayPrompt = TodayPromptResponse;

export default function DashboardPage(): React.ReactElement {
  return (
    <AuthGate>
      <Dashboard />
    </AuthGate>
  );
}

function Dashboard(): React.ReactElement {
  const todayIsoDate: string = useMemo(() => getTodayIsoDate(), []);
  const storageKey: string = `today-prompt-${todayIsoDate}`;

  const [isLoadingPrompt, setIsLoadingPrompt] = useState<boolean>(true);
  const [loadErrorMessage, setLoadErrorMessage] = useState<string | null>(null);
  const [todayPrompt, setTodayPrompt] = useState<CachedTodayPrompt | null>(null);
  const [selectedPromptId, setSelectedPromptId] = useState<string | null>(null);

  const [selectedMoodScore, setSelectedMoodScore] = useState<MoodScore | null>(null);
  const [optionalText, setOptionalText] = useState<string>('');
  const [submitState, setSubmitState] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [submitErrorMessage, setSubmitErrorMessage] = useState<string | null>(null);

  const promptsAvailable: boolean = (todayPrompt?.prompts?.length ?? 0) > 0;
  const userIsPremium: boolean = todayPrompt?.userIsPremium === true;

  useEffect(() => {
    let isMounted: boolean = true;

    const load = async (): Promise<void> => {
      setIsLoadingPrompt(true);
      setLoadErrorMessage(null);

      try {
        const res = await fetch('/api/today-prompt', { method: 'GET' });
        if (!res.ok) {
          throw new Error(`Failed to fetch today prompt (${res.status}).`);
        }

        const payload: CachedTodayPrompt = (await res.json()) as CachedTodayPrompt;
        if (!isMounted) {
          return;
        }
        setTodayPrompt(payload);
        if (payload.prompts[0]) {
          setSelectedPromptId(payload.prompts[0].id);
        }
        localStorage.setItem(storageKey, JSON.stringify(payload));
      } catch (error: unknown) {
        const message: string = error instanceof Error ? error.message : 'Failed to load today prompt.';
        const cachedRaw: string | null = localStorage.getItem(storageKey);
        if (cachedRaw) {
          const cached: CachedTodayPrompt = JSON.parse(cachedRaw) as CachedTodayPrompt;
          if (!isMounted) {
            return;
          }
          setTodayPrompt(cached);
          if (cached.prompts[0]) {
            setSelectedPromptId(cached.prompts[0].id);
          }
          setLoadErrorMessage(`Offline mode: showing your last saved prompt. (${message})`);
          return;
        }
        setLoadErrorMessage(message);
      } finally {
        if (isMounted) {
          setIsLoadingPrompt(false);
        }
      }
    };

    void load();
    return () => {
      isMounted = false;
    };
  }, [storageKey]);

  const onSubmitMood = async (): Promise<void> => {
    if (!selectedPromptId || !selectedMoodScore) {
      return;
    }

    setSubmitState('submitting');
    setSubmitErrorMessage(null);

    try {
      const res = await fetch('/api/mood/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          promptId: selectedPromptId,
          moodScore: selectedMoodScore,
          optionalText: optionalText.trim().length > 0 ? optionalText.trim() : undefined
        })
      });

      const payload: { ok?: boolean; logId?: string; error?: string } = (await res.json()) as {
        ok?: boolean;
        logId?: string;
        error?: string;
      };

      if (!res.ok || !payload.ok) {
        const message: string = payload.error ?? 'Failed to submit mood.';
        setSubmitState('error');
        setSubmitErrorMessage(message);
        return;
      }

      setSubmitState('success');
      setSelectedMoodScore(null);
      setOptionalText('');
    } catch (error: unknown) {
      const message: string = error instanceof Error ? error.message : 'Failed to submit mood.';
      setSubmitState('error');
      setSubmitErrorMessage(message);
    }
  };

  return (
    <section className="page">
      <h1 className="title">Dashboard</h1>
      <p className="subtitle">
        {todayIsoDate} · Pick a prompt, choose a mood, and write a few lines if you want.
      </p>

      {isLoadingPrompt ? (
        <div className="cardBlock">
          <p className="mutedText">Loading today’s prompt…</p>
        </div>
      ) : null}

      {loadErrorMessage ? <p className="upsellText">{loadErrorMessage}</p> : null}

      {!promptsAvailable && !isLoadingPrompt ? (
        <div className="cardBlock">
          <p className="mutedText">No prompts available right now.</p>
        </div>
      ) : null}

      {todayPrompt ? (
        <div className="stack">
          <div className="cardBlock">
            <h2 className="sectionTitle">Today’s prompt</h2>
            <div className="promptList">
              {todayPrompt.prompts.map((prompt) => (
                <PromptCard
                  key={prompt.id}
                  prompt={prompt}
                  isSelected={prompt.id === selectedPromptId}
                  onSelectPrompt={() => setSelectedPromptId(prompt.id)}
                />
              ))}
            </div>
          </div>

          {!userIsPremium ? (
            <div className="cardBlock premiumUpsell">
              <p className="mutedText">Premium unlocks more prompts per day and deeper mood trends.</p>
              <a className="secondaryButton" href="/premium">
                Upgrade to Premium
              </a>
            </div>
          ) : null}

          <MoodPicker selectedMoodScore={selectedMoodScore} onSelectMoodScore={setSelectedMoodScore} />

          <fieldset className="cardBlock" aria-label="Optional text entry">
            <legend className="sectionTitle">Optional notes</legend>
            <textarea
              className="textArea"
              rows={4}
              value={optionalText}
              onChange={(e) => setOptionalText(e.target.value)}
              placeholder="Write anything that feels helpful (optional)."
            />
          </fieldset>

          <fieldset className="cardBlock" aria-label="Optional reminders">
            <legend className="sectionTitle">Reminders</legend>
            <p className="mutedText">Premium can enable optional daily reminders.</p>
            <label className={`toggleRow ${userIsPremium ? '' : 'toggleRowDisabled'}`}>
              <input type="checkbox" disabled={!userIsPremium} />
              <span>{userIsPremium ? 'Turn on reminders' : 'Premium only'}</span>
            </label>
          </fieldset>

          <div className="ctaRow">
            <button
              className="primaryButton"
              type="button"
              disabled={!selectedPromptId || !selectedMoodScore || submitState === 'submitting'}
              onClick={() => void onSubmitMood()}
            >
              {submitState === 'submitting' ? 'Saving…' : 'Submit journal entry'}
            </button>
            {submitState === 'success' ? <p className="successText">Saved. Come back tomorrow.</p> : null}
            {submitState === 'error' && submitErrorMessage ? (
              <p className="errorTextInline">{submitErrorMessage}</p>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}

