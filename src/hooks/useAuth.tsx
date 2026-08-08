import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  /**
   * When email confirmation is enabled, Supabase returns no session and no
   * error — the account exists but is unverified. `needsConfirmation` lets the
   * UI say so instead of silently appearing to do nothing.
   */
  signUp: (email: string, password: string) => Promise<{ error: string | null; needsConfirmation: boolean }>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
  /** True after the user opens a password-reset link, until they set a new password. */
  recoveryMode: boolean;
  updatePassword: (password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [recoveryMode, setRecoveryMode] = useState(false);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    supabase.auth
      .getSession()
      .then(({ data }) => {
        setSession(data.session);
      })
      .catch(() => {
        setSession(null);
      })
      .finally(() => {
        // Always release the loading gate — otherwise a failed session lookup
        // leaves the app stuck on the spinner forever.
        setLoading(false);
      });

    const { data: listener } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession);
      // A recovery link signs the user in, but they still need to choose a new
      // password before landing in the app.
      if (event === 'PASSWORD_RECOVERY') setRecoveryMode(true);
      if (event === 'SIGNED_OUT') setRecoveryMode(false);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabase) return { error: 'Supabase not configured' };
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (data.session) {
      setSession(data.session);
    }
    return { error: error?.message ?? null };
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    if (!supabase) return { error: 'Supabase not configured', needsConfirmation: false };
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      // Send the confirmation link back to wherever the app is actually being
      // served, rather than relying on the project's Site URL (which defaults
      // to localhost:3000 and would produce a dead link in production).
      options: { emailRedirectTo: `${window.location.origin}${window.location.pathname}` },
    });
    if (data.session) {
      setSession(data.session);
    }
    return {
      error: error?.message ?? null,
      needsConfirmation: !error && !data.session && Boolean(data.user),
    };
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    if (!supabase) return { error: 'Supabase not configured' };
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}${window.location.pathname}`,
    });
    return { error: error?.message ?? null };
  }, []);

  const updatePassword = useCallback(async (password: string) => {
    if (!supabase) return { error: 'Supabase not configured' };
    const { error } = await supabase.auth.updateUser({ password });
    if (!error) setRecoveryMode(false);
    return { error: error?.message ?? null };
  }, []);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    try {
      await supabase.auth.signOut();
    } catch {
      // An already-expired or revoked session makes signOut throw; the user
      // still expects to be logged out locally.
    } finally {
      setSession(null);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, loading, signIn, signUp, resetPassword, recoveryMode, updatePassword, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (ctx === undefined) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
