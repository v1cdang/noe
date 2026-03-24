'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabase/browserClient';

type AuthMode = 'login' | 'register';

export default function AuthPage(): React.ReactElement {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const submitLabel = useMemo(() => {
    if (mode === 'register') {
      return 'Create account';
    }
    return 'Sign in';
  }, [mode]);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    const supabase = getSupabaseBrowserClient();

    try {
      if (mode === 'register') {
        const { error } = await supabase.auth.signUp({
          email,
          password
        });
        if (error) {
          setErrorMessage(error.message);
          return;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        if (error) {
          setErrorMessage(error.message);
          return;
        }
      }

      const { data } = await supabase.auth.getSession();
      if (data.session) {
        router.replace('/dashboard');
      } else {
        setErrorMessage('If your email requires confirmation, check your inbox to complete sign up.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="page">
      <h1 className="title">{mode === 'register' ? 'Create your account' : 'Welcome back'}</h1>
      <p className="subtitle">Sign in with email and password to start your daily journaling.</p>

      <div className="segmented">
        <button
          type="button"
          className={`segmentButton ${mode === 'login' ? 'segmentButtonSelected' : ''}`}
          onClick={() => setMode('login')}
        >
          Login
        </button>
        <button
          type="button"
          className={`segmentButton ${mode === 'register' ? 'segmentButtonSelected' : ''}`}
          onClick={() => setMode('register')}
        >
          Register
        </button>
      </div>

      <form className="formCard" onSubmit={onSubmit}>
        <label className="fieldLabel">
          Email
          <input
            className="fieldInput"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label className="fieldLabel">
          Password
          <input
            className="fieldInput"
            type="password"
            autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />
        </label>

        {errorMessage ? <p className="errorText">{errorMessage}</p> : null}

        <button className="primaryButton" type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Please wait…' : submitLabel}
        </button>
      </form>
    </section>
  );
}

