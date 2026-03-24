'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import AuthGate from '@/components/auth/AuthGate';
import { getSupabaseBrowserClient } from '@/lib/supabase/browserClient';

type CustomPrompt = {
  id: string;
  prompt_text: string;
  category: string | null;
};

export default function SettingsPage(): React.ReactElement {
  return (
    <AuthGate>
      <SettingsView />
    </AuthGate>
  );
}

function SettingsView(): React.ReactElement {
  const [email, setEmail] = useState<string>('');
  const [userIsPremium, setUserIsPremium] = useState<boolean>(false);
  const [customPrompts, setCustomPrompts] = useState<CustomPrompt[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [newPromptText, setNewPromptText] = useState<string>('');
  const [newPromptCategory, setNewPromptCategory] = useState<string>('');

  const canManageCustomPrompts: boolean = userIsPremium;

  useEffect(() => {
    let isMounted = true;

    const load = async (): Promise<void> => {
      setIsLoading(true);
      setErrorMessage(null);
      const supabase = getSupabaseBrowserClient();
      const { data: sessionData } = await supabase.auth.getSession();

      if (!sessionData.session) {
        setIsLoading(false);
        return;
      }

      const userId: string = sessionData.session.user.id;
      const userEmail: string = sessionData.session.user.email ?? '';

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('is_premium')
        .eq('id', userId)
        .single();

      if (profileError) {
        if (!isMounted) {
          return;
        }
        setErrorMessage(profileError.message);
        setIsLoading(false);
        return;
      }

      const { data: promptsData, error: promptsError } = await supabase
        .from('user_custom_prompts')
        .select('id,prompt_text,category,created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

      if (promptsError) {
        if (!isMounted) {
          return;
        }
        setErrorMessage(promptsError.message);
        setIsLoading(false);
        return;
      }

      if (!isMounted) {
        return;
      }

      setEmail(userEmail);
      setUserIsPremium(profileData?.is_premium === true);
      setCustomPrompts((promptsData ?? []) as CustomPrompt[]);
      setIsLoading(false);
    };

    void load();
    return () => {
      isMounted = false;
    };
  }, []);

  const refreshCustomPrompts = async (): Promise<void> => {
    const supabase = getSupabaseBrowserClient();
    const { data: sessionData } = await supabase.auth.getSession();
    const userId: string | undefined = sessionData.session?.user.id;
    if (!userId) {
      return;
    }

    const { data: promptsData, error: promptsError } = await supabase
      .from('user_custom_prompts')
      .select('id,prompt_text,category,created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (promptsError) {
      setErrorMessage(promptsError.message);
      return;
    }
    setCustomPrompts((promptsData ?? []) as CustomPrompt[]);
  };

  const onAddCustomPrompt = async (): Promise<void> => {
    if (!canManageCustomPrompts) {
      return;
    }
    const promptText: string = newPromptText.trim();
    if (!promptText) {
      return;
    }

    setErrorMessage(null);
    const supabase = getSupabaseBrowserClient();
    const { data: sessionData } = await supabase.auth.getSession();
    const userId: string | undefined = sessionData.session?.user.id;
    if (!userId) {
      return;
    }

    const category: string | null = newPromptCategory.trim().length > 0 ? newPromptCategory.trim() : null;

    const { error } = await supabase.from('user_custom_prompts').insert({
      user_id: userId,
      prompt_text: promptText,
      category
    });

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setNewPromptText('');
    setNewPromptCategory('');
    await refreshCustomPrompts();
  };

  const onDeleteCustomPrompt = async (promptId: string): Promise<void> => {
    if (!canManageCustomPrompts) {
      return;
    }
    setErrorMessage(null);
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.from('user_custom_prompts').delete().eq('id', promptId);
    if (error) {
      setErrorMessage(error.message);
      return;
    }
    await refreshCustomPrompts();
  };

  const onSignOut = async (): Promise<void> => {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    window.location.href = '/auth';
  };

  const premiumBadgeText: string = useMemo(() => (userIsPremium ? 'Premium' : 'Free'), [userIsPremium]);

  return (
    <section className="page">
      <div className="rowBetween">
        <h1 className="title">Profile & Settings</h1>
        <button type="button" className="secondaryButton" onClick={() => void onSignOut()}>
          Sign out
        </button>
      </div>
      <p className="subtitle">
        Email: <span className="monoText">{email || '—'}</span> · Plan: {premiumBadgeText}
      </p>

      {errorMessage ? <p className="errorText">{errorMessage}</p> : null}

      <div className="cardBlock">
        <h2 className="sectionTitle">Custom prompts</h2>

        {!canManageCustomPrompts ? (
          <div className="lockedState">
            <p className="mutedText">Custom prompts are available with Premium.</p>
            <Link className="primaryButton" href="/premium">
              Upgrade to Premium
            </Link>
          </div>
        ) : (
          <>
            <div className="twoCol">
              <label className="fieldLabel">
                Prompt text
                <input
                  className="fieldInput"
                  value={newPromptText}
                  onChange={(e) => setNewPromptText(e.target.value)}
                  placeholder="Write your own prompt…"
                />
              </label>
              <label className="fieldLabel">
                Category (optional)
                <input
                  className="fieldInput"
                  value={newPromptCategory}
                  onChange={(e) => setNewPromptCategory(e.target.value)}
                  placeholder="e.g. Reflection"
                />
              </label>
            </div>
            <button className="primaryButton" type="button" onClick={() => void onAddCustomPrompt()}>
              Add custom prompt
            </button>

            <div className="divider" />

            {isLoading ? <p className="mutedText">Loading prompts…</p> : null}
            {customPrompts.length === 0 ? <p className="mutedText">No custom prompts yet.</p> : null}

            <div className="customPromptList">
              {customPrompts.map((prompt) => (
                <div key={prompt.id} className="customPromptRow">
                  <div className="customPromptText">
                    <div className="customPromptPrompt">{prompt.prompt_text}</div>
                    <div className="customPromptMeta">
                      {prompt.category ? <span>{prompt.category}</span> : <span className="mutedText">Uncategorized</span>}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="dangerButton"
                    onClick={() => void onDeleteCustomPrompt(prompt.id)}
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}

